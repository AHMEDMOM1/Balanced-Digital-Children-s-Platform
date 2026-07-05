// Command types that can be sent from parent to child
export type CommandType = 'pause' | 'resume' | 'time_update' | 'category_block' | 'force_end' | 'settings_sync';

// The command payload sent via Supabase Broadcast AND stored in realtime_commands table
export interface RealtimeCommand {
  command_id: string;       // UUID
  command_type: CommandType;
  sender_id: string;        // parent profile UUID
  child_id: string | null;  // target child UUID, null = all children
  payload: Record<string, any>;
  created_at: string;       // ISO 8601 timestamp
}

// Heartbeat sent from child to parent every 30 seconds
export interface HeartbeatEvent {
  child_id: string;
  timestamp: string;        // ISO 8601
  session_active: boolean;
  elapsed_seconds: number;
  current_activity?: 'story' | 'game' | 'video' | 'creative';
  current_content_id?: string;
}

// Acknowledgement sent from child to parent after applying a command
export interface CommandAckEvent {
  command_id: string;
  child_id: string;
  acknowledged_at: string;  // ISO 8601
}

// Payload shapes for specific command types
export interface TimeUpdatePayload {
  remaining_minutes: number;
}

export interface CategoryBlockPayload {
  category: string;
  is_allowed: boolean;
}

export interface SettingsSyncPayload {
  daily_limit_minutes?: number;
  stories_enabled?: boolean;
  games_enabled?: boolean;
  creative_enabled?: boolean;
  videos_enabled?: boolean;
}
