import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { app } from 'electron';
import { Conversation, Message, DocumentItem, AppSettings, Workspace } from '../shared/types';

export class LocalDatabase {
  private db: Database | null = null;
  private dbPath: string;
  private storageDir: string;
  private initialized = false;

  constructor() {
    this.storageDir = path.join(app.getPath('appData'), 'LocalAI');
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
    this.dbPath = path.join(this.storageDir, 'localai.sqlite');
  }

  public getStorageDir(): string {
    return this.storageDir;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    let wasmBinary: Buffer | undefined;
    const candidates = [
      path.join(__dirname, '../sql-wasm.wasm'),
      path.join(__dirname, 'sql-wasm.wasm'),
      path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm'),
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        wasmBinary = fs.readFileSync(c);
        break;
      }
    }

    const SQL: SqlJsStatic = await initSqlJs(wasmBinary ? { wasmBinary } : {});

    if (fs.existsSync(this.dbPath)) {
      try {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(fileBuffer);
      } catch (err) {
        console.error('Corrupted db file, starting fresh:', err);
        this.db = new SQL.Database();
      }
    } else {
      this.db = new SQL.Database();
    }

    this.createTables();
    this.runMigrations();
    this.saveToDisk();
    this.initialized = true;
  }

  private saveToDisk(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (err) {
      console.error('Failed to save SQLite to disk:', err);
    }
  }

  private createTables(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT,
        icon TEXT DEFAULT '',
        color TEXT DEFAULT '',
        instructions TEXT DEFAULT '',
        memory TEXT DEFAULT '',
        created_at INTEGER,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT,
        created_at INTEGER,
        updated_at INTEGER,
        pinned INTEGER DEFAULT 0,
        folder_tag TEXT DEFAULT '',
        system_prompt TEXT DEFAULT '',
        temperature REAL DEFAULT 0.7,
        context_length INTEGER DEFAULT 4096,
        max_tokens INTEGER DEFAULT 2048,
        model TEXT DEFAULT 'qwen3:4b',
        workspace_id TEXT DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        role TEXT,
        content TEXT,
        created_at INTEGER,
        tokens_per_sec REAL DEFAULT 0,
        total_duration_ms INTEGER DEFAULT 0,
        citations TEXT DEFAULT '[]',
        images TEXT DEFAULT '[]'
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        filename TEXT,
        file_type TEXT,
        file_size INTEGER,
        created_at INTEGER,
        chunk_count INTEGER DEFAULT 0,
        scope TEXT DEFAULT 'global',
        folder_path TEXT DEFAULT '',
        file_hash TEXT DEFAULT '',
        updated_at INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS document_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        chunk_index INTEGER,
        page_or_section TEXT,
        text_content TEXT,
        embedding TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);
    `);
  }

  private runMigrations(): void {
    if (!this.db) return;
    try {
      this.db.run('ALTER TABLE conversations ADD COLUMN workspace_id TEXT DEFAULT ""');
    } catch {
      // Column already exists
    }
    try {
      this.db.run('ALTER TABLE documents ADD COLUMN folder_path TEXT DEFAULT ""');
    } catch {
      // Column already exists
    }
    try {
      this.db.run('ALTER TABLE documents ADD COLUMN file_hash TEXT DEFAULT ""');
    } catch {
      // Column already exists
    }
    try {
      this.db.run('ALTER TABLE documents ADD COLUMN updated_at INTEGER DEFAULT 0');
    } catch {
      // Column already exists
    }

    try {
      this.db.run('CREATE INDEX IF NOT EXISTS idx_conv_workspace ON conversations(workspace_id);');
    } catch {}
    try {
      this.db.run('CREATE INDEX IF NOT EXISTS idx_docs_scope ON documents(scope);');
    } catch {}
  }

  // --- Workspaces (Feature 4) ---

  public getWorkspaces(): Workspace[] {
    if (!this.db) return [];
    const res = this.db.exec(`
      SELECT id, name, icon, color, instructions, memory, created_at, updated_at
      FROM workspaces
      ORDER BY updated_at DESC
    `);
    if (!res.length) return [];
    return res[0].values.map((row) => ({
      id: String(row[0]),
      name: String(row[1]),
      icon: row[2] ? String(row[2]) : undefined,
      color: row[3] ? String(row[3]) : undefined,
      instructions: row[4] ? String(row[4]) : undefined,
      memory: row[5] ? String(row[5]) : undefined,
      created_at: Number(row[6]),
      updated_at: Number(row[7]),
    }));
  }

  public getWorkspace(id: string): Workspace | null {
    if (!this.db) return null;
    const res = this.db.exec(
      `SELECT id, name, icon, color, instructions, memory, created_at, updated_at FROM workspaces WHERE id = ?`,
      [id]
    );
    if (!res.length || !res[0].values.length) return null;
    const row = res[0].values[0];
    return {
      id: String(row[0]),
      name: String(row[1]),
      icon: row[2] ? String(row[2]) : undefined,
      color: row[3] ? String(row[3]) : undefined,
      instructions: row[4] ? String(row[4]) : undefined,
      memory: row[5] ? String(row[5]) : undefined,
      created_at: Number(row[6]),
      updated_at: Number(row[7]),
    };
  }

  public saveWorkspace(ws: Workspace): void {
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO workspaces (id, name, icon, color, instructions, memory, created_at, updated_at)
      VALUES ($id, $name, $icon, $color, $instructions, $memory, $created_at, $updated_at)
    `);
    stmt.run({
      $id: ws.id,
      $name: ws.name,
      $icon: ws.icon || '',
      $color: ws.color || '',
      $instructions: ws.instructions || '',
      $memory: ws.memory || '',
      $created_at: ws.created_at,
      $updated_at: ws.updated_at,
    });
    stmt.free();
    this.saveToDisk();
  }

  public deleteWorkspace(id: string, deleteChatsAndFiles: boolean): void {
    if (!this.db) return;

    if (deleteChatsAndFiles) {
      // Find all conversations in this workspace
      const convs = this.db.exec('SELECT id FROM conversations WHERE workspace_id = ?', [id]);
      if (convs.length && convs[0].values.length) {
        for (const row of convs[0].values) {
          const convId = String(row[0]);
          this.db.run('DELETE FROM messages WHERE conversation_id = ?', [convId]);
        }
      }
      this.db.run('DELETE FROM conversations WHERE workspace_id = ?', [id]);

      // Find all documents scoped to this workspace
      const docs = this.db.exec('SELECT id FROM documents WHERE scope = ?', [id]);
      if (docs.length && docs[0].values.length) {
        for (const row of docs[0].values) {
          this.deleteDocument(String(row[0]));
        }
      }
    } else {
      // Move chats to All Chats (workspace_id = '')
      this.db.run('UPDATE conversations SET workspace_id = "" WHERE workspace_id = ?', [id]);
      // Move documents to global scope
      this.db.run('UPDATE documents SET scope = "global" WHERE scope = ?', [id]);
    }

    this.db.run('DELETE FROM workspaces WHERE id = ?', [id]);
    this.saveToDisk();
  }

  public updateWorkspaceMemory(workspaceId: string, memory: string): void {
    if (!this.db) return;
    this.db.run('UPDATE workspaces SET memory = ?, updated_at = ? WHERE id = ?', [
      memory,
      Date.now(),
      workspaceId,
    ]);
    this.saveToDisk();
  }

  // --- Conversations ---

  public getConversations(workspaceId?: string | null): Conversation[] {
    if (!this.db) return [];
    let sql = `
      SELECT id, title, created_at, updated_at, pinned, folder_tag, system_prompt, temperature, context_length, max_tokens, model, workspace_id
      FROM conversations
    `;
    const params: string[] = [];
    if (workspaceId !== undefined) {
      if (workspaceId === null || workspaceId === '') {
        // All chats not in a workspace
        sql += ` WHERE workspace_id = "" OR workspace_id IS NULL`;
      } else {
        sql += ` WHERE workspace_id = ?`;
        params.push(workspaceId);
      }
    }
    sql += ` ORDER BY pinned DESC, updated_at DESC`;

    const res = this.db.exec(sql, params);
    if (!res.length) return [];

    return res[0].values.map((row) => ({
      id: String(row[0]),
      title: String(row[1]),
      created_at: Number(row[2]),
      updated_at: Number(row[3]),
      pinned: Boolean(row[4]),
      folder_tag: row[5] ? String(row[5]) : undefined,
      system_prompt: row[6] ? String(row[6]) : undefined,
      temperature: Number(row[7]),
      context_length: Number(row[8]),
      max_tokens: Number(row[9]),
      model: String(row[10]),
      workspace_id: row[11] ? String(row[11]) : undefined,
    }));
  }

  public saveConversation(conv: Conversation): void {
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO conversations (id, title, created_at, updated_at, pinned, folder_tag, system_prompt, temperature, context_length, max_tokens, model, workspace_id)
      VALUES ($id, $title, $created_at, $updated_at, $pinned, $folder_tag, $system_prompt, $temperature, $context_length, $max_tokens, $model, $workspace_id)
    `);
    stmt.run({
      $id: conv.id,
      $title: conv.title,
      $created_at: conv.created_at,
      $updated_at: conv.updated_at,
      $pinned: conv.pinned ? 1 : 0,
      $folder_tag: conv.folder_tag || '',
      $system_prompt: conv.system_prompt || '',
      $temperature: conv.temperature,
      $context_length: conv.context_length,
      $max_tokens: conv.max_tokens,
      $model: conv.model,
      $workspace_id: conv.workspace_id || '',
    });
    stmt.free();
    this.saveToDisk();
  }

  public deleteConversation(id: string): void {
    if (!this.db) return;
    this.db.run('DELETE FROM conversations WHERE id = ?', [id]);
    this.db.run('DELETE FROM messages WHERE conversation_id = ?', [id]);
    // Also delete any scoped documents for this conversation
    const docs = this.db.exec('SELECT id FROM documents WHERE scope = ?', [id]);
    if (docs.length && docs[0].values.length) {
      for (const row of docs[0].values) {
        this.deleteDocument(String(row[0]));
      }
    }
    this.saveToDisk();
  }

  public pinConversation(id: string, pinned: boolean): void {
    if (!this.db) return;
    this.db.run('UPDATE conversations SET pinned = ? WHERE id = ?', [pinned ? 1 : 0, id]);
    this.saveToDisk();
  }

  public renameConversation(id: string, title: string): void {
    if (!this.db) return;
    this.db.run('UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?', [title, Date.now(), id]);
    this.saveToDisk();
  }

  public moveConversationToWorkspace(convId: string, workspaceId: string | null): void {
    if (!this.db) return;
    this.db.run('UPDATE conversations SET workspace_id = ?, updated_at = ? WHERE id = ?', [
      workspaceId || '',
      Date.now(),
      convId,
    ]);
    this.saveToDisk();
  }

  // --- Messages ---

  public getMessages(conversationId: string): Message[] {
    if (!this.db) return [];
    const res = this.db.exec(`
      SELECT id, conversation_id, role, content, created_at, tokens_per_sec, total_duration_ms, citations, images
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `, [conversationId]);

    if (!res.length) return [];
    return res[0].values.map((row) => ({
      id: String(row[0]),
      conversation_id: String(row[1]),
      role: row[2] as 'user' | 'assistant' | 'system',
      content: String(row[3]),
      created_at: Number(row[4]),
      tokens_per_sec: Number(row[5]),
      total_duration_ms: Number(row[6]),
      citations: row[7] ? JSON.parse(String(row[7])) : [],
      images: row[8] ? JSON.parse(String(row[8])) : [],
    }));
  }

  public saveMessage(msg: Message): void {
    if (!this.db) return;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO messages (id, conversation_id, role, content, created_at, tokens_per_sec, total_duration_ms, citations, images)
      VALUES ($id, $conversation_id, $role, $content, $created_at, $tokens_per_sec, $total_duration_ms, $citations, $images)
    `);
    stmt.run({
      $id: msg.id,
      $conversation_id: msg.conversation_id,
      $role: msg.role,
      $content: msg.content,
      $created_at: msg.created_at,
      $tokens_per_sec: msg.tokens_per_sec || 0,
      $total_duration_ms: msg.total_duration_ms || 0,
      $citations: JSON.stringify(msg.citations || []),
      $images: JSON.stringify(msg.images || []),
    });
    stmt.free();

    this.db.run('UPDATE conversations SET updated_at = ? WHERE id = ?', [Date.now(), msg.conversation_id]);
    this.saveToDisk();
  }

  public deleteMessage(id: string): void {
    if (!this.db) return;
    this.db.run('DELETE FROM messages WHERE id = ?', [id]);
    this.saveToDisk();
  }

  public deleteMessagesAfter(conversationId: string, timestamp: number): void {
    if (!this.db) return;
    this.db.run('DELETE FROM messages WHERE conversation_id = ? AND created_at >= ?', [conversationId, timestamp]);
    this.saveToDisk();
  }

  // --- Documents & Chunks (Features 2 & 4) ---

  public getDocuments(scope?: string): DocumentItem[] {
    if (!this.db) return [];
    let sql = 'SELECT id, filename, file_type, file_size, created_at, chunk_count, scope, folder_path, file_hash, updated_at FROM documents';
    const params: (string | number)[] = [];
    if (scope && scope !== 'all') {
      sql += ' WHERE scope = ? OR scope = "global"';
      params.push(scope);
    }
    sql += ' ORDER BY created_at DESC';

    const res = this.db.exec(sql, params);
    if (!res.length) return [];
    return res[0].values.map((row) => ({
      id: String(row[0]),
      filename: String(row[1]),
      file_type: String(row[2]),
      file_size: Number(row[3]),
      created_at: Number(row[4]),
      chunk_count: Number(row[5]),
      scope: String(row[6]),
      folder_path: row[7] ? String(row[7]) : undefined,
      file_hash: row[8] ? String(row[8]) : undefined,
      updated_at: row[9] ? Number(row[9]) : undefined,
    }));
  }

  public getDocumentByRelativePath(relativePath: string, scope: string): DocumentItem | null {
    if (!this.db) return null;
    const res = this.db.exec(
      'SELECT id, filename, file_type, file_size, created_at, chunk_count, scope, folder_path, file_hash, updated_at FROM documents WHERE (folder_path = ? OR filename = ?) AND scope = ?',
      [relativePath, relativePath, scope]
    );
    if (!res.length || !res[0].values.length) return null;
    const row = res[0].values[0];
    return {
      id: String(row[0]),
      filename: String(row[1]),
      file_type: String(row[2]),
      file_size: Number(row[3]),
      created_at: Number(row[4]),
      chunk_count: Number(row[5]),
      scope: String(row[6]),
      folder_path: row[7] ? String(row[7]) : undefined,
      file_hash: row[8] ? String(row[8]) : undefined,
      updated_at: row[9] ? Number(row[9]) : undefined,
    };
  }

  public saveDocument(
    doc: DocumentItem,
    chunks: Array<{ id: string; chunk_index: number; page_or_section: string; text_content: string; embedding: number[] }>
  ): void {
    if (!this.db) return;

    // Remove prior chunks if replacing
    this.db.run('DELETE FROM document_chunks WHERE document_id = ?', [doc.id]);

    const docStmt = this.db.prepare(`
      INSERT OR REPLACE INTO documents (id, filename, file_type, file_size, created_at, chunk_count, scope, folder_path, file_hash, updated_at)
      VALUES ($id, $filename, $file_type, $file_size, $created_at, $chunk_count, $scope, $folder_path, $file_hash, $updated_at)
    `);
    docStmt.run({
      $id: doc.id,
      $filename: doc.filename,
      $file_type: doc.file_type,
      $file_size: doc.file_size,
      $created_at: doc.created_at,
      $chunk_count: chunks.length,
      $scope: doc.scope,
      $folder_path: doc.folder_path || '',
      $file_hash: doc.file_hash || '',
      $updated_at: doc.updated_at || Date.now(),
    });
    docStmt.free();

    // Insert chunks
    for (const chunk of chunks) {
      const chunkStmt = this.db.prepare(`
        INSERT OR REPLACE INTO document_chunks (id, document_id, chunk_index, page_or_section, text_content, embedding)
        VALUES ($id, $document_id, $chunk_index, $page_or_section, $text_content, $embedding)
      `);
      chunkStmt.run({
        $id: chunk.id,
        $document_id: doc.id,
        $chunk_index: chunk.chunk_index,
        $page_or_section: chunk.page_or_section,
        $text_content: chunk.text_content,
        $embedding: JSON.stringify(chunk.embedding),
      });
      chunkStmt.free();
    }

    this.saveToDisk();
  }

  public deleteDocument(id: string): void {
    if (!this.db) return;
    this.db.run('DELETE FROM documents WHERE id = ?', [id]);
    this.db.run('DELETE FROM document_chunks WHERE document_id = ?', [id]);
    this.saveToDisk();
  }

  public getChunksForScope(scope?: string): Array<{
    id: string;
    document_id: string;
    filename: string;
    folder_path: string;
    page_or_section: string;
    text_content: string;
    embedding: number[];
  }> {
    if (!this.db) return [];
    let sql = `
      SELECT dc.id, dc.document_id, d.filename, d.folder_path, dc.page_or_section, dc.text_content, dc.embedding
      FROM document_chunks dc
      JOIN documents d ON dc.document_id = d.id
    `;
    const params: string[] = [];
    if (scope && scope !== 'global') {
      sql += ' WHERE d.scope = "global" OR d.scope = ?';
      params.push(scope);
    } else if (scope === 'global') {
      sql += ' WHERE d.scope = "global"';
    }

    const res = this.db.exec(sql, params);
    if (!res.length) return [];

    return res[0].values.map((row) => ({
      id: String(row[0]),
      document_id: String(row[1]),
      filename: String(row[2]),
      folder_path: row[3] ? String(row[3]) : String(row[2]),
      page_or_section: String(row[4]),
      text_content: String(row[5]),
      embedding: row[6] ? JSON.parse(String(row[6])) : [],
    }));
  }

  // --- Unified Search across chats, workspaces, and files ---
  public search(query: string, workspaceId?: string): {
    conversations: Conversation[];
    workspaces: Workspace[];
    documents: DocumentItem[];
  } {
    if (!this.db || !query.trim()) {
      return { conversations: [], workspaces: [], documents: [] };
    }
    const q = `%${query.trim().toLowerCase()}%`;

    // 1. Conversations
    let convSql = `
      SELECT id, title, created_at, updated_at, pinned, folder_tag, system_prompt, temperature, context_length, max_tokens, model, workspace_id
      FROM conversations
      WHERE LOWER(title) LIKE ?
    `;
    const convParams: string[] = [q];
    if (workspaceId) {
      convSql += ` AND (workspace_id = ? OR workspace_id = "" OR workspace_id IS NULL)`;
      convParams.push(workspaceId);
    }
    convSql += ` ORDER BY updated_at DESC LIMIT 15`;

    const convRes = this.db.exec(convSql, convParams);
    const conversations: Conversation[] = convRes.length
      ? convRes[0].values.map((row) => ({
          id: String(row[0]),
          title: String(row[1]),
          created_at: Number(row[2]),
          updated_at: Number(row[3]),
          pinned: Boolean(row[4]),
          folder_tag: row[5] ? String(row[5]) : undefined,
          system_prompt: row[6] ? String(row[6]) : undefined,
          temperature: Number(row[7]),
          context_length: Number(row[8]),
          max_tokens: Number(row[9]),
          model: String(row[10]),
          workspace_id: row[11] ? String(row[11]) : undefined,
        }))
      : [];

    // 2. Workspaces
    const wsRes = this.db.exec(
      `SELECT id, name, icon, color, instructions, memory, created_at, updated_at FROM workspaces WHERE LOWER(name) LIKE ? OR LOWER(instructions) LIKE ? ORDER BY updated_at DESC LIMIT 10`,
      [q, q]
    );
    const workspaces: Workspace[] = wsRes.length
      ? wsRes[0].values.map((row) => ({
          id: String(row[0]),
          name: String(row[1]),
          icon: row[2] ? String(row[2]) : undefined,
          color: row[3] ? String(row[3]) : undefined,
          instructions: row[4] ? String(row[4]) : undefined,
          memory: row[5] ? String(row[5]) : undefined,
          created_at: Number(row[6]),
          updated_at: Number(row[7]),
        }))
      : [];

    // 3. Documents
    let docSql = `SELECT id, filename, file_type, file_size, created_at, chunk_count, scope, folder_path, file_hash, updated_at FROM documents WHERE LOWER(filename) LIKE ? OR LOWER(folder_path) LIKE ?`;
    const docParams: string[] = [q, q];
    if (workspaceId) {
      docSql += ` AND (scope = ? OR scope = "global")`;
      docParams.push(workspaceId);
    }
    docSql += ` ORDER BY created_at DESC LIMIT 15`;

    const docRes = this.db.exec(docSql, docParams);
    const documents: DocumentItem[] = docRes.length
      ? docRes[0].values.map((row) => ({
          id: String(row[0]),
          filename: String(row[1]),
          file_type: String(row[2]),
          file_size: Number(row[3]),
          created_at: Number(row[4]),
          chunk_count: Number(row[5]),
          scope: String(row[6]),
          folder_path: row[7] ? String(row[7]) : undefined,
          file_hash: row[8] ? String(row[8]) : undefined,
          updated_at: row[9] ? Number(row[9]) : undefined,
        }))
      : [];

    return { conversations, workspaces, documents };
  }

  // --- Settings ---

  public getSetting(key: string): string | null {
    if (!this.db) return null;
    try {
      const res = this.db.exec('SELECT value FROM settings WHERE key = ?', [key]);
      if (res.length && res[0].values.length) {
        return String(res[0].values[0][0]);
      }
    } catch {}
    return null;
  }

  public getSettings(): AppSettings {
    const defaults: AppSettings = {
      activeModel: 'qwen3:4b',
      defaultPersona: 'General Assistant',
      defaultSystemPrompt: "You are an intelligent, helpful local AI running entirely privately on the user's PC. Answer concisely, accurately, and show steps for code.",
      theme: 'dark',
      colibriConsent: false,
      storageDir: this.storageDir,
      firstRunComplete: false,
      whisperModel: 'base',
      voiceChatMode: false,
      enableAbliteratedModels: false,
    };

    if (!this.db) return defaults;
    const res = this.db.exec('SELECT key, value FROM settings');
    if (!res.length) return defaults;

    const map: Record<string, string> = {};
    for (const row of res[0].values) {
      map[String(row[0])] = String(row[1]);
    }

    return {
      activeModel: map.activeModel || defaults.activeModel,
      defaultPersona: map.defaultPersona || defaults.defaultPersona,
      defaultSystemPrompt: map.defaultSystemPrompt || defaults.defaultSystemPrompt,
      theme: (map.theme as 'dark' | 'light') || defaults.theme,
      colibriConsent: map.colibriConsent === 'true',
      storageDir: map.storageDir || defaults.storageDir,
      firstRunComplete: map.firstRunComplete === 'true',
      whisperModel: (map.whisperModel as 'base' | 'tiny' | 'small') || defaults.whisperModel,
      voiceChatMode: map.voiceChatMode === 'true',
      enableAbliteratedModels: map.enableAbliteratedModels === 'true',
    };
  }

  public saveSetting(key: string, value: string): void {
    if (!this.db) return;
    this.db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    this.saveToDisk();
  }
}
