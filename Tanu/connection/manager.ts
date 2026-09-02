import { makeWASocket, DisconnectReason, type WASocket } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import NodeCache from 'node-cache';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { loadSession } from './auth.js';
import { handleMessages } from '../handlers/messages.js';
import { eventStore } from '../cache/events.js';
import { getMessage } from '../cache/message-store.js';
import { getGroupMetadata, invalidateGroupMetadata } from '../cache/groups.js';

export type ConnectionState = 'IDLE' | 'INITIALIZING' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'LOGGED_OUT';
export class ConnectionManager {
  private socket: WASocket | null = null;
  private state: ConnectionState = 'IDLE';
  private attempts = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private shuttingDown = false;
  private readonly retryCache = new NodeCache({ stdTTL: 300 });
  async start(): Promise<void> {
    if (this.socket || this.state === 'CONNECTING' || this.state === 'INITIALIZING') return;
    this.shuttingDown = false; this.state = 'INITIALIZING';
    try {
      const auth = loadSession(); this.state = 'CONNECTING';
      let activeSocket!: WASocket;
      const socket = makeWASocket({ auth, browser: ['Tanu XAI', 'Chrome', '120.0.0'], markOnlineOnConnect: true, syncFullHistory: true, cachedGroupMetadata: async jid => getGroupMetadata(activeSocket, jid), getMessage, msgRetryCounterCache: this.retryCache, logger: undefined });
      activeSocket = socket;
      this.socket = socket;
      socket.ev.on('creds.update', creds => { void auth.saveCreds(creds); logger.debug('WA', 'Credentials updated locally; sensitive values omitted'); });
      socket.ev.on('connection.update', update => void this.onUpdate(update));
      socket.ev.on('messages.upsert', messages => void handleMessages(messages, socket));
      socket.ev.on('messages.update', updates => { for (const item of updates) { const id = item.key.id; if (!id) continue; const text = item.update.message?.conversation ?? item.update.message?.extendedTextMessage?.text; if (text) eventStore.markEdited(id, text); else eventStore.markDeleted(id); } });
      socket.ev.on('groups.update', updates => { for (const update of updates) if (update.id) invalidateGroupMetadata(update.id); });
      socket.ev.on('group-participants.update', update => invalidateGroupMetadata(update.id));
      logger.info('WA', 'Socket initialized');
    } catch (error) { this.socket = null; this.state = 'DISCONNECTED'; logger.error('WA', 'Connection initialization failed', { error: error instanceof Error ? error.message : String(error) }); this.scheduleReconnect(); }
  }
  private async onUpdate(update: { connection?: string; lastDisconnect?: { error?: unknown }; qr?: string }): Promise<void> {
    if (update.connection === 'open') { this.state = 'CONNECTED'; this.attempts = 0; logger.info('WA', 'Connected'); return; }
    if (update.connection !== 'close') return;
    const code = (update.lastDisconnect?.error as Boom)?.output?.statusCode; this.socket = null;
    if (code === DisconnectReason.loggedOut || code === DisconnectReason.badSession) { this.state = 'LOGGED_OUT'; logger.error('WA', 'Session is invalid or logged out; reconnect disabled'); return; }
    this.state = 'DISCONNECTED'; if (!this.shuttingDown) this.scheduleReconnect();
  }
  private scheduleReconnect(): void { if (this.timer || this.shuttingDown || this.attempts >= config.maxReconnectAttempts) { if (this.attempts >= config.maxReconnectAttempts) logger.error('WA', 'Maximum reconnect attempts reached'); return; } this.attempts += 1; const delay = Math.min(1000 * 2 ** (this.attempts - 1), 60_000) + Math.floor(Math.random() * 500); logger.warn('WA', 'Scheduling reconnect', { attempt: this.attempts, delay }); this.timer = setTimeout(() => { this.timer = undefined; this.state = 'RECONNECTING'; void this.start(); }, delay); }
  async shutdown(): Promise<void> { this.shuttingDown = true; if (this.timer) clearTimeout(this.timer); this.timer = undefined; if (this.socket) this.socket.end(undefined); this.socket = null; this.state = 'IDLE'; logger.info('WA', 'Shutdown complete'); }
  getSocket(): WASocket | null { return this.socket; } getState(): ConnectionState { return this.state; } isConnected(): boolean { return this.state === 'CONNECTED' && this.socket !== null; }
}
export const connectionManager = new ConnectionManager();
