import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || (() => {
  console.warn('⚠️  JWT_SECRET not set in .env — using fallback (NOT SAFE FOR PRODUCTION)');
  return 'dev_fallback_secret_change_me';
})();

/**
 * Middleware: Yêu cầu token JWT hợp lệ.
 * Gắn req.user = { id, role, email }
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập để truy cập' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại' });
    }
    req.user = user;
    next();
  });
}

/**
 * Middleware: Token không bắt buộc. Nếu có → gắn req.user, không có → bỏ qua.
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
      }
      next();
    });
  } else {
    next();
  }
}

/**
 * Middleware factory: Kiểm tra quyền theo role.
 * Sử dụng: requireRole('admin'), requireRole('teacher', 'admin')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Chưa xác thực tài khoản' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền truy cập. Yêu cầu vai trò: ${roles.join(', ')}`,
      });
    }
    next();
  };
}

/**
 * Validate input — kiểm tra các field bắt buộc.
 * Sử dụng: validateInput('username', 'email', 'password')
 */
export function validateInput(...fields) {
  return (req, res, next) => {
    const missing = fields.filter(f => !req.body[f] || String(req.body[f]).trim() === '');
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Thiếu thông tin bắt buộc: ${missing.join(', ')}`,
      });
    }
    next();
  };
}
