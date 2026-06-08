export type AgeGroup = '2-4' | '5-7' | '8-10';

export type ContentType = 'story' | 'game' | 'video' | 'creative';

export type UserRole = 'parent' | 'child' | null;

export interface Profile {
  id: string;
  role: UserRole;
  parent_id?: string;
  full_name: string;
  age_group?: AgeGroup;
  unlock_pin_hash?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
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
    ageGroup: AgeGroup;
  } | null;
  children: Array<{
    id: string;
    name: string;
    age_group: AgeGroup;
    is_active: boolean;
  }>;
}

export interface ContentItem {
  id: string;
  title: string;
  type: ContentType;
  category: string;
  min_age: number;
  max_age: number;
  url?: string;
  thumbnail_url: string;
}

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
