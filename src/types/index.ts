import { proto, WASocket } from 'baileys';

export interface MessageContext {
  sock: WASocket;
  sender: string;
  chat: string;
  isGroup: boolean;
  isOwner: boolean;
  isSudo: boolean;
  isAdmin: boolean;
  isBotAdmin: boolean;
  text: string;
  command: string;
  args: string[];
  quoted?: proto.IWebMessageInfo;
  mentions?: string[];
  message: proto.IWebMessageInfo;
}

export interface CommandPlugin {
  name: string;
  category: string;
  description: string;
  usage: string;
  aliases?: string[];
  ownerOnly?: boolean;
  sudoOnly?: boolean;
  groupOnly?: boolean;
  botAdminRequired?: boolean;
  execute: (ctx: MessageContext) => Promise<void>;
}

export interface PluginRegistry {
  commands: Map<string, CommandPlugin>;
  categories: Set<string>;
}

export enum PermissionLevel {
  USER = 'USER',
  GROUP_ADMIN = 'GROUP_ADMIN',
  SUDO = 'SUDO',
  OWNER = 'OWNER'
}

export enum BotMode {
  PUBLIC = 'public',
  PRIVATE = 'private'
}

export interface BotConfig {
  prefix: string;
  botName: string;
  mode: BotMode;
  ownerNumber: string;
}

export interface ConnectionState {
  IDLE: 'IDLE';
  INITIALIZING: 'INITIALIZING';
  CONNECTING: 'CONNECTING';
  CONNECTED: 'CONNECTED';
  DISCONNECTED: 'DISCONNECTED';
  RECONNECTING: 'RECONNECTING';
  LOGGED_OUT: 'LOGGED_OUT';
}

export type ConnectionStateValue = keyof ConnectionState;

export interface DatabaseUser {
  id: string;
  phone_number: string;
  is_sudo: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseGroup {
  id: string;
  jid: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  is_admin: boolean;
  created_at: string;
}

export interface DatabaseBotSettings {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

export interface DatabaseSudoUser {
  id: string;
  phone_number: string;
  added_by: string;
  created_at: string;
}
