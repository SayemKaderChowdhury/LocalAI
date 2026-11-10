import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export class AppLogger {
  private logDir: string;
  private appLogPath: string;
  private startupLogPath: string;
  private maxSizeBytes = 10 * 1024 * 1024; // 10 MB

  constructor() {
    try {
      this.logDir = path.join(app.getPath('appData'), 'LocalAI', 'logs');
    } catch {
      // Fallback for early startup before app ready
      const base = process.env.APPDATA || (process.platform === 'darwin' 
        ? path.join(process.env.HOME || '', 'Library', 'Application Support') 
        : path.join(process.env.HOME || '', '.config'));
      this.logDir = path.join(base, 'LocalAI', 'logs');
    }

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    this.appLogPath = path.join(this.logDir, 'app.log');
    this.startupLogPath = path.join(this.logDir, 'startup.log');
    this.checkRotation();
  }

  public getLogDir(): string {
    return this.logDir;
  }

  public getAppLogPath(): string {
    return this.appLogPath;
  }

  public getStartupLogPath(): string {
    return this.startupLogPath;
  }

  private checkRotation(): void {
    try {
      if (fs.existsSync(this.appLogPath)) {
        const stats = fs.statSync(this.appLogPath);
        if (stats.size >= this.maxSizeBytes) {
          const oldPath = path.join(this.logDir, `app.log.${Date.now()}.old`);
          fs.renameSync(this.appLogPath, oldPath);
        }
      }
    } catch (err) {
      console.error('Failed to rotate log file:', err);
    }
  }

  public info(message: string, meta?: any): void {
    this.writeEntry('INFO', message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.writeEntry('WARN', message, meta);
  }

  public error(message: string, meta?: any): void {
    this.writeEntry('ERROR', message, meta);
  }

  public startup(stage: string, elapsedMs: number, note: string = ''): void {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [STARTUP] ${stage.padEnd(24)} | ${elapsedMs.toFixed(2)} ms | ${note}\n`;
    try {
      fs.appendFileSync(this.startupLogPath, line, 'utf-8');
      if (process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1') {
        console.log(`[STARTUP] ${stage}: ${elapsedMs.toFixed(2)}ms ${note ? `(${note})` : ''}`);
      }
    } catch (err) {
      console.error('Failed to write startup log:', err);
    }
  }

  private writeEntry(level: string, message: string, meta?: any): void {
    this.checkRotation();
    const timestamp = new Date().toISOString();
    let line = `[${timestamp}] [${level}] ${message}`;
    if (meta !== undefined) {
      try {
        line += ' ' + (typeof meta === 'object' ? JSON.stringify(meta) : String(meta));
      } catch {
        line += ' [Unserializable meta]';
      }
    }
    line += '\n';

    try {
      fs.appendFileSync(this.appLogPath, line, 'utf-8');
    } catch {}

    if (process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1') {
      if (level === 'ERROR') {
        console.error(`[${level}] ${message}`, meta || '');
      } else if (level === 'WARN') {
        console.warn(`[${level}] ${message}`, meta || '');
      } else {
        console.log(`[${level}] ${message}`, meta || '');
      }
    }
  }
}

export const logger = new AppLogger();

