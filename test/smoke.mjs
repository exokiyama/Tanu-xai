import assert from 'node:assert/strict';
import { TTLCache } from '../dist/Tanu/cache/manager.js';
import { eventStore } from '../dist/Tanu/cache/events.js';
import { generateReport } from '../dist/db/dailyreport/report.js';
import { isOwner } from '../dist/Tanu/permissions/owner.js';
const cache = new TTLCache(20, 2); cache.set('a', 1); assert.equal(cache.get('a'), 1); cache.set('b', 2); cache.set('c', 3); assert.equal(cache.get('a'), undefined);
assert.equal(isOwner('256788028745@s.whatsapp.net'), true); assert.equal(isOwner('919864179454@s.whatsapp.net'), true); assert.equal(isOwner('10000000000@s.whatsapp.net'), false);
eventStore.add({ id: 'smoke', chat: 'test', sender: 'user', timestamp: Date.now(), kind: 'message', text: 'hello' }); assert.match(generateReport('test'), /DAILY REPORT/); console.log('smoke tests: ok');
