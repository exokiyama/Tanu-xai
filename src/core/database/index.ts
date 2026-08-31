import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import { createModuleLogger } from '../logger/index.js';

const log = createModuleLogger('DB');

class DatabaseService {
  private client: SupabaseClient | null = null;
  private connected: boolean = false;

  async connect(): Promise<boolean> {
    if (!config.supabaseUrl || !config.supabaseKey) {
      log.warn('Supabase credentials not configured, running without database');
      return false;
    }

    try {
      this.client = createClient(config.supabaseUrl, config.supabaseKey);
      
      const { error } = await this.client.from('bot_settings').select('id').limit(1);
      
      if (error) {
        throw error;
      }

      this.connected = true;
      log.info('Connected to Supabase');
      return true;
    } catch (error: any) {
      log.error('Failed to connect to Supabase', { error: error.message });
      this.connected = false;
      return false;
    }
  }

  getClient(): SupabaseClient | null {
    return this.client;
  }

  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.connected = false;
    log.info('Disconnected from Supabase');
  }

  async reconnect(): Promise<boolean> {
    log.info('Attempting to reconnect to Supabase...');
    return await this.connect();
  }
}

export const db = new DatabaseService();
