/**
 * Auth Module HTTP Controller
 * Handles incoming HTTP requests, invokes AuthService, and orchestrates
 * HttpOnly cookies and standardized HTTP responses.
 */

import { authService } from './auth.service.js';
import {
  parseCookies,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  REFRESH_COOKIE_NAME,
} from '../../shared/auth/cookie.utils.js';

export class AuthController {
  /**
   * @param {import('./auth.service.js').AuthService} [service]
   */
  constructor(service = authService) {
    this.service = service;
    this.login = this.login.bind(this);
    this.refresh = this.refresh.bind(this);
    this.logout = this.logout.bind(this);
    this.getMe = this.getMe.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.forgotPassword = this.forgotPassword.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.register = this.register.bind(this);
  }

  /**
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { identifier, password, role } = req.body;
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const { token, accessToken, refreshToken, user } = await this.service.login({
        identifier,
        password,
        role,
        ip,
        userAgent,
      });

      // Set secure HttpOnly cookie
      setRefreshTokenCookie(res, refreshToken);

      res.status(200).json({
        success: true,
        token: accessToken || token,
        accessToken: accessToken || token,
        refreshToken,
        user,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/refresh
   */
  async refresh(req, res, next) {
    try {
      const cookies = parseCookies(req);
      const rawRefreshToken = cookies[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const { token, accessToken, refreshToken, user } = await this.service.refresh({
        rawRefreshToken,
        ip,
        userAgent,
      });

      setRefreshTokenCookie(res, refreshToken);

      res.status(200).json({
        success: true,
        token: accessToken || token,
        accessToken: accessToken || token,
        refreshToken,
        user,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(req, res, next) {
    try {
      const cookies = parseCookies(req);
      const rawRefreshToken = cookies[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      await this.service.logout({
        rawRefreshToken,
        userId: req.user?.id,
        ip,
      });

      clearRefreshTokenCookie(res);

      res.status(200).json({
        success: true,
        message: 'Đăng xuất thành công',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/me
   */
  async getMe(req, res, next) {
    try {
      const user = await this.service.getMe(req.user.id, req.user.tokenVersion);
      res.status(200).json({
        success: true,
        user,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      const result = await this.service.changePassword(
        req.user.id,
        { currentPassword, newPassword },
        ip
      );

      clearRefreshTokenCookie(res);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/forgot-password
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      const result = await this.service.forgotPassword({ email, ip });

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/reset-password
   */
  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      const result = await this.service.resetPassword({ token, newPassword, ip });

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/register (Admin only)
   */
  async register(req, res, next) {
    try {
      const { user, defaultPassword } = await this.service.register(req.body, req.user);
      res.status(200).json({
        success: true,
        message: `Tạo tài khoản thành công. Mật khẩu khởi tạo: ${defaultPassword}`,
        user,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
