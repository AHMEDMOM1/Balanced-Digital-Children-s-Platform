import { getClient } from './api/client';
import { AuthState, Profile, AgeGroup, UserRole } from './api/types';

const STORAGE_KEYS = {
  AUTH_STATE: '@safeplay_auth_state',
};

export async function loadAuthState(): Promise<AuthState> {
  const supabase = getClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user) {
    return getUnauthenticatedState();
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !profile) {
      return getUnauthenticatedState();
    }

    return buildAuthStateFromSession(session.access_token, profile);
  } catch {
    return getUnauthenticatedState();
  }
}

function getUnauthenticatedState(): AuthState {
  return {
    isAuthenticated: false,
    role: null,
    token: null,
    parentData: null,
    childData: null,
    children: [],
  };
}

async function buildAuthStateFromSession(token: string, profile: Profile): Promise<AuthState> {
  const supabase = getClient();
  const isParent = profile.role === 'parent';

  let childrenList: any[] = [];
  if (isParent) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, age_group')
      .eq('parent_id', profile.id)
      .eq('role', 'child');

    childrenList = (data || []).map(c => ({
      id: c.id,
      name: c.full_name,
      age_group: c.age_group as AgeGroup,
      is_active: true
    }));
  }

  return {
    isAuthenticated: true,
    role: profile.role,
    token,
    parentData: isParent ? {
      id: profile.id,
      name: profile.full_name,
      email: (await supabase.auth.getUser()).data.user?.email || '',
      familyId: profile.id,
    } : null,
    childData: !isParent ? {
      id: profile.id,
      name: profile.full_name,
      familyId: profile.parent_id || '',
      ageGroup: profile.age_group as AgeGroup,
    } : null,
    children: childrenList,
  };
}

export async function signInWithOtp(email: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true
    }
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function verifyOtp(email: string, token: string): Promise<AuthState> {
  const supabase = getClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email'
  });

  if (error || !data.session) {
    throw new Error(error?.message || 'OTP verification failed');
  }

  let profile: Profile | null = null;
  for (let i = 0; i < 5; i++) {
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.session.user.id)
      .single();
    if (p) {
      profile = p;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  if (!profile) {
    throw new Error('User profile record could not be fetched.');
  }

  return buildAuthStateFromSession(data.session.access_token, profile);
}

export type { AuthState, Profile, AgeGroup, UserRole } from './api/types';

export async function logout(): Promise<void> {
  const supabase = getClient();
  await supabase.auth.signOut();
}

export async function generateFamilyCode(): Promise<{ code: string; expiresAt: string }> {
  const supabase = getClient();
  const { data: code, error } = await supabase.rpc('generate_family_code');

  if (error || !code) {
    throw new Error(error?.message || 'Could not generate family code');
  }

  return {
    code,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
}

export async function redeemFamilyCode(code: string, childName: string, ageGroup: AgeGroup): Promise<AuthState> {
  const supabase = getClient();

  const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
  if (authError || !authData.session) {
    throw new Error(authError?.message || 'Child registration connection failed');
  }

  const { data, error } = await supabase.rpc('redeem_family_code', {
    p_code: code,
    p_child_name: childName,
    p_age_group: ageGroup
  });

  if (error || !data) {
    await supabase.auth.signOut();
    throw new Error(error?.message || 'Failed to redeem family code');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.session.user.id)
    .single();

  if (!profile) throw new Error('Child profile creation confirmation failed.');

  return buildAuthStateFromSession(authData.session.access_token, profile);
}

export async function verifyParentPin(pin: string): Promise<boolean> {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('unlock_pin_hash')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.unlock_pin_hash) return false;

  const hash = await hashPinSha256(pin);
  return profile.unlock_pin_hash === hash;
}

export async function updateParentPin(newPin: string): Promise<void> {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const pinHash = await hashPinSha256(newPin);

  const { error } = await supabase
    .from('profiles')
    .update({ unlock_pin_hash: pinHash })
    .eq('id', user.id);

  if (error) throw new Error(error.message);
}

async function hashPinSha256(pin: string): Promise<string> {
  const textAsBuffer = new TextEncoder().encode(pin);
  let hashBuffer;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    hashBuffer = await crypto.subtle.digest('SHA-256', textAsBuffer);
  } else {
    const sha256 = require('js-sha256').sha256;
    return sha256(pin);
  }
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
