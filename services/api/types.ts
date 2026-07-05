export type AgeGroup = '2-4' | '5-7' | '8-10';

export type ContentType = 'story' | 'game' | 'video' | 'creative';

export type UserRole = 'parent' | 'child' | 'admin' | null;

export interface Profile {
  id: string;
  role: UserRole;
  parent_id?: string;
  family_id?: string;
  full_name: string;
  age_group?: AgeGroup;
  unlock_pin_hash?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  // 'session' = real Supabase auth session (parent). 'pairing' = headless
  // child device identified only via usePairingStore's local pairing state
  // (no auth.uid() ever exists for these). null = unauthenticated.
  authSource: 'session' | 'pairing' | null;
  role: UserRole;
  token: string | null;
  parentData: {
    id: string;
    name: string;
    email: string;
    familyId: string;
  } | null;
  childData: {
    id: string;
    name: string;
    familyId: string;
    ageGroup: AgeGroup | null;
  } | null;
  children: Array<{
    id: string;
    name: string;
    age_group: AgeGroup;
    is_active: boolean;
  }>;
}

export type ContentStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'flagged';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationRuleOutcome {
  rule_name: string;
  passed: boolean;
  severity: ValidationSeverity;
  message: string;
}

export interface ValidationReport {
  id: string;
  content_id: string;
  run_number: number;
  triggered_by: 'submission' | 'revalidation';
  passed: boolean;
  rule_outcomes: ValidationRuleOutcome[];
  created_at: string;
}

export interface ReviewRecord {
  id: string;
  content_id: string;
  admin_id: string;
  decision: 'approved' | 'rejected';
  reason: string | null;
  created_at: string;
}

export interface ConsumePairingTokenResult {
  success: boolean;
  child_id: string | null;
  family_id: string | null;
  error: 'invalid_token' | 'parent_not_found' | 'rpc_error' | null;
}

export interface ChildPairingState {
  child_id: string;
  family_id: string;
  parent_id: string;
  paired_at: string;
}

export interface QrPayload {
  token: string;
  family_id: string;
  expires_at: string;
}

export interface PairingToken {
  id: string;
  family_id: string;
  token: string;
  manual_code: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  child_id: string | null;
}

export interface PairingResult {
  token: PairingToken | null;
  displayCode: string | null;
  error: string | null;
}

export type SourceType = 'owned' | 'youtube';

export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  category: string;
  min_age: number;
  max_age: number;
  url?: string;
  thumbnail_url: string;
  created_at?: string;
  status?: ContentStatus;
  source_type?: SourceType;
  source_url?: string;
  sub_category?: string;
  content_text?: string;
  assets_url?: string;
  page_images?: string[];
}

export interface ChildContentPreference {
  id: string;
  child_id: string;
  content_id: string;
  enabled: boolean;
  added_by: 'system' | 'parent';
  updated_at: string;
}

export interface GameConfig {
  type: string;
  [key: string]: unknown;
}

export interface VideoItem extends ContentItem {
  type: 'video';
  duration_seconds?: number;
}

export interface StoryItem extends ContentItem {
  type: 'story';
  content_text?: string;
}

export interface ActivityItem extends ContentItem {
  type: 'creative';
  assets_url?: string;
}

export interface GameItem extends ContentItem {
  type: 'game';
  game_type?: string;
  config_json?: GameConfig;
}

export interface Category {
  id: string;
  name: string;
  icon_url?: string | null;
  created_at: string;
}

export type ContentItemExtended = VideoItem | StoryItem | ActivityItem | GameItem;

export interface CategoryPreference {
  parent_id: string;
  child_id: string;
  category: string;
  is_allowed: boolean;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  isOffline: boolean;
  isLoading: boolean;
}

export interface AdminContentInput {
  title: string;
  type: ContentType;
  category: string;
  min_age: number;
  max_age: number;
  thumbnail_url: string;
  url?: string;
  duration_seconds?: number;
  content_text?: string;
  assets_url?: string;
  game_type?: string;
  config_json?: GameConfig;
}

export type AdminContentUpdate = Omit<AdminContentInput, 'type'>;

export interface AdminCategoryInput {
  name: string;
  icon_url?: string;
}

export interface AdminListQuery {
  page: number;
  typeFilter?: ContentType;
  titleSearch?: string;
}

export interface AdminContentListResponse {
  items: ContentItemExtended[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PinLockoutState {
  failCount: number;
  lockUntil: number | null;
}

export type ReportRange = 'today' | 'week' | 'month';

export interface DailyStats {
  id: string;
  child_id: string;
  stat_date: string; // ISO format: 'YYYY-MM-DD'
  total_seconds: number;
  stories_seconds: number;
  games_seconds: number;
  videos_seconds: number;
  creative_seconds: number;
  session_count: number;
  top_activity: string | null;
  timezone_offset_minutes: number;
  is_finalized: boolean;
}

export interface ComparisonData {
  childA: { id: string; name: string; stats: DailyStats[] };
  childB: { id: string; name: string; stats: DailyStats[] };
  normalizedMax: number;
}
