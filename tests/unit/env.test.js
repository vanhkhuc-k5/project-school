import { describe, test, expect, api } from '../helpers/testClient.js';
import { validateEnv } from '../../server/config/env.js';

export async function runEnvUnitTests() {
  await describe('Unit Test: Cấu hình Môi trường & Quản lý Bí mật (Environment Hardening)', () => {
    test('Nạp safe defaults an toàn khi chạy môi trường dev/test', () => {
      const mockEnv = {
        NODE_ENV: 'test',
        PORT: '5001',
      };
      const cfg = validateEnv(mockEnv);
      expect(cfg.NODE_ENV).toBe('test');
      expect(cfg.IS_TEST).toBe(true);
      expect(cfg.PORT).toBe(5001);
      expect(typeof cfg.JWT_SECRET).toBe('string');
      expect(cfg.JWT_SECRET.length >= 32).toBe(true);
      expect(cfg.BCRYPT_ROUNDS).toBe(4); // Test env uses faster 4 rounds
    });

    test('Ném lỗi Critical khi thiếu JWT_SECRET trong môi trường production', () => {
      let threw = false;
      try {
        validateEnv({
          NODE_ENV: 'production',
        });
      } catch (err) {
        threw = true;
        expect(err.message).toContain('JWT_SECRET must be explicitly set');
      }
      expect(threw).toBe(true);
    });

    test('Ném lỗi khi JWT_SECRET có độ dài dưới 32 ký tự trong production', () => {
      let threw = false;
      try {
        validateEnv({
          NODE_ENV: 'production',
          JWT_SECRET: 'short_weak_secret_key',
        });
      } catch (err) {
        threw = true;
        expect(err.message).toContain('must have at least 32 characters');
      }
      expect(threw).toBe(true);
    });

    test('Từ chối dev fallback secret trong môi trường production', () => {
      let threw = false;
      try {
        validateEnv({
          NODE_ENV: 'production',
          JWT_SECRET: 'dev_jwt_secret_for_local_testing_only_32char',
        });
      } catch (err) {
        threw = true;
        expect(err.message).toContain('cannot use a known fallback key');
      }
      expect(threw).toBe(true);
    });

    test('Từ chối chuỗi kết nối DATABASE_URL không phải giao thức postgresql', () => {
      let threw = false;
      try {
        validateEnv({
          NODE_ENV: 'development',
          DATABASE_URL: 'mysql://root:password@localhost:3306/school',
        });
      } catch (err) {
        threw = true;
        expect(err.message).toContain('DATABASE_URL must start with "postgres://" or "postgresql://"');
      }
      expect(threw).toBe(true);
    });

    test('Kiểm tra tiêu cực: Backdoor admin@2026 bị triệt tiêu hoàn toàn (401 Unauthorized)', async () => {
      const res = await api.post('/auth/login', {
        identifier: 'admin@school.edu.vn',
        password: 'admin@2026',
      });
      expect(res.status).toBe(401);
      // Response body may vary (wrong password vs locked account), both are acceptable rejections
      expect(res.body).toBeDefined();
    });
  });
}
