import { config, normalizePhoneNumber } from '../config/index.js';

class PermissionService {
  private ownerNumber: string;
  private sudoCache: Set<string> = new Set();
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 60000;

  constructor() {
    this.ownerNumber = normalizePhoneNumber(config.ownerNumber);
  }

  isOwner(phone: string): boolean {
    const normalized = normalizePhoneNumber(phone);
    return normalized === this.ownerNumber;
  }

  async isSudo(phone: string): Promise<boolean> {
    const normalized = normalizePhoneNumber(phone);
    
    if (this.isOwner(normalized)) {
      return true;
    }

    const now = Date.now();
    if (now - this.cacheTimestamp < this.CACHE_TTL) {
      return this.sudoCache.has(normalized);
    }

    await this.refreshSudoCache();
    return this.sudoCache.has(normalized);
  }

  async refreshSudoCache(): Promise<void> {
    try {
      const { db } = await import('../database/index.js');
      
      if (!db.isConnected()) {
        return;
      }

      const client = db.getClient();
      if (!client) return;

      const { data, error } = await client
        .from('sudo_users')
        .select('phone_number');

      if (error) throw error;

      this.sudoCache.clear();
      if (data) {
        data.forEach(user => {
          this.sudoCache.add(normalizePhoneNumber(user.phone_number));
        });
      }

      this.cacheTimestamp = Date.now();
    } catch (error: any) {
      console.error('[PERMISSION] Failed to refresh sudo cache', { error: error.message });
    }
  }

  async addSudo(phone: string): Promise<boolean> {
    try {
      const { db } = await import('../database/index.js');
      
      if (!db.isConnected()) {
        return false;
      }

      const client = db.getClient();
      if (!client) return false;

      const normalized = normalizePhoneNumber(phone);
      
      const { error } = await client
        .from('sudo_users')
        .insert({ phone_number: normalized, added_by: this.ownerNumber });

      if (error) throw error;

      await this.refreshSudoCache();
      return true;
    } catch (error: any) {
      console.error('[PERMISSION] Failed to add sudo user', { error: error.message });
      return false;
    }
  }

  async removeSudo(phone: string): Promise<boolean> {
    try {
      const { db } = await import('../database/index.js');
      
      if (!db.isConnected()) {
        return false;
      }

      const client = db.getClient();
      if (!client) return false;

      const normalized = normalizePhoneNumber(phone);
      
      const { error } = await client
        .from('sudo_users')
        .delete()
        .eq('phone_number', normalized);

      if (error) throw error;

      await this.refreshSudoCache();
      return true;
    } catch (error: any) {
      console.error('[PERMISSION] Failed to remove sudo user', { error: error.message });
      return false;
    }
  }

  async getSudoUsers(): Promise<string[]> {
    await this.refreshSudoCache();
    return Array.from(this.sudoCache);
  }

  isInGroup(phone: string, groupJid: string): boolean {
    return true;
  }
}

export const permissions = new PermissionService();
