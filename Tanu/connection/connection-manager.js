'use strict';

const fs = require('fs');
const path = require('path');

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers
} = require('@whiskeysockets/baileys');

const { Boom } = require('@hapi/boom');
const pino = require('pino');

const { config } = require('../../config/config.js');
const { log } = require('../../lib/utils/logger.js');

class ConnectionManager {
  constructor(options = {}) {
    this.config = options.config || config;

    this.sock = null;
    this.authState = null;

    this.status = 'disconnected';
    this.user = null;

    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts =
      this.config.maxReconnectAttempts ?? 10;

    this.isStarting = false;
    this.isStopping = false;

    this.startedAt = null;
    this.lastActivity = null;

    this.reconnectStats = {
      attempts: 0,
      successful: 0,
      lastAttempt: null
    };

    this.groups = [];

    this.logger = pino({
      level: process.env.LOG_LEVEL || 'silent'
    });

    this.authDir = path.resolve(
      process.env.AUTH_DIR || './auth'
    );

    this.ensureAuthDirectory();
  }

  /**
   * Create authentication directory.
   */
  ensureAuthDirectory() {
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, {
        recursive: true
      });
    }
  }

  /**
   * Decode Tanu-XAI~ session.
   *
   * The external session format is:
   *
   * Tanu-XAI~<base64>
   *
   * Supported payloads:
   *
   * 1. JSON object
   * 2. JSON containing auth state
   * 3. JSON containing creds
   *
   * Credentials are never logged.
   */
  decodeSessionId(sessionId) {
    if (!sessionId) {
      throw new Error('SESSION_ID is empty');
    }

    if (!sessionId.startsWith('Tanu-XAI~')) {
      throw new Error(
        'SESSION_ID must use Tanu-XAI~ format'
      );
    }

    const encoded = sessionId.slice('Tanu-XAI~'.length).trim();

    if (!encoded) {
      throw new Error(
        'SESSION_ID contains no encoded session data'
      );
    }

    let decoded;

    try {
      decoded = Buffer.from(encoded, 'base64').toString('utf8');
    } catch {
      throw new Error(
        'SESSION_ID contains invalid base64 data'
      );
    }

    if (!decoded) {
      throw new Error(
        'SESSION_ID decoded to an empty value'
      );
    }

    try {
      return JSON.parse(decoded);
    } catch {
      throw new Error(
        'SESSION_ID decoded successfully but is not valid JSON'
      );
    }
  }

  /**
   * Write decoded authentication data to the local
   * Baileys auth directory.
   *
   * This supports common session payload structures.
   */
  async prepareSession() {
    const payload = this.decodeSessionId(
      this.config.sessionId
    );

    /*
     * If the session generator supplies a complete
     * multi-file auth structure, restore it.
     */
    if (
      payload &&
      typeof payload === 'object' &&
      payload.creds &&
      payload.keys
    ) {
      await this.restoreAuthPayload(payload);
      return;
    }

    /*
     * Some generators return:
     *
     * {
     *   auth: {
     *     creds: {...},
     *     keys: {...}
     *   }
     * }
     */
    if (
      payload &&
      payload.auth &&
      payload.auth.creds &&
      payload.auth.keys
    ) {
      await this.restoreAuthPayload(payload.auth);
      return;
    }

    /*
     * Some generators only return creds.
     *
     * In that case we restore creds and allow Baileys
     * to create/update the remaining key files.
     */
    if (payload && payload.creds) {
      await this.writeJson(
        path.join(this.authDir, 'creds.json'),
        payload.creds
      );

      return;
    }

    /*
     * Some generators wrap the data in "session".
     */
    if (
      payload &&
      payload.session &&
      typeof payload.session === 'object'
    ) {
      const session = payload.session;

      if (session.creds) {
        await this.writeJson(
          path.join(this.authDir, 'creds.json'),
          session.creds
        );
      }

      if (session.keys) {
        await this.restoreKeys(session.keys);
      }

      return;
    }

    throw new Error(
      'Unsupported SESSION_ID payload. Expected auth/creds/keys session data.'
    );
  }

  /**
   * Restore complete auth payload.
   */
  async restoreAuthPayload(auth) {
    if (auth.creds) {
      await this.writeJson(
        path.join(this.authDir, 'creds.json'),
        auth.creds
      );
    }

    if (auth.keys) {
      await this.restoreKeys(auth.keys);
    }
  }

  /**
   * Restore Baileys key data.
   */
  async restoreKeys(keys) {
    if (!keys || typeof keys !== 'object') {
      return;
    }

    const keysDir = path.join(
      this.authDir,
      'keys'
    );

    fs.mkdirSync(keysDir, {
      recursive: true
    });

    /*
     * If keys are already represented as files,
     * preserve them.
     */
    if (keys.files && typeof keys.files === 'object') {
      for (const [fileName, value] of Object.entries(
        keys.files
      )) {
        await this.writeJson(
          path.join(keysDir, fileName),
          value
        );
      }

      return;
    }

    /*
     * Otherwise store individual key records.
     */
    for (const [name, value] of Object.entries(keys)) {
      if (value === undefined) {
        continue;
      }

      const safeName = name.replace(
        /[^a-zA-Z0-9_.-]/g,
        '_'
      );

      await this.writeJson(
        path.join(keysDir, `${safeName}.json`),
        value
      );
    }
  }

  /**
   * Safely write JSON.
   */
  async writeJson(filePath, value) {
    const directory = path.dirname(filePath);

    await fs.promises.mkdir(directory, {
      recursive: true
    });

    await fs.promises.writeFile(
      filePath,
      JSON.stringify(value, null, 2),
      {
        encoding: 'utf8',
        mode: 0o600
      }
    );
  }

  /**
   * Create the Baileys socket.
   */
  async createSocket() {
    if (this.isStopping) {
      return null;
    }

    if (this.sock && this.status === 'connected') {
      log.info(
        'WA',
        'WhatsApp socket already connected'
      );

      return this.sock;
    }

    if (this.isStarting) {
      log.info(
        'WA',
        'WhatsApp connection is already starting'
      );

      return this.sock;
    }

    this.isStarting = true;
    this.status = 'connecting';

    try {
      this.ensureAuthDirectory();

      /*
       * Decode SESSION_ID only if creds are not already
       * restored. This prevents unnecessary overwrites
       * after reconnects.
       */
      const credsPath = path.join(
        this.authDir,
        'creds.json'
      );

      if (!fs.existsSync(credsPath)) {
        await this.prepareSession();
      }

      const {
        state,
        saveCreds
      } = await useMultiFileAuthState(
        this.authDir
      );

      this.authState = {
        state,
        saveCreds
      };

      const sock = makeWASocket({
        auth: state,

        browser: Browsers.ubuntu(
          this.config.botName || 'Tanu XAI'
        ),

        logger: this.logger,

        printQRInTerminal: false,

        markOnlineOnConnect: false,

        syncFullHistory: false,

        generateHighQualityLinkPreview: false
      });

      this.sock = sock;

      /*
       * Expose connection globally for existing commands
       * such as conncheck/debug.
       */
      this.updateGlobalConnection();

      /*
       * Authentication credentials update.
       */
      sock.ev.on(
        'creds.update',
        async () => {
          try {
            await saveCreds();
          } catch (error) {
            log.error(
              'WA',
              `Failed to save credentials: ${error.message}`
            );
          }
        }
      );

      /*
       * Connection state changes.
       */
      sock.ev.on(
        'connection.update',
        async (update) => {
          await this.handleConnectionUpdate(update);
        }
      );

      /*
       * Message activity.
       */
      sock.ev.on(
        'messages.upsert',
        async (event) => {
          this.lastActivity = Date.now();

          /*
           * Message dispatch is intentionally kept
           * separate from the connection manager.
           *
           * index.js can register the application's
           * message handler through setMessageHandler().
           */
          if (this.messageHandler) {
            try {
              await this.messageHandler(
                sock,
                event
              );
            } catch (error) {
              log.error(
                'MESSAGE',
                `Message handler error: ${error.message}`
              );
            }
          }
        }
      );

      /*
       * Message updates for anti-delete/anti-edit.
       */
      sock.ev.on(
        'messages.update',
        async (updates) => {
          if (this.messageUpdateHandler) {
            try {
              await this.messageUpdateHandler(
                sock,
                updates
              );
            } catch (error) {
              log.error(
                'MESSAGE',
                `Message update handler error: ${error.message}`
              );
            }
          }
        }
      );

      /*
       * Incoming calls.
       */
      sock.ev.on(
        'call',
        async (callData) => {
          if (this.callHandler) {
            try {
              await this.callHandler(
                sock,
                callData
              );
            } catch (error) {
              log.error(
                'CALL',
                `Call handler error: ${error.message}`
              );
            }
          }
        }
      );

      this.isStarting = false;

      this.updateGlobalConnection();

      return sock;
    } catch (error) {
      this.isStarting = false;
      this.status = 'disconnected';

      this.updateGlobalConnection();

      log.error(
        'WA',
        `Failed to create WhatsApp socket: ${error.message}`
      );

      throw error;
    }
  }

  /**
   * Handle Baileys connection.update.
   */
  async handleConnectionUpdate(update) {
    const {
      connection,
      lastDisconnect,
      qr
    } = update;

    if (qr) {
      log.info(
        'WA',
        'WhatsApp QR received. This build expects SESSION_ID authentication.'
      );
    }

    if (connection === 'connecting') {
      this.status = 'connecting';

      this.updateGlobalConnection();

      log.info(
        'WA',
        'Connecting to WhatsApp...'
      );

      return;
    }

    if (connection === 'open') {
      this.status = 'connected';

      this.user = this.sock?.user || null;

      this.startedAt =
        this.startedAt || Date.now();

      this.lastActivity = Date.now();

      this.reconnectAttempts = 0;

      this.reconnectStats.successful += 1;

      this.updateGlobalConnection();

      log.info(
        'WA',
        `WhatsApp connected as ${
          this.user?.id || 'unknown'
        }`
      );

      return;
    }

    if (connection === 'close') {
      this.status = 'disconnected';

      this.updateGlobalConnection();

      const statusCode =
        this.getDisconnectStatusCode(
          lastDisconnect
        );

      const loggedOut =
        statusCode ===
        DisconnectReason.loggedOut;

      const badSession =
        statusCode ===
        DisconnectReason.badSession;

      const connectionClosed =
        statusCode ===
        DisconnectReason.connectionClosed;

      const connectionLost =
        statusCode ===
        DisconnectReason.connectionLost;

      const timedOut =
        statusCode ===
        DisconnectReason.timedOut;

      const restartRequired =
        statusCode ===
        DisconnectReason.restartRequired;

      log.warn(
        'WA',
        `WhatsApp connection closed (code: ${statusCode ?? 'unknown'})`
      );

      /*
       * Logged out:
       *
       * Do NOT reconnect endlessly.
       */
      if (loggedOut) {
        log.error(
          'WA',
          'WhatsApp session is logged out. Reconnect stopped.'
        );

        await this.clearSocket();

        return;
      }

      /*
       * Bad session:
       *
       * Do NOT enter a reconnect loop with broken
       * credentials.
       */
      if (badSession) {
        log.error(
          'WA',
          'WhatsApp session is invalid/broken. Reconnect stopped.'
        );

        await this.clearSocket();

        return;
      }

      /*
       * Explicit shutdown/restart.
       */
      if (
        this.isStopping
      ) {
        await this.clearSocket();

        return;
      }

      /*
       * Restart-required normally means Baileys expects
       * a fresh socket.
       */
      if (restartRequired) {
        await this.scheduleReconnect(
          'restart required',
          true
        );

        return;
      }

      /*
       * Temporary connection failures.
       */
      if (
        connectionClosed ||
        connectionLost ||
        timedOut ||
        !statusCode
      ) {
        await this.scheduleReconnect(
          'temporary connection failure',
          false
        );

        return;
      }

      /*
       * Unknown errors get bounded reconnect attempts.
       */
      await this.scheduleReconnect(
        'unknown disconnect',
        false
      );
    }
  }

  /**
   * Extract DisconnectReason code.
   */
  getDisconnectStatusCode(lastDisconnect) {
    if (!lastDisconnect) {
      return null;
    }

    const error = lastDisconnect.error;

    if (!error) {
      return null;
    }

    if (error instanceof Boom) {
      return error.output?.statusCode ?? null;
    }

    if (error.output?.statusCode) {
      return error.output.statusCode;
    }

    return error.statusCode ?? null;
  }

  /**
   * Schedule bounded exponential-backoff reconnect.
   */
  async scheduleReconnect(
    reason,
    immediate = false
  ) {
    if (this.isStopping) {
      return;
    }

    if (this.reconnectTimer) {
      return;
    }

    if (
      this.reconnectAttempts >=
      this.maxReconnectAttempts
    ) {
      log.error(
        'WA',
        `Maximum reconnect attempts (${this.maxReconnectAttempts}) reached.`
      );

      return;
    }

    this.reconnectAttempts += 1;

    this.reconnectStats.attempts += 1;

    this.reconnectStats.lastAttempt =
      Date.now();

    /*
     * Exponential backoff:
     *
     * 2s
     * 4s
     * 8s
     * 16s
     * ...
     *
     * capped at 60 seconds.
     */
    const exponentialDelay =
      Math.min(
        60_000,
        2_000 *
          Math.pow(
            2,
            this.reconnectAttempts - 1
          )
      );

    const delay =
      immediate
        ? 1_000
        : exponentialDelay;

    log.warn(
      'WA',
      `Reconnect #${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${Math.round(
        delay / 1000
      )}s (${reason})`
    );

    this.reconnectTimer = setTimeout(
      async () => {
        this.reconnectTimer = null;

        if (this.isStopping) {
          return;
        }

        try {
          await this.clearSocket();

          await this.createSocket();
        } catch (error) {
          log.error(
            'WA',
            `Reconnect attempt failed: ${error.message}`
          );

          /*
           * Schedule the next retry.
           */
          await this.scheduleReconnect(
            'reconnect attempt failed',
            false
          );
        }
      },
      delay
    );
  }

  /**
   * Clear current socket listeners/reference.
   */
  async clearSocket() {
    if (this.sock) {
      try {
        /*
         * Baileys sockets don't need a custom destroy
         * sequence for every disconnect. Remove our
         * reference and let the old socket finish closing.
         */
        this.sock.ev.removeAllListeners();
      } catch {
        // Ignore listener cleanup failures.
      }
    }

    this.sock = null;
    this.authState = null;
    this.user = null;

    this.updateGlobalConnection();
  }

  /**
   * Update global connection information used by
   * existing commands.
   */
  updateGlobalConnection() {
    global.waConnection = {
      socket: this.sock,
      status: this.status,
      user: this.user,
      groups: this.groups,
      lastActivity: this.lastActivity,

      reconnectStats: {
        attempts: this.reconnectStats.attempts,
        successful: this.reconnectStats.successful,
        lastAttempt: this.reconnectStats.lastAttempt
      }
    };
  }

  /**
   * Register application message handler.
   */
  setMessageHandler(handler) {
    if (
      handler !== null &&
      typeof handler !== 'function'
    ) {
      throw new TypeError(
        'message handler must be a function or null'
      );
    }

    this.messageHandler = handler;
  }

  /**
   * Register messages.update handler.
   */
  setMessageUpdateHandler(handler) {
    if (
      handler !== null &&
      typeof handler !== 'function'
    ) {
      throw new TypeError(
        'message update handler must be a function or null'
      );
    }

    this.messageUpdateHandler = handler;
  }

  /**
   * Register call handler.
   */
  setCallHandler(handler) {
    if (
      handler !== null &&
      typeof handler !== 'function'
    ) {
      throw new TypeError(
        'call handler must be a function or null'
      );
    }

    this.callHandler = handler;
  }

  /**
   * Get current socket.
   */
  getSocket() {
    return this.sock;
  }

  /**
   * Get connection diagnostics.
   */
  getDiagnostics() {
    return {
      status: this.status,

      user: this.user,

      socket: this.sock
        ? {
            type: this.sock.type,
            readyState:
              this.sock.ws?.readyState ??
              this.sock.socket?.readyState ??
              'N/A',
            protocol:
              this.sock.ws?.protocol ??
              this.sock.socket?.protocol ??
              'N/A'
          }
        : null,

      reconnectStats: {
        ...this.reconnectStats
      },

      groups: this.groups,

      lastActivity:
        this.lastActivity,

      startedAt:
        this.startedAt
    };
  }

  /**
   * Gracefully shutdown connection manager.
   */
  async shutdown() {
    if (this.isStopping) {
      return;
    }

    this.isStopping = true;

    log.info(
      'SHUTDOWN',
      'Stopping WhatsApp connection manager...'
    );

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.sock) {
      try {
        this.sock.ev.removeAllListeners();
      } catch {
        // Ignore.
      }

      try {
        /*
         * Baileys exposes ws.close() in the underlying
         * socket implementation.
         */
        if (
          this.sock.ws &&
          typeof this.sock.ws.close === 'function'
        ) {
          this.sock.ws.close();
        }
      } catch {
        // Ignore close errors during shutdown.
      }
    }

    this.sock = null;
    this.status = 'disconnected';

    this.updateGlobalConnection();

    log.info(
      'SHUTDOWN',
      'WhatsApp connection manager stopped.'
    );
  }
}

/**
 * Factory.
 */
function createConnectionManager(options = {}) {
  return new ConnectionManager(options);
}

module.exports = {
  ConnectionManager,
  createConnectionManager
};

