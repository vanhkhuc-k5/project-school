import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { describe, test, expect } from '../helpers/testClient.js';
import { JWT_SECRET } from '../../server/middleware/auth.js';

export async function runAuthUnitTests() {
  await describe('Unit Test: Mật mã & Xác thực JWT', () => {
    test('Bcrypt hash và so khớp mật khẩu chuẩn xác', () => {
      const plainPassword = 'SecretPassword123!';
      const hash = bcrypt.hashSync(plainPassword, 10);
      expect(typeof hash).toBe('string');
      expect(bcrypt.compareSync(plainPassword, hash)).toBe(true);
      expect(bcrypt.compareSync('WrongPassword', hash)).toBe(false);
    });

    test('Bcrypt xử lý đúng chuỗi Unicode / Tiếng Việt', () => {
      const passwordVn = 'MậtKhẩuTrườngHọc@2026';
      const hash = bcrypt.hashSync(passwordVn, 10);
      expect(bcrypt.compareSync(passwordVn, hash)).toBe(true);
      expect(bcrypt.compareSync('MatKhauTruongHoc@2026', hash)).toBe(false);
    });

    test('JWT Token tạo hợp lệ và giải mã đúng payload', () => {
      const payload = { id: 'usr_test_123', role: 'teacher', email: 'teacher@school.edu.vn' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.id).toBe(payload.id);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.email).toBe(payload.email);
    });

    test('JWT Token từ chối khi dùng sai bí mật ký (Invalid Signature)', () => {
      const token = jwt.sign({ id: 'usr_hack' }, 'wrong_secret_key');
      let failed = false;
      try {
        jwt.verify(token, JWT_SECRET);
      } catch {
        failed = true;
      }
      expect(failed).toBe(true);
    });

    test('JWT Token hết hạn ném lỗi TokenExpiredError', () => {
      const expiredToken = jwt.sign({ id: 'usr_exp' }, JWT_SECRET, { expiresIn: '-1s' });
      let isExpired = false;
      try {
        jwt.verify(expiredToken, JWT_SECRET);
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          isExpired = true;
        }
      }
      expect(isExpired).toBe(true);
    });
  });
}
