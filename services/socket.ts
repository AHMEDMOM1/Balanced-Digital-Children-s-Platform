/**
 * @deprecated This socket stub is superseded by services/realtime/familyChannel.ts
 * which uses Supabase Realtime Channels. This file is kept for backward
 * compatibility but will be removed in a future release.
 *
 * Socket Service — Real-time communication stub.
...
 * WebSocket connectivity will be enabled in a later phase when the app
 * is running on physical devices.  For now all data flows through the
 * REST API layer (services/api.ts).
 *
 * The functions below are no-op stubs so the rest of the codebase can
 * import and call them without crashing.  When we add a compatible WS
 * library (e.g. native WebSocket or a React-Native-friendly Socket.IO
 * build) we will replace these stubs.
 */
import { getToken } from './api';

type EventCallback = (...args: any[]) => void;
const listeners: Map<string, Set<EventCallback>> = new Map();
let _connected = false;

/** Connect (no-op for now). */
export async function connectSocket(): Promise<any> {
    console.log('[Socket] Stub — skipping WebSocket connection (REST-only mode)');
    _connected = false;
    return null;
}

/** Disconnect (no-op). */
export function disconnectSocket() {
    _connected = false;
}

/** Get socket instance (always null in stub mode). */
export function getSocket(): any {
    return null;
}

/** Check connection status. */
export function isConnected(): boolean {
    return _connected;
}

/** Subscribe to event — stores callback for future use. */
export function onEvent(event: string, callback: EventCallback): () => void {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(callback);
    return () => { listeners.get(event)?.delete(callback); };
}

/** Emit event (no-op). */
export function emitEvent(event: string, _data?: any) {
    console.log(`[Socket] Stub emit: ${event}`);
}

// ── Typed helpers (all delegate to onEvent) ─────────────
export const onChildConnected      = (cb: EventCallback) => onEvent('child:connected', cb);
export const onChildDisconnected   = (cb: EventCallback) => onEvent('child:disconnected', cb);
export const onSessionStarted      = (cb: EventCallback) => onEvent('session:started', cb);
export const onSessionTick         = (cb: EventCallback) => onEvent('session:tick', cb);
export const onSessionEnded        = (cb: EventCallback) => onEvent('session:ended', cb);
export const onTimeWarning         = (cb: EventCallback) => onEvent('time:warning', cb);
export const onSettingsUpdated     = (cb: EventCallback) => onEvent('settings:updated', cb);
export const onSessionPause        = (cb: EventCallback) => onEvent('session:pause', cb);
export const onSessionForceEnd     = (cb: EventCallback) => onEvent('session:force-end', cb);
export const onContentToggle       = (cb: EventCallback) => onEvent('content:toggle', cb);
export const requestStatus         = () => emitEvent('status:request');
export const onStatusResponse      = (cb: EventCallback) => onEvent('status:response', cb);
