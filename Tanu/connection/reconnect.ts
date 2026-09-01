import { connectionManager } from './manager.js';
export const reconnect = () => connectionManager.start();
