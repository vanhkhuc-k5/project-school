import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const isPostgresConfigured = () => {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'));
};

export const pool = isPostgresConfigured()
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30000,
    })
  : null;

if (isPostgresConfigured()) {
  console.log('⚡ [Neon PostgreSQL] Đã cấu hình và kết nối tới Neon Cloud Database.');
} else {
  console.log('ℹ️ [Neon PostgreSQL] Chưa cấu hình DATABASE_URL trong .env.');
}

/**
 * Thực thi câu truy vấn SQL trên PostgreSQL (Neon)
 * @param {string} text - Câu lệnh SQL (dùng $1, $2 thay cho ?)
 * @param {Array} params - Mảng tham số
 */
export async function query(text, params = []) {
  if (!pool) {
    throw new Error('PostgreSQL Pool is not configured');
  }
  return pool.query(text, params);
}
