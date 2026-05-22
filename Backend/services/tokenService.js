import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { UserTypeModel } from "../models/userModel.js";

const MAX_REFRESH_TOKENS = 10;

export function generateTokenPair(user) {
  const accessToken = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );

  return { accessToken, refreshToken };
}

export async function persistRefreshToken(userId, refreshToken, req = {}) {
  const user = await UserTypeModel.findById(userId);
  if (!user) return;

  const hashed = await bcrypt.hash(refreshToken, 10);
  user.refreshTokens.push({
    token: hashed,
    createdAt: new Date(),
    userAgent: req.headers?.["user-agent"] || "",
    ipAddress: req.ip || req.socket?.remoteAddress || "",
  });

  while (user.refreshTokens.length > MAX_REFRESH_TOKENS) {
    user.refreshTokens.shift();
  }

  await user.save();
}

export async function verifyStoredRefreshToken(userId, refreshToken) {
  const user = await UserTypeModel.findById(userId);
  if (!user) return false;

  for (const entry of user.refreshTokens) {
    if (entry.token && (await bcrypt.compare(refreshToken, entry.token))) {
      return true;
    }
  }
  return false;
}

export async function revokeRefreshToken(userId, refreshToken) {
  const user = await UserTypeModel.findById(userId);
  if (!user) return;

  const remaining = [];
  for (const entry of user.refreshTokens) {
    const matches = entry.token && (await bcrypt.compare(refreshToken, entry.token));
    if (!matches) remaining.push(entry);
  }
  user.refreshTokens = remaining;
  await user.save();
}

export async function revokeAllRefreshTokens(userId) {
  await UserTypeModel.findByIdAndUpdate(userId, { $set: { refreshTokens: [] } });
}

export function extractTokenFromRequest(req) {
  const bearer =
    req.headers.authorization && req.headers.authorization.startsWith("Bearer ")
      ? req.headers.authorization.substring(7)
      : null;
  return bearer || req.cookies?.token || null;
}

/** Max-age for httpOnly access-token cookie (matches JWT_EXPIRES_IN). */
export function accessTokenCookieMaxAgeMs() {
  const exp = process.env.JWT_EXPIRES_IN || "1h";
  const match = String(exp).match(/^(\d+)([smhd])$/i);
  if (!match) return 3600000;
  const n = parseInt(match[1], 10);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2].toLowerCase()];
  return n * (unit || 3600000);
}

export function setAccessTokenCookie(res, accessToken) {
  res.cookie("token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: accessTokenCookieMaxAgeMs(),
  });
}

export function clearAccessTokenCookie(res) {
  res.clearCookie("token");
}
