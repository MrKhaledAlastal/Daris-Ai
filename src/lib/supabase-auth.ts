import { createClient } from '@supabase/supabase-js';

// احصل على هذه من Supabase Dashboard
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth functions
export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) throw error;
  return data.user;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data.user;
}

export async function signOut() {
  const { error } = await supabaseAuth.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const { error } = await supabaseAuth.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabaseAuth.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data, error } = await supabaseAuth.auth.getUser();
  if (error) throw error;
  return data.user;
}

export function onAuthStateChange(callback: (user: any) => void) {
  const subscription = supabaseAuth.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  }).data?.subscription;

  // Return unsubscribe function
  return () => {
    subscription?.unsubscribe();
  };
}

export async function signInWithGoogle() {
  const { data, error } = await supabaseAuth.auth.signInWithOAuth({
    provider: 'google',
    options: {
redirectTo: `${window.location.origin}/auth/callback`
    },
  });

  if (error) throw error;
  return data;
}

