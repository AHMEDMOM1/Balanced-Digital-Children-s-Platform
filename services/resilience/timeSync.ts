import { getClient } from '../api/client';

class TimeSync {
  private cachedOffset: number = 0;
  private lastSyncAt: number = 0;
  private syncInFlight: Promise<number> | null = null;

  async fetchServerTime(): Promise<number> {
    const client = getClient();
    const { data, error } = await client.rpc('server_timestamp');
    if (error || !data) {
      return Date.now();
    }
    const serverMs = typeof data === 'number' ? data : new Date(data as string).getTime();
    this.cachedOffset = serverMs - Date.now();
    this.lastSyncAt = Date.now();
    return serverMs;
  }

  async sync(): Promise<number> {
    if (this.syncInFlight) return this.syncInFlight;
    this.syncInFlight = this.fetchServerTime().finally(() => {
      this.syncInFlight = null;
    });
    return this.syncInFlight;
  }

  getOffset(): number {
    return this.cachedOffset;
  }

  getServerAdjustedNow(): number {
    return Date.now() + this.cachedOffset;
  }

  getLastSyncAt(): number {
    return this.lastSyncAt;
  }

  getDriftSeconds(): number {
    return Math.round(this.cachedOffset / 1000);
  }
}

export const timeSync = new TimeSync();
