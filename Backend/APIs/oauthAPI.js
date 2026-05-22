import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { UserTypeModel } from '../models/userModel.js';
import {
  generateTokenPair,
  persistRefreshToken,
  verifyStoredRefreshToken,
  revokeRefreshToken,
  setAccessTokenCookie,
  clearAccessTokenCookie,
  extractTokenFromRequest,
} from '../services/tokenService.js';

const oauthRouter = express.Router();

async function issueTokensForUser(user, req) {
  const { accessToken, refreshToken } = generateTokenPair(user);
  await persistRefreshToken(user._id, refreshToken, req);
  return { accessToken, refreshToken };
}

oauthRouter.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

oauthRouter.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      const { accessToken, refreshToken } = await issueTokensForUser(req.user, req);
      const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      const redirectUrl = new URL(`${base}/oauth/callback`);
      redirectUrl.searchParams.append('access_token', accessToken);
      redirectUrl.searchParams.append('refresh_token', refreshToken);
      redirectUrl.searchParams.append('user_id', req.user._id);
      res.redirect(redirectUrl.toString());
    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(error.message)}`);
    }
  }
);

oauthRouter.get('/github', passport.authenticate('github', {
  scope: ['user:email', 'read:user']
}));

oauthRouter.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      const { accessToken, refreshToken } = await issueTokensForUser(req.user, req);
      const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      const redirectUrl = new URL(`${base}/oauth/callback`);
      redirectUrl.searchParams.append('access_token', accessToken);
      redirectUrl.searchParams.append('refresh_token', refreshToken);
      redirectUrl.searchParams.append('user_id', req.user._id);
      res.redirect(redirectUrl.toString());
    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(error.message)}`);
    }
  }
);

oauthRouter.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    const stored = await verifyStoredRefreshToken(decoded.userId, refreshToken);
    if (!stored) {
      return res.status(401).json({ message: 'Refresh token revoked or invalid' });
    }

    const user = await UserTypeModel.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    await revokeRefreshToken(decoded.userId, refreshToken);
    const { accessToken, refreshToken: newRefreshToken } = await issueTokensForUser(user, req);

    setAccessTokenCookie(res, accessToken);

    res.status(200).json({
      message: 'Token refreshed successfully',
      payload: {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token', error: error.message });
  }
});

oauthRouter.get('/profile', async (req, res) => {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ message: 'Authorization token is required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserTypeModel.findById(decoded.userId).select('-password -refreshTokens');

    res.status(200).json({
      message: 'Profile fetched successfully',
      payload: user
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token', error: error.message });
  }
});

oauthRouter.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (refreshToken) {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );
      await revokeRefreshToken(decoded.userId, refreshToken);
    }
  } catch {
    /* ignore */
  }

  clearAccessTokenCookie(res);
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed', error: err.message });
    }
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

export default oauthRouter;
