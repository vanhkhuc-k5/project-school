/**
 * Supabase Client (Deprecated / Transitional Stub)
 * Preserved for legacy routes until remaining domains are migrated to PostgreSQL.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from './config/env.js';

const supabaseUrl = config.SUPABASE_URL;
const supabaseKey = config.SUPABASE_KEY;

export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl &&
      supabaseKey &&
      supabaseUrl.startsWith('https://') &&
      !supabaseUrl.includes('your-project-id')
  );
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
