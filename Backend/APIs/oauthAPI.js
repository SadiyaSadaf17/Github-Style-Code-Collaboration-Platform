import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { UserTypeModel } from '../models/userModel.js';

const oauthRouter = express.Router();

// Generate JWT token
const generateToken = (user) => {
  const accessToken = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

// Google OAuth - Initiate
oauthRouter.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Google OAuth - Callback
oauthRouter.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    try {
      const { accessToken, refreshToken } = generateToken(req.user);
      
      // Redirect to frontend with tokens
      const redirectUrl = new URL(process.env.FRONTEND_URL || 'http://localhost:5173');
      redirectUrl.searchParams.append('access_token', accessToken);
      redirectUrl.searchParams.append('refresh_token', refreshToken);
      redirectUrl.searchParams.append('user_id', req.user._id);
      
      res.redirect(redirectUrl.toString());
    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=${error.message}`);
    }
  }
);

// GitHub OAuth - Initiate
oauthRouter.get('/github', passport.authenticate('github', {
  scope: ['user:email', 'read:user']
}));

// GitHub OAuth - Callback
oauthRouter.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    try {
      const { accessToken, refreshToken } = generateToken(req.user);
      
      // Redirect to frontend with tokens
      const redirectUrl = new URL(process.env.FRONTEND_URL || 'http://localhost:5173');
      redirectUrl.searchParams.append('access_token', accessToken);
      redirectUrl.searchParams.append('refresh_token', refreshToken);
      redirectUrl.searchParams.append('user_id', req.user._id);
      
      res.redirect(redirectUrl.toString());
    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=${error.message}`);
    }
  }
);

// Refresh token endpoint
oauthRouter.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await UserTypeModel.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'UserTypeModel not found' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateToken(user);

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

// Get current user profile
oauthRouter.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token is required' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserTypeModel.findById(decoded.userId).select('-password');

    res.status(200).json({
      message: 'Profile fetched successfully',
      payload: user
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token', error: error.message });
  }
});

// Logout endpoint
oauthRouter.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed', error: err.message });
    }
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

export default oauthRouter;