import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import readXlsxFile from 'read-excel-file/node';
import { LocalDatabase } from './db';
import { OllamaClient } from './ollama';
import { DocumentItem, Citation, FolderScanResult, FolderScanItem, FolderIndexSummary } from '../shared/types';

export class RagEngine {
  private db: LocalDatabase;
  private ollama: OllamaClient;

  constructor(db: LocalDatabase, ollama: OllamaClient) {
    this.db = db;
    this.ollama = ollama;
  }

  public getSupportedExtensions(): string[] {
    return ['.pdf', '.docx', '.txt', '.md', '.csv', '.xlsx', '.png', '.jpg', '.jpeg', '.webp'];
  }

  public isSupportedFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.getSupportedExtensions().includes(ext);
  }

  public getFileHash(filePath: string): string {
    try {
      const stats = fs.statSync(filePath);
      return `${stats.size}-${stats.mtimeMs}`;
    } catch {
      return '';
    }
  }

  public async parseFile(
    filePath: string,
    onProgress?: (msg: string) => void
  ): Promise<{ filename: string; fileType: string; fileSize: number; sections: Array<{ pageOrSection: string; text: string }> }> {
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);

    if (!this.isSupportedFile(filePath)) {
      throw new Error(`Unsupported file type '${ext}'. Supported formats: PDF, DOCX, TXT, MD, CSV, XLSX, PNG, JPG, WEBP.`);
    }

    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a regular file: ${filePath}`);
    }

    const fileSize = stats.size;
    const maxSizeBytes = 100 * 1024 * 1024; // 100 MB safety limit
    if (fileSize > maxSizeBytes) {
      throw new Error(`File '${filename}' exceeds maximum allowed size of 100 MB for local indexing.`);
    }

    onProgress?.(`Reading ${filename}...`);

    const sections: Array<{ pageOrSection: string; text: string }> = [];

    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(resolvedPath);
      let pageNum = 1;
      const options = {
        pagerender: function (pageData: any) {
          return pageData.getTextContent().then((textContent: any) => {
            let lastY, text = '';
            for (const item of textContent.items) {
              if (lastY === item.transform[5] || !lastY) {
                text += item.str;
              } else {
                text += '\n' + item.str;
              }
              lastY = item.transform[5];
            }
            sections.push({
              pageOrSection: `p. ${pageNum}`,
              text: text.trim(),
            });
            pageNum++;
            return text;
          });
        },
      };

      try {
        await pdfParse(dataBuffer, options);
      } catch (pdfErr) {
        // Fallback
        try {
          const data = await pdfParse(dataBuffer);
          if (data && data.text) {
            sections.push({ pageOrSection: 'p. 1', text: data.text });
          }
        } catch (fallbackErr: any) {
          throw new Error(`Corrupt or unreadable PDF document: ${fallbackErr.message || 'Parser failed'}`);
        }
      }

      if (!sections.length) {
        try {
          const data = await pdfParse(dataBuffer);
          if (data && data.text) {
            sections.push({ pageOrSection: 'p. 1', text: data.text });
          }
        } catch {}
      }
    } else if (ext === '.docx') {
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });
      const paragraphs = result.value.split('\n\n');
      paragraphs.forEach((p, idx) => {
        if (p.trim()) {
          sections.push({ pageOrSection: `Section ${idx + 1}`, text: p.trim() });
        }
      });
    } else if (ext === '.csv') {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const header = lines[0] || '';
      const batchSize = 25;
      for (let i = 1; i < lines.length; i += batchSize) {
        const batch = lines.slice(i, i + batchSize).join('\n');
        sections.push({
          pageOrSection: `Rows ${i}-${Math.min(i + batchSize, lines.length)}`,
          text: `${header}\n${batch}`,
        });
      }
    } else if (ext === '.xlsx') {
      const sheets = await readXlsxFile(resolvedPath);
      for (const sheet of sheets) {
        const sheetName = sheet.sheet;
        const rows = sheet.data;
        if (!rows || rows.length === 0) continue;
        const header = rows[0].map((c) => (c !== null && c !== undefined ? String(c) : '')).join(',');
        const batchSize = 30;
        for (let i = 1; i < rows.length; i += batchSize) {
          const batch = rows
            .slice(i, i + batchSize)
            .map((r) => r.map((c) => (c !== null && c !== undefined ? String(c) : '')).join(','))
            .join('\n');
          sections.push({
            pageOrSection: `Sheet: ${sheetName} (Rows ${i}-${Math.min(i + batchSize, rows.length)})`,
            text: `Sheet: ${sheetName}\n${header}\n${batch}`,
          });
        }
      }
    } else if (ext === '.txt' || ext === '.md') {
      const content = fs.readFileSync(filePath, 'utf-8');
      sections.push({ pageOrSection: 'Full text', text: content });
    } else if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      // Basic image indexing
      sections.push({
        pageOrSection: 'Image file',
        text: `Image file: ${filename} (Size: ${(fileSize / 1024).toFixed(1)} KB, Format: ${ext.replace('.', '').toUpperCase()})`,
      });
    }

    return {
      filename,
      fileType: ext.replace('.', ''),
      fileSize,
      sections,
    };
  }

  public chunkText(sections: Array<{ pageOrSection: string; text: string }>): Array<{ pageOrSection: string; text: string }> {
    const chunks: Array<{ pageOrSection: string; text: string }> = [];
    const targetChunkSize = 1200;
    const overlap = 200;

    for (const sec of sections) {
      const text = sec.text;
      if (text.length <= targetChunkSize) {
        if (text.trim().length > 10) {
          chunks.push({ pageOrSection: sec.pageOrSection, text: text.trim() });
        }
        continue;
      }

      let start = 0;
      while (start < text.length) {
        let end = start + targetChunkSize;
        if (end < text.length) {
          const lastPeriod = text.lastIndexOf('.', end);
          const lastNewline = text.lastIndexOf('\n', end);
          const breakPoint = Math.max(lastPeriod, lastNewline);
          if (breakPoint > start + targetChunkSize / 2) {
            end = breakPoint + 1;
          }
        }
        const slice = text.substring(start, end).trim();
        if (slice.length > 10) {
          chunks.push({ pageOrSection: sec.pageOrSection, text: slice });
        }
        start = end - overlap;
        if (start >= text.length - overlap) break;
      }
    }

    return chunks;
  }

  public async ingestDocument(
    filePath: string,
    scope: 'global' | string,
    folderPath?: string,
    onProgress?: (msg: string, percent: number) => void
  ): Promise<DocumentItem> {
    onProgress?.(`Extracting ${path.basename(filePath)}...`, 10);
    const parsed = await this.parseFile(filePath, (m) => onProgress?.(m, 20));

    const textChunks = this.chunkText(parsed.sections);
    if (!textChunks.length) {
      throw new Error('Document contained no readable text to index.');
    }

    const fileHash = this.getFileHash(filePath);
    const docId = 'doc_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    const docItem: DocumentItem = {
      id: docId,
      filename: parsed.filename,
      file_type: parsed.fileType,
      file_size: parsed.fileSize,
      created_at: Date.now(),
      chunk_count: textChunks.length,
      scope,
      folder_path: folderPath || parsed.filename,
      file_hash: fileHash,
      updated_at: Date.now(),
    };

    onProgress?.(`Embedding ${textChunks.length} passages with nomic-embed-text...`, 30);

    const readyChunks: Array<{
      id: string;
      chunk_index: number;
      page_or_section: string;
      text_content: string;
      embedding: number[];
    }> = [];

    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      const embedding = await this.ollama.generateEmbedding(chunk.text);
      readyChunks.push({
        id: `chk_${docId}_${i}`,
        chunk_index: i,
        page_or_section: chunk.pageOrSection,
        text_content: chunk.text,
        embedding,
      });

      const pct = Math.round(30 + ((i + 1) / textChunks.length) * 65);
      onProgress?.(`Embedded passage ${i + 1} of ${textChunks.length}...`, pct);
    }

    onProgress?.('Saving to local vector store...', 98);
    this.db.saveDocument(docItem, readyChunks);
    onProgress?.('Indexing complete!', 100);

    return docItem;
  }

  // --- Folder Upload & Recursive Scanning (Feature 2) ---

  public scanFolder(folderPath: string): FolderScanResult {
    const rootPath = path.resolve(folderPath);
    const folderName = path.basename(rootPath);
    const items: FolderScanItem[] = [];

    const traverse = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Skip node_modules, git, hidden folders
          if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
          traverse(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          const stats = fs.statSync(fullPath);
          const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, '/');
          const supported = this.isSupportedFile(fullPath);

          items.push({
            path: fullPath,
            relativePath,
            name: entry.name,
            extension: ext,
            size: stats.size,
            supported,
            selected: supported,
          });
        }
      }
    };

    traverse(rootPath);

    const totalFiles = items.length;
    const totalSize = items.reduce((acc, f) => acc + f.size, 0);
    const supportedFiles = items.filter((f) => f.supported).length;

    return {
      rootPath,
      folderName,
      totalFiles,
      totalSize,
      supportedFiles,
      items,
    };
  }

  public async indexFolderFiles(
    folderRoot: string,
    filesToIndex: Array<{ path: string; relativePath: string }>,
    scope: string,
    onProgress?: (msg: string, percent: number) => void
  ): Promise<FolderIndexSummary> {
    let indexedCount = 0;
    let skippedCount = 0;
    const skippedFiles: string[] = [];
    let totalChunks = 0;

    const total = filesToIndex.length;
    for (let i = 0; i < total; i++) {
      const item = filesToIndex[i];
      const overallPercent = Math.round((i / total) * 100);

      if (!this.isSupportedFile(item.path)) {
        skippedCount++;
        skippedFiles.push(item.relativePath);
        continue;
      }

      try {
        onProgress?.(`[${i + 1}/${total}] Indexing ${item.relativePath}...`, overallPercent);
        const doc = await this.ingestDocument(item.path, scope, item.relativePath, (subMsg, subPct) => {
          const scaledPct = Math.round(overallPercent + (subPct / 100) * (100 / total));
          onProgress?.(`[${i + 1}/${total}] ${subMsg}`, Math.min(scaledPct, 99));
        });
        indexedCount++;
        totalChunks += doc.chunk_count;
      } catch (err: any) {
        console.warn(`Error indexing ${item.relativePath}:`, err);
        skippedCount++;
        skippedFiles.push(`${item.relativePath} (${err.message})`);
      }
    }

    onProgress?.(`Folder indexing complete: ${indexedCount} indexed, ${skippedCount} skipped.`, 100);

    return {
      indexedCount,
      skippedCount,
      skippedFiles,
      totalChunks,
    };
  }

  public async syncFolder(
    folderRoot: string,
    scope: string,
    onProgress?: (msg: string, percent: number) => void
  ): Promise<{ added: number; updated: number; deleted: number; skipped: number; summary: string }> {
    const scan = this.scanFolder(folderRoot);
    const existingDocs = this.db.getDocuments(scope);

    // Build map of existing docs by folder_path
    const existingMap = new Map<string, DocumentItem>();
    for (const d of existingDocs) {
      if (d.folder_path) {
        existingMap.set(d.folder_path, d);
      }
    }

    let added = 0;
    let updated = 0;
    let skipped = 0;
    let deleted = 0;

    const currentRelativePaths = new Set<string>();

    for (let i = 0; i < scan.items.length; i++) {
      const item = scan.items[i];
      currentRelativePaths.add(item.relativePath);

      if (!item.supported) {
        skipped++;
        continue;
      }

      const existing = existingMap.get(item.relativePath);
      const currentHash = this.getFileHash(item.path);

      if (!existing) {
        // New file
        try {
          onProgress?.(`Indexing new file: ${item.relativePath}...`, Math.round((i / scan.items.length) * 100));
          await this.ingestDocument(item.path, scope, item.relativePath);
          added++;
        } catch (err: any) {
          console.warn(`Skipping unreadable new file ${item.relativePath}:`, err.message);
          skipped++;
        }
      } else if (existing.file_hash !== currentHash) {
        // File modified!
        try {
          onProgress?.(`Re-indexing changed file: ${item.relativePath}...`, Math.round((i / scan.items.length) * 100));
          // Delete old doc
          this.db.deleteDocument(existing.id);
          await this.ingestDocument(item.path, scope, item.relativePath);
          updated++;
        } catch (err: any) {
          console.warn(`Skipping unreadable modified file ${item.relativePath}:`, err.message);
          skipped++;
        }
      }
    }

    // Check for deleted files
    for (const [relPath, doc] of existingMap.entries()) {
      if (!currentRelativePaths.has(relPath)) {
        // Document was deleted from folder
        this.db.deleteDocument(doc.id);
        deleted++;
      }
    }

    const summary = `Sync complete: ${added} added, ${updated} updated, ${deleted} removed, ${skipped} skipped.`;
    onProgress?.(summary, 100);

    return { added, updated, deleted, skipped, summary };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  public async retrieveRelevantChunks(
    query: string,
    scope?: string,
    topK = 5
  ): Promise<{ citations: Citation[]; contextPrompt: string }> {
    const allChunks = this.db.getChunksForScope(scope);
    if (!allChunks.length) {
      return { citations: [], contextPrompt: '' };
    }

    const queryEmbedding = await this.ollama.generateEmbedding(query);

    const scored = allChunks.map((chunk) => {
      const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      return { ...chunk, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const topChunks = scored.slice(0, topK).filter((c) => c.score > 0.32);

    if (!topChunks.length) {
      return { citations: [], contextPrompt: '' };
    }

    const citations: Citation[] = topChunks.map((c) => ({
      source: c.folder_path || c.filename,
      pageOrSection: c.page_or_section,
      snippet: c.text_content.substring(0, 180) + '...',
    }));

    const contextPassages = topChunks
      .map(
        (c, idx) =>
          `[Source ${idx + 1}: ${c.folder_path || c.filename}, ${c.page_or_section}]\n${c.text_content}`
      )
      .join('\n\n');

    const contextPrompt = `
You have access to the following passages from the user's private local documents.
Answer the user's question accurately using these passages.
Cite your sources in your answer using "[Source: <file>, <page/section>]".
If the documents do not contain the answer, say honestly that it is not covered in the uploaded documents.

--- LOCAL DOCUMENTS ---
${contextPassages}
--- END LOCAL DOCUMENTS ---
`.trim();

    return { citations, contextPrompt };
  }
}
