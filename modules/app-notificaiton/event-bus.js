import { EventEmitter } from 'events';

// ─── Shared event bus (singleton) ───────────────────────────────────────────
// Kono module notification pathaite chaile eventBus.emit() koro,
// listener.js shunbe ar notification create korbe.
// Controller er notification logic janar dorkar nai.

class AppEventBus extends EventEmitter {}

export const eventBus = new AppEventBus();
eventBus.setMaxListeners(50);