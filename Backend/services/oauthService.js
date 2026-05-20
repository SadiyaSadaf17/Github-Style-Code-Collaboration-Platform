import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import GitHubStrategy from 'passport-github2';
import LocalStrategy from 'passport-local';
import { UserTypeModel } from '../models/userModel.js';
import { authenticate } from './authService.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5001';

passport.use(
  new LocalStrategy(
    { usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
      try {
        const result = await authenticate({ email, password });
        return done(null, result.user);
      } catch (error) {
        return done(null, false, { message: error.message });
      }
    }
  )
);

async function findOrCreateOAuthUser({ provider, profileId, email, username, name, avatar, accessToken, refreshToken }) {
  let user = email ? await UserTypeModel.findOne({ email }) : null;
  if (!user) {
    user = await UserTypeModel.findOne({
      'oauthProviders.provider': provider,
      'oauthProviders.providerId': profileId,
    });
  }

  if (user) {
    const hasProvider = user.oauthProviders?.some((p) => p.provider === provider);
    if (!hasProvider) {
      user.oauthProviders = user.oauthProviders || [];
      user.oauthProviders.push({
        provider,
        providerId: profileId,
        accessToken,
        refreshToken,
      });
      await user.save();
    }
    return user;
  }

  const baseUsername = (username || email?.split('@')[0] || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .slice(0, 30);
  let uniqueUsername = baseUsername;
  let n = 0;
  while (await UserTypeModel.findOne({ username: uniqueUsername })) {
    n += 1;
    uniqueUsername = `${baseUsername}${n}`;
  }

  user = new UserTypeModel({
    username: uniqueUsername,
    email: email || `${uniqueUsername}@${provider}.local`,
    name: name || uniqueUsername,
    avatar,
    oauthProviders: [{ provider, providerId: profileId, accessToken, refreshToken }],
    isActive: true,
    role: 'user',
  });
  await user.save();
  return user;
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${API_BASE}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateOAuthUser({
          provider: 'google',
          profileId: profile.id,
          email: profile.emails?.[0]?.value,
          username: profile.displayName,
          name: profile.displayName,
          avatar: profile.photos?.[0]?.value,
          accessToken,
          refreshToken,
        });
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: `${API_BASE}/auth/github/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateOAuthUser({
          provider: 'github',
          profileId: profile.id,
          email: profile.emails?.[0]?.value,
          username: profile.username,
          name: profile.displayName || profile.username,
          avatar: profile.photos?.[0]?.value,
          accessToken,
          refreshToken,
        });
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserTypeModel.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
