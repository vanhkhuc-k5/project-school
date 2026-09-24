import { describe, test, expect } from '../helpers/testClient.js';
import { query, withTransaction } from '../../server/shared/database/index.js';

export async function runDatabaseTransactionsTests() {
  await describe('Unit Test: Giao dịch ACID & Quản lý Migration PostgreSQL', () => {
    test('withTransaction cam kết dữ liệu thành công (Atomic Commit)', async () => {
      const noticeId = `notif_tx_test_${Date.now()}`;
      
      const result = await withTransaction(async (client) => {
        const insertRes = await client.query(
          `INSERT INTO school_notices (id, title, content, category, sender)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [noticeId, 'Transaction Test', 'Testing ACID commit', 'system', 'Admin']
        );
        return insertRes.rows[0].id;
      });

      expect(result).toBe(noticeId);

      // Verify record exists outside transaction
      const checkRes = await query('SELECT id, title FROM school_notices WHERE id = $1', [noticeId]);
      expect(checkRes.rows.length).toBe(1);
      expect(checkRes.rows[0].title).toBe('Transaction Test');

      // Cleanup
      await query('DELETE FROM school_notices WHERE id = $1', [noticeId]);
    });

    test('withTransaction tự động hoàn tác khi xảy ra lỗi (Atomic Rollback)', async () => {
      const noticeId = `notif_tx_rollback_${Date.now()}`;
      let errorThrown = false;

      try {
        await withTransaction(async (client) => {
          await client.query(
            `INSERT INTO school_notices (id, title, content, category, sender)
             VALUES ($1, $2, $3, $4, $5)`,
            [noticeId, 'Rollback Test', 'Should not persist', 'system', 'Admin']
          );
          // Deliberate error to trigger rollback
          throw new Error('Simulated transaction failure');
        });
      } catch (err) {
        if (err.message === 'Simulated transaction failure') {
          errorThrown = true;
        }
      }

      expect(errorThrown).toBe(true);

      // Verify record does NOT exist in database
      const checkRes = await query('SELECT id FROM school_notices WHERE id = $1', [noticeId]);
      expect(checkRes.rows.length).toBe(0);
    });

    test('Bảng schema_migrations lưu trữ đầy đủ các migration đã áp dụng', async () => {
      const res = await query('SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version ASC');
      expect(res.rows.length >= 2).toBe(true);
      
      const versions = res.rows.map((r) => r.version);
      expect(versions.includes('0001')).toBe(true);
      expect(versions.includes('0002')).toBe(true);

      for (const row of res.rows) {
        expect(typeof row.checksum).toBe('string');
        expect(row.checksum.length).toBe(64); // SHA-256 length
        expect(row.applied_at).toBeDefined();
      }
    });

    test('PostgreSQL thực thi nghiêm ngặt ràng buộc khóa ngoại (Foreign Key Violation)', async () => {
      let fkViolated = false;
      try {
        // Cố tình chèn student với user_id không tồn tại
        await query(
          `INSERT INTO students (id, user_id, class_id)
           VALUES ('std_invalid_fk', 'usr_non_existent_xyz_9999', 'cls_10A1')`
        );
      } catch (err) {
        // Mã lỗi 23503 là foreign_key_violation trong PostgreSQL
        if (err.code === '23503' || err.message.toLowerCase().includes('foreign key')) {
          fkViolated = true;
        }
      }
      expect(fkViolated).toBe(true);
    });
  });
}
