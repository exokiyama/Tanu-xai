import { rm } from 'node:fs/promises';
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
export function assertMediaSize(bytes: number) { if (!Number.isFinite(bytes) || bytes < 0 || bytes > MAX_MEDIA_BYTES) throw new Error('Media exceeds the configured 50MB limit'); }
export async function cleanupTemp(path: string) { await rm(path, { force: true }).catch(() => undefined); }
