import type { proto, WASocket } from '@whiskeysockets/baileys';

export type Permission = 'user' | 'admin' | 'sudo' | 'owner';
export type Category = 'ai' | 'owner' | 'group' | 'protection' | 'status' | 'download' | 'sticker' | 'media' | 'reaction' | 'fun' | 'game' | 'economy' | 'search' | 'tools' | 'settings';
export interface CommandContext { sock: WASocket; message: proto.IWebMessageInfo; chat: string; sender: string; text: string; args: string[]; command: string; mentions: string[]; quoted?: proto.IWebMessageInfo; isGroup: boolean; isOwner: boolean; isSudo: boolean; isAdmin: boolean; isBotAdmin: boolean; }
export interface CommandDefinition { name: string; aliases?: string[]; category: Category; description: string; usage?: string; permissions?: Permission[]; cooldown?: number; groupOnly?: boolean; privateOnly?: boolean; ownerOnly?: boolean; adminOnly?: boolean; enabled?: boolean; handler: (ctx: CommandContext) => Promise<void>; }
export interface BotSettings { name: string; prefix: string; mode: 'public' | 'private'; watermark: string; packname: string; author: string; menustyle: 'classic' | 'minimal' | 'premium'; menuCaption?: string; menuImage?: string; repositoryUrl?: string; websiteUrl?: string; channelUrl?: string; supportUrl?: string; reportEmail?: string; reportTime?: string; }
export const PERMANENT_OWNERS = Object.freeze([{ name: 'Arman HTX', number: '256788028745', role: 'Professional Dev' }, { name: 'Tanu Darling', number: '919864179454', role: "Owner's Owner and Wife" }]);
