import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import GitHubStrategy from 'passport-github2';
import LocalStrategy from 'passport-local';
import { UserTypeModel } from '../models/userModel.js';
import { authenticate } from './authService.js';
import bcrypt from 'bcryptjs';

// Configure Passport Local Strategy (Email/Password)
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await authenticate({ email, password });
    return done(null, user);
  } catch (error) {
    return done(null, false, { message: error.message });
  }
}));

// Configure Passport Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/oauth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists
    let user = await User.findOne({ email: profile.emails[0].value });

    if (user) {
      // User exists, update OAuth provider info
      if (!user.oauthProviders.some(p => p.provider === 'google')) {
        user.oauthProviders.push({
          provider: 'google',
          providerId: profile.id,
          accessToken,
          refreshToken
        });
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        username: profile.displayName.toLowerCase().replace(/\s+/g, '-'),
        email: profile.emails[0].value,
        name: profile.displayName,
        avatar: profile.photos[0]?.value,
        oauthProviders: [{
          provider: 'google',
          providerId: profile.id,
          accessToken,
          refreshToken
        }],
        isActive: true,
        role: 'USER'
      });
      await user.save();
    }

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Configure Passport GitHub Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: '/api/auth/oauth/github/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists
    let user = await User.findOne({ email: profile.emails?.[0]?.value });

    if (user) {
      // User exists, update OAuth provider info
      if (!user.oauthProviders.some(p => p.provider === 'github')) {
        user.oauthProviders.push({
          provider: 'github',
          providerId: profile.id,
          accessToken,
          refreshToken
        });
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        username: profile.username,
        email: profile.emails?.[0]?.value || `${profile.username}@github.com`,
        name: profile.displayName || profile.username,
        avatar: profile.photos[0]?.value,
        oauthProviders: [{
          provider: 'github',
          providerId: profile.id,
          accessToken,
          refreshToken
        }],
        isActive: true,
        role: 'USER'
      });
      await user.save();
    }

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;