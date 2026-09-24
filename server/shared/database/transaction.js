/**
 * Atomic Transaction Manager
 * Wraps database operations in a PostgreSQL transaction (BEGIN / COMMIT / ROLLBACK).
 */

import { pool } from './connection.js';

/**
 * Executes a callback within a managed database transaction.
 * Automatically handles BEGIN, COMMIT, ROLLBACK, and releasing the client.
 *
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} callback
 * @returns {Promise<T>}
 */
export async function withTransaction(callback) {
  if (!pool) {
    throw new Error('[TRANSACTION] Cannot execute transaction: PostgreSQL connection pool is not configured.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
