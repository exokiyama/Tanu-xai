import { proto, WASocket, DisconnectReason, AuthenticationState, makeCacheableSignalKeyStore } from 'baileys';
import { Boom } from '@hapi/boom';
import NodeCache from 'node-cache';
import { config } from '../config/index.js';
import { createModuleLogger } from '../logger/index.js';
import { ConnectionStateValue } from '../../types/index.js';
import { handleMessages } from '../../handlers/commands.js';

const log = createModuleLogger('WA');

const msgRetryCounterCache = new NodeCache();

export class ConnectionManager {
  private sock: WASocket | null = null;
  private state: ConnectionStateValue = 'IDLE';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseDelay = 1000;
  private maxDelay = 60000;
  private isReconnecting = false;
  private authState: AuthenticationState | null = null;

  constructor() {}

  async initialize(): Promise<void> {
    if (this.state === 'INITIALIZING' || this.state === 'CONNECTING') {
      log.warn('Connection already initializing');
      return;
    }

    this.setState('INITIALIZING');
    
    try {
      const sessionId = config.sessionId;
      
      if (!sessionId || !sessionId.startsWith('Tanu-XAI~')) {
        throw new Error('Invalid or missing SESSION_ID');
      }

      const sessionData = sessionId.replace('Tanu-XAI~', '');
      const creds = JSON.parse(Buffer.from(sessionData, 'base64').toString('utf-8'));
      
      this.authState = {
        creds,
        keys: makeCacheableSignalKeyStore(
          (creds as any).keys || {},
          undefined
        )
      };

      log.info('Session loaded successfully');
    } catch (error: any) {
      log.error('Failed to load session', { error: error.message });
      this.setState('LOGGED_OUT');
      throw error;
    }
  }

  async connect(): Promise<void> {
    if (this.sock) {
      log.warn('Socket already exists');
      return;
    }

    if (!this.authState) {
      await this.initialize();
    }

    this.setState('CONNECTING');

    try {
      const { default: makeWASocket } = await import('baileys');

      this.sock = makeWASocket({
        auth: this.authState!,
        printQRInTerminal: false,
        browser: ['Tanu XAI', 'Chrome', '120.0.0'],
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        msgRetryCounterCache,
        shouldIgnoreJid: () => false,
        version: [2, 3000, 1015901307],
        logger: undefined,
        syncFullHistory: false
      });

      this.setupEventHandlers();

      log.info('WhatsApp socket initialized');
    } catch (error: any) {
      log.error('Failed to create socket', { error: error.message });
      this.setState('DISCONNECTED');
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers(): void {
    if (!this.sock) return;

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = this.shouldReconnect(statusCode);

        log.warn('Connection closed', { statusCode, shouldReconnect });

        this.sock = null;
        this.setState('DISCONNECTED');

        if (shouldReconnect) {
          this.scheduleReconnect();
        } else {
          this.setState('LOGGED_OUT');
          log.error('WhatsApp session logged out. New SESSION_ID required.');
        }
      } else if (connection === 'open') {
        log.info('Connected to WhatsApp ✓');
        this.setState('CONNECTED');
        this.reconnectAttempts = 0;
      }

      if (update.qr) {
        log.warn('QR code received (should not happen with valid session)');
      }
    });

    this.sock.ev.on('creds.update', (creds) => {
      if (this.authState) {
        this.authState.creds = creds as AuthenticationCreds;
      }
    });

    this.sock.ev.on('messages.upsert', async (m) => {
      await handleMessages(m, this.sock!);
    });
  }

  private shouldReconnect(statusCode: number | undefined): boolean {
    if (statusCode === DisconnectReason.loggedOut) {
      return false;
    }

    if (statusCode === DisconnectReason.badSession) {
      return false;
    }

    if (statusCode === DisconnectReason.connectionLost) {
      return true;
    }

    if (statusCode === DisconnectReason.connectionClosed) {
      return true;
    }

    if (statusCode === DisconnectReason.restartRequired) {
      return true;
    }

    return true;
  }

  private scheduleReconnect(): void {
    if (this.isReconnecting) {
      log.debug('Reconnect already scheduled');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      log.error('Max reconnect attempts reached');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts - 1) + Math.random() * 1000,
      this.maxDelay
    );

    log.info(`Scheduling reconnect in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(async () => {
      this.isReconnecting = false;
      this.setState('RECONNECTING');
      await this.connect();
    }, delay);
  }

  private setState(newState: ConnectionStateValue): void {
    this.state = newState;
    log.debug(`Connection state: ${newState}`);
  }

  getState(): ConnectionStateValue {
    return this.state;
  }

  getSocket(): WASocket | null {
    return this.sock;
  }

  isConnected(): boolean {
    return this.state === 'CONNECTED' && this.sock !== null;
  }

  async disconnect(): Promise<void> {
    if (this.sock) {
      this.sock.end(undefined);
      this.sock = null;
    }
    this.setState('IDLE');
    log.info('Disconnected from WhatsApp');
  }

  async gracefulShutdown(): Promise<void> {
    log.info('Initiating graceful shutdown...');
    
    if (this.sock) {
      this.sock.end(undefined);
      this.sock = null;
    }

    this.setState('IDLE');
    log.info('Graceful shutdown complete');
  }
}

export const connectionManager = new ConnectionManager();
