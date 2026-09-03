/**
 * AutomationManager - Centralized manager for all automation features
 * 
 * Handles:
 * - Auto-read messages
 * - Auto-online presence
 * - Auto-reply to triggers
 * - Auto-react to messages
 * - Auto-welcome/goodbye for group events
 * - Scheduled messages/tasks
 * 
 * IMPORTANT: This should be initialized ONCE in index.js
 */

import { getProtection, updateProtection } from './protection.js';

export class AutomationManager {
  constructor(sock, config, db) {
    this.sock = sock;
    this.config = config;
    this.db = db;
    this.initialized = false;
    
    // In-memory cache for automation configs (loaded from DB)
    this.automationConfigs = new Map();
    
    // Active intervals/timers
    this.activeIntervals = new Map();
    
    // Scheduled tasks (cron jobs)
    this.scheduledTasks = new Map();
    
    // Registered event listeners (to prevent duplicates)
    this.registeredListeners = new Set();
    
    // Auto-reply rules cache
    this.autoReplyRules = new Map();
    
    // Auto-react rules cache
    this.autoReactRules = new Map();
    
    // Rate limiting for automations
    this.lastAutoReply = new Map();
    this.lastAutoReact = new Map();
  }

  /**
   * Initialize all automations at startup
   * Should be called ONCE during bot startup
   */
  async initialize() {
    if (this.initialized) {
      console.log('[AutomationManager] Already initialized, skipping');
      return;
    }

    console.log('[AutomationManager] Initializing...');
    
    try {
      await this.loadAutomationConfig();
      this.registerEventListeners();
      await this.startScheduledJobs();
      
      this.initialized = true;
      console.log('[AutomationManager] Initialization complete');
    } catch (error) {
      console.error('[AutomationManager] Initialization error:', error.message);
    }
  }

  /**
   * Load automation configuration from database into memory
   */
  async loadAutomationConfig() {
    if (!this.db) {
      console.log('[AutomationManager] No database, using in-memory config');
      return;
    }

    try {
      // Load global automation settings
      const result = await this.db.query(`
        SELECT key, value FROM automation_config 
        WHERE scope = 'global'
      `);
      
      for (const row of result.rows) {
        this.automationConfigs.set(row.key, JSON.parse(row.value));
      }
      
      // Load auto-reply rules
      const replyRules = await this.db.query(`
        SELECT id, trigger_type, trigger_value, response, enabled 
        FROM auto_replies 
        WHERE active = true
      `);
      
      for (const rule of replyRules.rows) {
        this.autoReplyRules.set(rule.id, {
          id: rule.id,
          triggerType: rule.trigger_type,
          triggerValue: rule.trigger_value,
          response: rule.response,
          enabled: rule.enabled
        });
      }
      
      // Load auto-react rules
      const reactRules = await this.db.query(`
        SELECT id, trigger_type, trigger_value, emoji, enabled 
        FROM auto_reacts 
        WHERE active = true
      `);
      
      for (const rule of reactRules.rows) {
        this.autoReactRules.set(rule.id, {
          id: rule.id,
          triggerType: rule.trigger_type,
          triggerValue: rule.trigger_value,
          emoji: rule.emoji,
          enabled: rule.enabled
        });
      }
      
      console.log(`[AutomationManager] Loaded ${this.automationConfigs.size} configs, ${this.autoReplyRules.size} reply rules, ${this.autoReactRules.size} react rules`);
    } catch (error) {
      console.error('[AutomationManager] Failed to load config:', error.message);
    }
  }

  /**
   * Register ALL event listeners ONCE
   */
  registerEventListeners() {
    if (!this.sock || !this.sock.ev) {
      console.log('[AutomationManager] No socket, skipping event registration');
      return;
    }

    // Register messages.upsert listener ONCE
    if (!this.registeredListeners.has('messages.upsert')) {
      this.sock.ev.on('messages.upsert', async (msg) => {
        await this.handleMessage(msg);
      });
      this.registeredListeners.add('messages.upsert');
      console.log('[AutomationManager] Registered messages.upsert listener');
    }

    // Register presence.update listener ONCE
    if (!this.registeredListeners.has('presence.update')) {
      this.sock.ev.on('presence.update', async (update) => {
        await this.handlePresence(update);
      });
      this.registeredListeners.add('presence.update');
      console.log('[AutomationManager] Registered presence.update listener');
    }

    // Register group-participants.update listener ONCE
    if (!this.registeredListeners.has('group-participants.update')) {
      this.sock.ev.on('group-participants.update', async (update) => {
        await this.handleGroupParticipants(update);
      });
      this.registeredListeners.add('group-participants.update');
      console.log('[AutomationManager] Registered group-participants.update listener');
    }
  }

  /**
   * Handle incoming messages - fan out to relevant automations
   */
  async handleMessage(message) {
    if (!message || !message.messages || message.messages.length === 0) {
      return;
    }

    const msg = message.messages[0];
    if (!msg || !msg.key || !msg.key.remoteJid) {
      return;
    }

    const chatId = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const isGroup = chatId.endsWith('@g.us');
    const messageText = msg.message?.conversation || 
                       msg.message?.extendedTextMessage?.text || 
                       '';

    try {
      // Priority 1: Auto-read (silent, always first)
      await this.processAutoRead(chatId, msg, isGroup);

      // Priority 2: Auto-react (visual, non-intrusive)
      await this.processAutoReact(chatId, msg, messageText, isGroup, senderJid);

      // Priority 3: Auto-reply (text response)
      await this.processAutoReply(chatId, msg, messageText, isGroup, senderJid);

    } catch (error) {
      console.error('[AutomationManager] Message handler error:', error.message);
    }
  }

  /**
   * Process auto-read automation
   */
  async processAutoRead(chatId, message, isGroup) {
    const config = this.getAutomationState('autoread', isGroup ? chatId : null);
    
    if (!config || !config.enabled) {
      return;
    }

    try {
      // Don't auto-read our own messages
      if (message.key.fromMe) {
        return;
      }

      // Send read receipt
      await this.sock.sendReceipt({
        remoteJid: chatId,
        participant: message.key.participant,
        id: message.key.id
      }, 'read');
      
    } catch (error) {
      console.error('[AutomationManager] Auto-read error:', error.message);
    }
  }

  /**
   * Process auto-react automation
   */
  async processAutoReact(chatId, message, messageText, isGroup, senderJid) {
    // Check rate limit (max 5 reactions per minute per chat)
    const rateKey = `${chatId}`;
    const now = Date.now();
    const lastReact = this.lastAutoReact.get(rateKey) || [];
    const recentReacts = lastReact.filter(t => now - t < 60000);
    
    if (recentReacts.length >= 5) {
      return; // Rate limited
    }

    let matchedRule = null;
    
    // Check each auto-react rule
    for (const [id, rule] of this.autoReplyRules) {
      if (!rule.enabled) continue;
      
      if (this.matchesTrigger(messageText, rule.triggerType, rule.triggerValue)) {
        matchedRule = rule;
        break;
      }
    }

    if (matchedRule && matchedRule.emoji) {
      try {
        await this.sock.sendMessage(chatId, {
          react: {
            text: matchedRule.emoji,
            key: message.key
          }
        });
        
        this.lastAutoReact.set(rateKey, [...recentReacts, now]);
        
      } catch (error) {
        console.error('[AutomationManager] Auto-react error:', error.message);
      }
    }
  }

  /**
   * Process auto-reply automation
   */
  async processAutoReply(chatId, message, messageText, isGroup, senderJid) {
    // Check rate limit (max 1 reply per user per 10 seconds)
    const rateKey = `${senderJid}:${chatId}`;
    const now = Date.now();
    const lastReply = this.lastAutoReply.get(rateKey) || 0;
    
    if (now - lastReply < 10000) {
      return; // Rate limited
    }

    let matchedRule = null;
    
    // Check each auto-reply rule
    for (const [id, rule] of this.autoReplyRules) {
      if (!rule.enabled) continue;
      
      if (this.matchesTrigger(messageText, rule.triggerType, rule.triggerValue)) {
        matchedRule = rule;
        break;
      }
    }

    if (matchedRule && matchedRule.response) {
      try {
        // Process variables in response
        let response = matchedRule.response;
        response = response.replace('{sender}', `@${senderJid.split('@')[0]}`);
        response = response.replace('{time}', new Date().toLocaleTimeString());
        response = response.replace('{group}', isGroup ? chatId.split('@')[0] : 'PM');
        
        await this.sock.sendMessage(chatId, {
          text: response,
          mentions: isGroup ? [senderJid] : []
        }, {
          quoted: message
        });
        
        this.lastAutoReply.set(rateKey, now);
        
      } catch (error) {
        console.error('[AutomationManager] Auto-reply error:', error.message);
      }
    }
  }

  /**
   * Check if text matches a trigger
   */
  matchesTrigger(text, triggerType, triggerValue) {
    const lowerText = text.toLowerCase();
    const lowerTrigger = triggerValue.toLowerCase();
    
    switch (triggerType) {
      case 'exact':
        return lowerText === lowerTrigger;
      
      case 'contains':
        return lowerText.includes(lowerTrigger);
      
      case 'keyword':
        const keywords = lowerTrigger.split(',').map(k => k.trim());
        return keywords.some(kw => lowerText.includes(kw));
      
      case 'regex':
        try {
          const regex = new RegExp(triggerValue, 'i');
          return regex.test(text);
        } catch {
          return false;
        }
      
      default:
        return false;
    }
  }

  /**
   * Handle presence updates
   */
  async handlePresence(update) {
    // Handle always-online functionality
    const config = this.getAutomationState('alwaysonline', null);
    
    if (config && config.enabled) {
      // Already handled by interval in startScheduledJobs
    }
  }

  /**
   * Handle group participants updates (join/leave)
   */
  async handleGroupParticipants(update) {
    const { id, action, participants } = update;
    
    if (!id || !participants || participants.length === 0) {
      return;
    }

    const isGroup = id.endsWith('@g.us');
    if (!isGroup) {
      return;
    }

    try {
      for (const participant of participants) {
        if (action === 'add') {
          await this.processWelcome(id, participant);
        } else if (action === 'remove') {
          await this.processGoodbye(id, participant);
        }
      }
    } catch (error) {
      console.error('[AutomationManager] Group participants handler error:', error.message);
    }
  }

  /**
   * Process welcome message
   */
  async processWelcome(groupId, userJid) {
    const config = this.getAutomationState('welcome', groupId);
    
    if (!config || !config.enabled || !config.message) {
      return;
    }

    try {
      let message = config.message;
      message = message.replace('{user}', `@${userJid.split('@')[0]}`);
      message = message.replace('{mention}', userJid);
      message = message.replace('{group}', groupId.split('@')[0]);
      
      await this.sock.sendMessage(groupId, {
        text: message,
        mentions: [userJid]
      });
      
    } catch (error) {
      console.error('[AutomationManager] Welcome error:', error.message);
    }
  }

  /**
   * Process goodbye message
   */
  async processGoodbye(groupId, userJid) {
    const config = this.getAutomationState('goodbye', groupId);
    
    if (!config || !config.enabled || !config.message) {
      return;
    }

    try {
      let message = config.message;
      message = message.replace('{user}', `@${userJid.split('@')[0]}`);
      message = message.replace('{mention}', userJid);
      message = message.replace('{group}', groupId.split('@')[0]);
      
      await this.sock.sendMessage(groupId, {
        text: message,
        mentions: [userJid]
      });
      
    } catch (error) {
      console.error('[AutomationManager] Goodbye error:', error.message);
    }
  }

  /**
   * Start scheduled jobs (always-online, cleanup, etc.)
   */
  async startScheduledJobs() {
    // Clear any existing always-online interval
    if (this.activeIntervals.has('alwaysonline')) {
      clearInterval(this.activeIntervals.get('alwaysonline'));
      this.activeIntervals.delete('alwaysonline');
    }

    // Start always-online interval if enabled
    const config = this.getAutomationState('alwaysonline', null);
    if (config && config.enabled) {
      const intervalId = setInterval(async () => {
        try {
          await this.sock.sendPresenceUpdate('available');
        } catch (error) {
          console.error('[AutomationManager] Always-online error:', error.message);
        }
      }, 30000); // Every 30 seconds
      
      this.activeIntervals.set('alwaysonline', intervalId);
      console.log('[AutomationManager] Started always-online interval');
    }
  }

  /**
   * Enable/disable automation
   */
  async setAutomation(type, enabled, scope = 'global', scopeId = null, options = {}) {
    const config = {
      type,
      enabled,
      scope,
      scopeId,
      ...options
    };

    // Update in-memory cache
    const key = this.getConfigKey(type, scopeId);
    this.automationConfigs.set(key, config);

    // Persist to database
    if (this.db) {
      try {
        await this.db.query(`
          INSERT INTO automation_config (key, value, scope, scope_id, updated_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (key, scope_id) 
          DO UPDATE SET value = $2, updated_at = NOW()
        `, [key, JSON.stringify(config), scope, scopeId]);
      } catch (error) {
        console.error('[AutomationManager] Failed to persist config:', error.message);
      }
    }

    // Restart scheduled jobs if needed
    if (type === 'alwaysonline') {
      await this.startScheduledJobs();
    }

    return config;
  }

  /**
   * Get automation state for a specific scope
   */
  getAutomationState(type, scopeId = null) {
    // Priority: specific scope > global
    if (scopeId) {
      const specificKey = this.getConfigKey(type, scopeId);
      const specificConfig = this.automationConfigs.get(specificKey);
      if (specificConfig !== undefined) {
        return specificConfig;
      }
    }

    const globalKey = this.getConfigKey(type, null);
    return this.automationConfigs.get(globalKey) || null;
  }

  /**
   * Generate config key
   */
  getConfigKey(type, scopeId) {
    return scopeId ? `${type}:${scopeId}` : `${type}:global`;
  }

  /**
   * Add auto-reply rule
   */
  async addAutoReply(triggerType, triggerValue, response, scope = 'global', scopeId = null) {
    const rule = {
      triggerType,
      triggerValue,
      response,
      enabled: true
    };

    if (this.db) {
      try {
        const result = await this.db.query(`
          INSERT INTO auto_replies (trigger_type, trigger_value, response, scope, scope_id, active)
          VALUES ($1, $2, $3, $4, $5, true)
          RETURNING id
        `, [triggerType, triggerValue, response, scope, scopeId]);
        
        rule.id = result.rows[0].id;
        this.autoReplyRules.set(rule.id, rule);
        return rule;
      } catch (error) {
        console.error('[AutomationManager] Failed to add reply rule:', error.message);
        throw error;
      }
    } else {
      // In-memory only
      rule.id = Date.now().toString();
      this.autoReplyRules.set(rule.id, rule);
      return rule;
    }
  }

  /**
   * Remove auto-reply rule
   */
  async removeAutoReply(ruleId) {
    this.autoReplyRules.delete(ruleId);

    if (this.db) {
      try {
        await this.db.query(`
          UPDATE auto_replies SET active = false WHERE id = $1
        `, [ruleId]);
      } catch (error) {
        console.error('[AutomationManager] Failed to remove reply rule:', error.message);
      }
    }
  }

  /**
   * List auto-reply rules
   */
  listAutoReplyRules() {
    return Array.from(this.autoReplyRules.values());
  }

  /**
   * Add auto-react rule
   */
  async addAutoReact(triggerType, triggerValue, emoji, scope = 'global', scopeId = null) {
    const rule = {
      triggerType,
      triggerValue,
      emoji,
      enabled: true
    };

    if (this.db) {
      try {
        const result = await this.db.query(`
          INSERT INTO auto_reacts (trigger_type, trigger_value, emoji, scope, scope_id, active)
          VALUES ($1, $2, $3, $4, $5, true)
          RETURNING id
        `, [triggerType, triggerValue, emoji, scope, scopeId]);
        
        rule.id = result.rows[0].id;
        this.autoReactRules.set(rule.id, rule);
        return rule;
      } catch (error) {
        console.error('[AutomationManager] Failed to add react rule:', error.message);
        throw error;
      }
    } else {
      // In-memory only
      rule.id = Date.now().toString();
      this.autoReactRules.set(rule.id, rule);
      return rule;
    }
  }

  /**
   * Remove auto-react rule
   */
  async removeAutoReact(ruleId) {
    this.autoReactRules.delete(ruleId);

    if (this.db) {
      try {
        await this.db.query(`
          UPDATE auto_reacts SET active = false WHERE id = $1
        `, [ruleId]);
      } catch (error) {
        console.error('[AutomationManager] Failed to remove react rule:', error.message);
      }
    }
  }

  /**
   * List auto-react rules
   */
  listAutoReactRules() {
    return Array.from(this.autoReactRules.values());
  }

  /**
   * Set welcome message
   */
  async setWelcome(groupId, enabled, message) {
    return this.setAutomation('welcome', enabled, 'group', groupId, { message });
  }

  /**
   * Set goodbye message
   */
  async setGoodbye(groupId, enabled, message) {
    return this.setAutomation('goodbye', enabled, 'group', groupId, { message });
  }

  /**
   * Cleanup on shutdown
   */
  async shutdown() {
    console.log('[AutomationManager] Shutting down...');
    
    // Clear all intervals
    for (const [name, intervalId] of this.activeIntervals) {
      clearInterval(intervalId);
    }
    this.activeIntervals.clear();
    
    // Clear scheduled tasks
    for (const [name, task] of this.scheduledTasks) {
      if (task.stop) {
        task.stop();
      }
    }
    this.scheduledTasks.clear();
    
    this.initialized = false;
    console.log('[AutomationManager] Shutdown complete');
  }
}

// Singleton instance
let instance = null;

export function getAutomationManager(sock, config, db) {
  if (!instance) {
    instance = new AutomationManager(sock, config, db);
  }
  return instance;
}

export default AutomationManager;
