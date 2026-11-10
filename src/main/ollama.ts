import http from 'http';
import { exec, spawn } from 'child_process';
import { OllamaModel, ChatStreamChunk } from '../shared/types';
import { logger } from './logger';

export class OllamaClient {
  private host = '127.0.0.1';
  private port = 11434;
  private activeStreams: Map<string, http.ClientRequest> = new Map();

  public getBaseUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  public async checkCliInstalled(): Promise<{ installed: boolean; version?: string }> {
    return new Promise((resolve) => {
      exec(
        'ollama --version',
        { windowsHide: true },
        (err: any, stdout: any, stderr: any) => {
          if (!err && stdout) {
            resolve({ installed: true, version: stdout.trim() });
          } else if (stderr && stderr.includes('version')) {
            resolve({ installed: true, version: stderr.trim() });
          } else {
            resolve({ installed: false });
          }
        }
      );
    });
  }

  public async checkHealth(): Promise<{ running: boolean; models: OllamaModel[]; error?: string }> {
    return new Promise((resolve) => {
      const req = http.get(`${this.getBaseUrl()}/api/tags`, { timeout: 2500 }, (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            resolve({
              running: true,
              models: data.models || [],
            });
          } catch (e: any) {
            resolve({ running: false, models: [], error: e.message });
          }
        });
      });

      req.on('error', (err) => {
        resolve({ running: false, models: [], error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ running: false, models: [], error: 'Timeout connecting to Ollama' });
      });
    });
  }

  public async startOllama(): Promise<boolean> {
    try {
      const initialHealth = await this.checkHealth();
      if (initialHealth.running) return true;

      logger.info('Spawning ollama serve supervisor...');
      const child = spawn('ollama', ['serve'], {
        detached: false,
        stdio: 'pipe',
        windowsHide: true,
        shell: false,
        env: { ...process.env, OLLAMA_HOST: '127.0.0.1:11434' },
      });

      if (child.stdout) {
        child.stdout.on('data', (d) => logger.info(`[OLLAMA] ${d.toString().trim()}`));
      }
      if (child.stderr) {
        child.stderr.on('data', (d) => logger.warn(`[OLLAMA] ${d.toString().trim()}`));
      }
      child.on('error', (err) => {
        logger.error('Ollama supervisor error:', err);
      });

      // Poll until online or 8s
      for (let i = 0; i < 16; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const health = await this.checkHealth();
        if (health.running) {
          logger.info('Ollama serve verified online via HTTP');
          return true;
        }
      }
      return false;
    } catch (err) {
      logger.error('Failed to spawn ollama serve:', err);
      return false;
    }
  }

  public async warmupModel(modelName: string): Promise<boolean> {
    return new Promise((resolve) => {
      const postData = JSON.stringify({
        model: modelName,
        prompt: '',
        keep_alive: '60m',
      });
      const req = http.request(
        `${this.getBaseUrl()}/api/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
          timeout: 10000,
        },
        (res) => {
          res.on('data', () => {});
          res.on('end', () => {
            logger.info(`Model warmup completed for ${modelName}`);
            resolve(true);
          });
        }
      );
      req.on('error', (err) => {
        logger.warn(`Model warmup error for ${modelName}:`, err.message);
        resolve(false);
      });
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.write(postData);
      req.end();
    });
  }

  public async pullModel(
    modelName: string,
    onProgress: (info: { status: string; completed?: number; total?: number; percent?: number }) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({ name: modelName, stream: true });
      const req = http.request(
        `${this.getBaseUrl()}/api/pull`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          let buffer = '';
          res.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const data = JSON.parse(line);
                let percent = 0;
                if (data.total && data.completed) {
                  percent = Math.round((data.completed / data.total) * 100);
                }
                onProgress({
                  status: data.status || 'Downloading...',
                  completed: data.completed,
                  total: data.total,
                  percent,
                });
              } catch {}
            }
          });

          res.on('end', () => {
            resolve();
          });
        }
      );

      req.on('error', (err) => {
        reject(err);
      });

      req.write(postData);
      req.end();
    });
  }

  public async deleteModel(modelName: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({ name: modelName });
      const req = http.request(
        `${this.getBaseUrl()}/api/delete`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          if (res.statusCode === 200 || res.statusCode === 204) {
            resolve(true);
          } else {
            resolve(false);
          }
        }
      );

      req.on('error', (err) => reject(err));
      req.write(postData);
      req.end();
    });
  }

  public async generateEmbedding(text: string): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        model: 'nomic-embed-text',
        prompt: text,
      });

      const req = http.request(
        `${this.getBaseUrl()}/api/embeddings`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
          timeout: 15000,
        },
        (res) => {
          let raw = '';
          res.on('data', (c) => (raw += c));
          res.on('end', () => {
            try {
              const data = JSON.parse(raw);
              if (data.embedding && Array.isArray(data.embedding)) {
                resolve(data.embedding);
              } else {
                reject(new Error(data.error || 'Failed to generate embedding'));
              }
            } catch (err) {
              reject(err);
            }
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Embedding request timed out'));
      });

      req.write(postData);
      req.end();
    });
  }

  public chatStream(
    params: {
      messageId: string;
      model: string;
      messages: Array<{ role: string; content: string; images?: string[] }>;
      temperature?: number;
      contextLength?: number;
      maxTokens?: number;
    },
    onChunk: (chunk: ChatStreamChunk) => void
  ): void {
    const startTime = Date.now();
    let tokenCount = 0;

    const payload = {
      model: params.model,
      messages: params.messages,
      stream: true,
      keep_alive: '60m',
      options: {
        temperature: params.temperature ?? 0.7,
        num_ctx: params.contextLength ?? 4096,
        num_predict: params.maxTokens ?? 2048,
      },
    };

    const postData = JSON.stringify(payload);

    let inThinking = false;

    const req = http.request(
      `${this.getBaseUrl()}/api/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let buffer = '';

        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);

              if (parsed.error) {
                const isOom = /out of memory|cuda error|allocate|runner exited|not enough memory/i.test(parsed.error);
                onChunk({
                  messageId: params.messageId,
                  delta: '',
                  done: true,
                  error: parsed.error,
                  isOom,
                });
                return;
              }

              let delta = '';
              if (parsed.message?.thinking) {
                if (!inThinking) {
                  inThinking = true;
                  delta = '> *Thinking...*\n> ' + parsed.message.thinking;
                } else {
                  delta = parsed.message.thinking.replace(/\n/g, '\n> ');
                }
              } else if (parsed.message?.content) {
                if (inThinking) {
                  inThinking = false;
                  delta = '\n\n' + parsed.message.content;
                } else {
                  delta = parsed.message.content;
                }
              }

              if (delta) tokenCount++;

              const elapsedMs = Math.max(1, Date.now() - startTime);
              let tokensPerSec = Math.round((tokenCount / (elapsedMs / 1000)) * 10) / 10;

              if (parsed.eval_count && parsed.eval_duration) {
                // Ollama native eval tokens/sec
                const sec = parsed.eval_duration / 1e9;
                if (sec > 0) {
                  tokensPerSec = Math.round((parsed.eval_count / sec) * 10) / 10;
                }
              }

              onChunk({
                messageId: params.messageId,
                delta,
                done: Boolean(parsed.done),
                tokensPerSec,
                durationMs: elapsedMs,
              });

              if (parsed.done) {
                this.activeStreams.delete(params.messageId);
              }
            } catch {}
          }
        });

        res.on('end', () => {
          this.activeStreams.delete(params.messageId);
        });
      }
    );

    req.on('error', (err: any) => {
      this.activeStreams.delete(params.messageId);
      const isOom = /out of memory|cuda error|allocate|runner exited/i.test(err.message || '');
      onChunk({
        messageId: params.messageId,
        delta: '',
        done: true,
        error: isOom
          ? 'This model needs more RAM/VRAM than this PC has. Try qwen3:4b instead.'
          : err.message,
        isOom,
      });
    });

    this.activeStreams.set(params.messageId, req);
    req.write(postData);
    req.end();
  }

  public abortChat(messageId: string): void {
    const req = this.activeStreams.get(messageId);
    if (req) {
      try {
        req.destroy();
      } catch {}
      this.activeStreams.delete(messageId);
    }
  }
}
