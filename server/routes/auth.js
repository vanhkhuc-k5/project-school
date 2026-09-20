import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { query as pgQuery, isPostgresConfigured } from '../postgres.js';
import { supabase, isSupabaseConfigured } from '../supabase.js';
import { JWT_SECRET, authenticateToken, requireRole, validateInput } from '../middleware/auth.js';

const router = express.Router();

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);

// Login — chỉ chấp nhận tài khoản thật với mật khẩu đúng
router.post('/login', async (req, res) => {
  const { identifier, password, role } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập tài khoản và mật khẩu' });
  }

  let user = null;

  try {
    if (isPostgresConfigured()) {
      const q = `
        SELECT * FROM users
        WHERE (email = $1 OR username = $1 OR code = $1)
        ${role ? 'AND role = $2' : ''}
        LIMIT 1
      `;
      const params = role ? [identifier, role] : [identifier];
      const result = await pgQuery(q, params);
      user = result.rows[0];
    } else if (isSupabaseConfigured()) {
      let query = supabase
        .from('users')
        .select('*')
        .or(`email.eq.${identifier},username.eq.${identifier},code.eq.${identifier}`);

      if (role) {
        query = query.eq('role', role);
      }

      const { data } = await query.limit(1);
      user = data?.[0];
    } else {
      user = db.prepare(`
        SELECT * FROM users
        WHERE (email = ? OR username = ? OR code = ?)
        ${role ? 'AND role = ?' : ''}
      `).get(...(role ? [identifier, identifier, identifier, role] : [identifier, identifier, identifier]));
    }
  } catch (err) {
    console.error('Error fetching user:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi truy vấn tài khoản' });
  }

  if (!user) {
    return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại hoặc không đúng vai trò' });
  }

  // Xác thực mật khẩu bằng bcrypt
  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác' });
  }

  // Tạo JWT token
  const token = jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password_hash, ...safeUser } = user;
  res.json({ success: true, token, user: safeUser });
});

// Lấy thông tin user hiện tại
router.get('/me', authenticateToken, async (req, res) => {
  let user = null;

  try {
    if (isPostgresConfigured()) {
      const result = await pgQuery(
        'SELECT id, username, email, role, name, code, phone, avatar FROM users WHERE id = $1',
        [req.user.id]
      );
      user = result.rows[0];
    } else if (isSupabaseConfigured()) {
      const { data } = await supabase
        .from('users')
        .select('id, username, email, role, name, code, phone, avatar')
        .eq('id', req.user.id)
        .single();
      user = data;
    } else {
      user = db.prepare(
        'SELECT id, username, email, role, name, code, phone, avatar FROM users WHERE id = ?'
      ).get(req.user.id);
    }
  } catch (err) {
    console.error('Error in /me:', err);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin người dùng' });
  }

  if (!user) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
  }
  res.json({ success: true, user });
});

// Đổi mật khẩu
router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
  }

  let user = null;
  if (isPostgresConfigured()) {
    const result = await pgQuery('SELECT * FROM users WHERE id = $1', [req.user.id]);
    user = result.rows[0];
  } else if (isSupabaseConfigured()) {
    const { data } = await supabase.from('users').select('*').eq('id', req.user.id).single();
    user = data;
  } else {
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  }

  if (!user) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
  }

  const isValid = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
  }

  const newHash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);

  if (isPostgresConfigured()) {
    await pgQuery('UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2', [newHash, req.user.id]);
  } else if (isSupabaseConfigured()) {
    await supabase.from('users').update({ password_hash: newHash, must_change_password: false }).eq('id', req.user.id);
  } else {
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(newHash, req.user.id);
  }

  res.json({ success: true, message: 'Đổi mật khẩu thành công' });
});

// Admin: Đăng ký tài khoản mới
router.post('/register',
  authenticateToken,
  requireRole('admin'),
  validateInput('username', 'email', 'name', 'role'),
  async (req, res) => {
    const { username, email, name, role: newRole, code, phone } = req.body;

    const validRoles = ['student', 'teacher', 'parent', 'admin'];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ success: false, message: `Vai trò không hợp lệ. Chỉ chấp nhận: ${validRoles.join(', ')}` });
    }

    // Kiểm tra trùng lặp
    let existing = null;
    if (isPostgresConfigured()) {
      const result = await pgQuery('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
      existing = result.rows[0];
    } else if (isSupabaseConfigured()) {
      const { data } = await supabase.from('users').select('id').or(`username.eq.${username},email.eq.${email}`).limit(1);
      existing = data?.[0];
    } else {
      existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    }

    if (existing) {
      return res.status(409).json({ success: false, message: 'Tên đăng nhập hoặc email đã tồn tại' });
    }

    const defaultPassword = '123456';
    const passwordHash = bcrypt.hashSync(defaultPassword, BCRYPT_ROUNDS);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (isPostgresConfigured()) {
      await pgQuery(`
        INSERT INTO users (id, username, email, password_hash, role, name, code, phone, avatar, must_change_password)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, true)
      `, [userId, username, email, passwordHash, newRole, name, code || null, phone || null]);
    } else if (isSupabaseConfigured()) {
      await supabase.from('users').insert({
        id: userId,
        username,
        email,
        password_hash: passwordHash,
        role: newRole,
        name,
        code: code || null,
        phone: phone || null,
        avatar: null,
        must_change_password: true,
      });
    } else {
      db.prepare(`
        INSERT INTO users (id, username, email, password_hash, role, name, code, phone, avatar)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, username, email, passwordHash, newRole, name, code || null, phone || null, null);
    }

    res.json({
      success: true,
      message: `Tạo tài khoản thành công. Mật khẩu mặc định: ${defaultPassword}`,
      user: { id: userId, username, email, role: newRole, name, code, phone },
    });
  }
);

export default router;
