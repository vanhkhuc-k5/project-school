import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseKey && supabaseUrl.startsWith('https://') && !supabaseUrl.includes('your-project-id'));
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

if (isSupabaseConfigured()) {
  console.log('⚡ [Supabase] Đã cấu hình và kết nối tới Supabase Cloud:', supabaseUrl);
} else {
  console.log('ℹ️ [Supabase] Chưa phát hiện cấu hình Supabase URL/Key trong .env. Sử dụng cơ sở dữ liệu SQLite cục bộ.');
}
