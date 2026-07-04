import { getClient } from './api/client';
import { AuthState, Profile, AgeGroup, UserRole } from './api/types';
import usePairingStore from '../store/usePairingStore';

const STORAGE_KEYS = {
  AUTH_STATE: '@safeplay_auth_state',
};

export async function loadAuthState(): Promise<AuthState> {
  const supabase = getClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user) {
    // The QR-paired child device never has a Supabase auth session — it's
    // intentionally headless (see consume_pairing_token's dropped FK to
    // auth.users). Fall back to the locally-persisted pairing state so
    // childData/role still populate (this is what RealtimeProvider,
    // (child)/_layout.tsx, and useSessionStore.tick() all key off of).
    const childState = await getChildPairingAuthState();
    return childState ?? getUnauthenticatedState();
  }

  if (session.user.app_metadata?.role === 'admin') {
    return {
      isAuthenticated: true,
      authSource: 'session',
      role: 'admin',
      token: session.access_token,
      parentData: null,
      childData: null,
      children: [],
    };
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

// Headless child identity, sourced entirely from local pairing state — no
// auth.uid() exists for this device, ever, so this can never come from a
// Supabase session. name/ageGroup are filled in lazily once a profile fetch
// (via the anon-callable get_child_profile RPC) succeeds elsewhere.
async function getChildPairingAuthState(): Promise<AuthState | null> {
  await usePairingStore.getState().loadPairingState();
  const { pairingState } = usePairingStore.getState();
  if (!pairingState) return null;

  return {
    isAuthenticated: true,
    authSource: 'pairing',
    role: 'child',
    token: null,
    parentData: null,
    childData: {
      id: pairingState.child_id,
      name: '',
      // family_id IS the parent's own id by this app's convention (see
      // buildAuthStateFromSession below) — use it rather than parent_id,
      // which child-scan.tsx historically saved as '' (now fixed there too,
      // but this avoids requiring already-paired devices to re-pair).
      familyId: pairingState.family_id || pairingState.parent_id,
      ageGroup: null,
    },
    children: [],
  };
}

// profiles.family_id defaults to a random UUID at creation time (DB-side),
// but every parent_*_pairing_tokens / sessions RLS policy and all app code
// assumes a parent's family_id equals their own id. Self-heal on every
// login/load so this never silently drifts again.
async function ensureParentFamilyId(profile: Profile): Promise<Profile> {
  if (profile.role !== 'parent' || profile.family_id === profile.id) return profile;
  const supabase = getClient();
  const { data: updated, error } = await supabase
    .from('profiles')
    .update({ family_id: profile.id })
    .eq('id', profile.id)
    .select()
    .single();
  if (error || !updated) {
    console.warn('[auth] ensureParentFamilyId failed', error?.message);
    return profile;
  }
  console.debug('[auth] ensureParentFamilyId corrected family_id', { id: profile.id });
  return updated as Profile;
}

function getUnauthenticatedState(): AuthState {
  return {
    isAuthenticated: false,
    authSource: null,
    role: null,
    token: null,
    parentData: null,
    childData: null,
    children: [],
  };
}

async function buildAuthStateFromSession(token: string, rawProfile: Profile): Promise<AuthState> {
  const supabase = getClient();
  const profile = await ensureParentFamilyId(rawProfile);
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
    authSource: 'session',
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

export async function updateParentName(fullName: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true };
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
