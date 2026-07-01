import { EventEmitter } from 'events';

// Shared event bus — the nervous system of ARIA
// All agents, blockchain listeners, and schedulers publish events here
// The SSE stream endpoint subscribes and pushes to connected browser clients
class AriaEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Support many concurrent SSE clients
  }
}

export const sseEmitter = new AriaEventEmitter();
