'use strict';

const { readFile, writeFile, mkdir } = require('fs/promises');
const { existsSync } = require('fs');
const { join, dirname } = require('path');

const PROTECTION_CONFIG_PATH = join(
    __dirname,
    '../../data/protection-config.json'
);

/**
 * Protection configuration manager
 * Handles reading/writing protection settings with persistence
 */

// Default configuration
const DEFAULT_CONFIG = {
    antidelete: {
        enabled: false,
        scope: 'g'
    },

    antivv: {
        enabled: false,
        scope: 'g'
    },

    antiedit: {
        enabled: false,
        scope: 'g'
    },

    antilink: {
        enabled: false,
        groupOnly: true,
        whitelist: []
    },

    antibadword: {
        enabled: false,
        groupOnly: true,
        words: [],
        action: 'warn'
    },

    antibot: {
        enabled: false,
        groupOnly: true,
        ignoreAdmins: true
    },

    antispam: {
        enabled: false,
        threshold: 10,
        windowMs: 5000,
        action: 'mute'
    },

    pmProtection: {
        enabled: false,
        allowContacts: true,
        allowGroups: true
    },

    callReject: {
        enabled: false,
        allowContacts: true
    },

    warnSystem: {
        enabled: true,
        maxWarns: 3,
        action: 'kick'
    }
};

let configCache = null;

/**
 * Load protection configuration from file
 */
async function loadProtectionConfig() {
    try {
        if (configCache) {
            return configCache;
        }

        if (!existsSync(PROTECTION_CONFIG_PATH)) {
            configCache = {
                ...DEFAULT_CONFIG
            };

            await saveProtectionConfig(configCache);

            return configCache;
        }

        const data = await readFile(
            PROTECTION_CONFIG_PATH,
            'utf8'
        );

        const parsed = JSON.parse(data);

        configCache = {
            ...DEFAULT_CONFIG,
            ...parsed
        };

        return configCache;

    } catch (error) {
        console.error(
            '[ProtectionConfig] Failed to load config:',
            error.message
        );

        configCache = {
            ...DEFAULT_CONFIG
        };

        return configCache;
    }
}

/**
 * Save protection configuration to file
 */
async function saveProtectionConfig(config) {
    try {
        const configDir = dirname(PROTECTION_CONFIG_PATH);

        if (!existsSync(configDir)) {
            await mkdir(configDir, {
                recursive: true
            });
        }

        configCache = config;

        await writeFile(
            PROTECTION_CONFIG_PATH,
            JSON.stringify(config, null, 2),
            'utf8'
        );

        return true;

    } catch (error) {
        console.error(
            '[ProtectionConfig] Failed to save config:',
            error.message
        );

        return false;
    }
}

/**
 * Get a specific protection setting
 */
async function getProtection(key) {
    const config = await loadProtectionConfig();

    return config[key] || DEFAULT_CONFIG[key];
}

/**
 * Update a specific protection setting
 */
async function updateProtection(key, value) {
    const config = await loadProtectionConfig();

    if (!DEFAULT_CONFIG[key]) {
        throw new Error(`Unknown protection key: ${key}`);
    }

    config[key] = {
        ...DEFAULT_CONFIG[key],
        ...(value || {})
    };

    await saveProtectionConfig(config);

    return config[key];
}

/**
 * Check if a protection is enabled for a given context
 */
async function isProtectionEnabled(key, context = {}) {
    const {
        isGroup = false,
        isBotAdmin = false,
        senderJid,
        chatId,
        isOwner = false,
        isSudo = false
    } = context;

    const setting = await getProtection(key);

    if (!setting?.enabled) {
        return false;
    }

    // Group-only protection
    if (setting.groupOnly && !isGroup) {
        return false;
    }

    // Bot admin requirement
    if (
        setting.groupOnly &&
        setting.requireBotAdmin &&
        !isBotAdmin
    ) {
        return false;
    }

    // Scope handling
    if (setting.scope) {
        const scope = String(setting.scope)
            .toLowerCase()
            .trim();

        if (scope === 'off') {
            return false;
        }

        if (scope === 'on' || scope === 'all') {
            return true;
        }

        /*
         * Group scope
         */
        if (
            scope.includes('g') &&
            isGroup &&
            !scope.includes('no-gm')
        ) {
            return true;
        }

        /*
         * Private / PM scope
         */
        if (
            scope.includes('p') &&
            !isGroup &&
            !scope.includes('no-pm')
        ) {
            return true;
        }

        /*
         * Owner / sudo targeted scope
         */
        if (
            scope.includes('p') &&
            (isOwner || isSudo)
        ) {
            return true;
        }

        /*
         * PM only
         */
        if (
            scope.includes('pm') &&
            !isGroup
        ) {
            return true;
        }

        /*
         * Group only
         */
        if (
            scope.includes('gm') &&
            isGroup
        ) {
            return true;
        }

        /*
         * Exclude PM
         */
        if (
            scope.includes('no-pm') &&
            isGroup
        ) {
            return true;
        }

        /*
         * Exclude groups
         */
        if (
            scope.includes('no-gm') &&
            !isGroup
        ) {
            return true;
        }

        /*
         * Specific JID targeting
         */
        if (scope.includes('@')) {
            const targetJids = scope
                .split(',')
                .map(item => item.trim())
                .filter(item => item.includes('@'));

            if (
                targetJids.includes(chatId) ||
                targetJids.includes(senderJid)
            ) {
                return true;
            }
        }

        return false;
    }

    return true;
}

/**
 * Parse protection scope string
 */
function parseProtectionScope(scopeStr) {
    if (!scopeStr) {
        return {
            type: 'default',
            values: []
        };
    }

    const scope = String(scopeStr)
        .toLowerCase()
        .trim();

    if (scope === 'off') {
        return {
            type: 'disabled',
            values: []
        };
    }

    if (
        scope === 'on' ||
        scope === 'all'
    ) {
        return {
            type: 'all',
            values: ['g', 'p']
        };
    }

    const values = [];
    const types = [];

    if (scope.includes('g')) {
        types.push('group');
    }

    if (scope.includes('p')) {
        types.push('private');
    }

    if (scope.includes('pm')) {
        types.push('pm-only');
    }

    if (scope.includes('gm')) {
        types.push('group-only');
    }

    if (scope.includes('no-pm')) {
        types.push('exclude-pm');
    }

    if (scope.includes('no-gm')) {
        types.push('exclude-group');
    }

    // Extract WhatsApp JIDs
    const jidRegex =
        /([0-9]{5,16}@[sg]\.whatsapp\.net)/g;

    const jids = scope.match(jidRegex) || [];

    if (jids.length > 0) {
        values.push(...jids);
        types.push('jid-targeted');
    }

    return {
        type: types.join('-') || 'custom',
        values: [...new Set(values)]
    };
}

/**
 * Reset a protection to default settings
 */
async function resetProtection(key) {
    const config = await loadProtectionConfig();

    if (!DEFAULT_CONFIG[key]) {
        throw new Error(`Unknown protection key: ${key}`);
    }

    config[key] = {
        ...DEFAULT_CONFIG[key]
    };

    await saveProtectionConfig(config);

    return config[key];
}

/**
 * Get all protection settings
 */
async function getAllProtections() {
    return loadProtectionConfig();
}

/**
 * Clear in-memory configuration cache
 */
function clearProtectionCache() {
    configCache = null;
}

/**
 * Get protection config file path
 */
function getProtectionConfigPath() {
    return PROTECTION_CONFIG_PATH;
}

module.exports = {
    DEFAULT_CONFIG,
    loadProtectionConfig,
    saveProtectionConfig,
    getProtection,
    updateProtection,
    isProtectionEnabled,
    parseProtectionScope,
    resetProtection,
    getAllProtections,
    clearProtectionCache,
    getProtectionConfigPath
};
