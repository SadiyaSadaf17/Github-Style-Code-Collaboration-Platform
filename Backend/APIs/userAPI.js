import exp from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import { register, authenticate } from "../services/authService.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { UserTypeModel } from "../models/userModel.js";
import fileService from "../services/fileService.js";
import notificationService from "../services/notificationService.js";

config();

export const userRoute = exp.Router();

const PASSWORD_RESET_PURPOSE = "password-reset";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const PROFILE_FIELDS = ["name", "bio", "location", "website", "company", "avatar", "preferences"];

function pickProfileUpdates(body) {
  const out = {};
  for (const key of PROFILE_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

//Register user
userRoute.post("/users", async (req, res) => {
  try {
    //get user obj from req
    let userObj = req.body;
    //call register
    const newUserObj = await register({ ...userObj, role: "user" });
    //send res
    res.status(201).json({ message: "user created", payload: newUserObj });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Login user
userRoute.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const { token, user } = await authenticate({ email, password });
    // Set HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax',
      maxAge: 3600000 // 1 hour
    });
    res.status(200).json({ message: "Login successful", token, user });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
});

//Logout user
userRoute.post("/logout", (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ message: "Logout successful" });
});

/** Request password reset link (email). OAuth-only accounts are skipped silently. */
userRoute.post("/users/forgot-password", async (req, res) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await UserTypeModel.findOne({ email });
    const generic =
      "If an account exists for that email, you will receive reset instructions shortly.";

    if (!user || !user.password) {
      return res.status(200).json({ message: generic });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), purpose: PASSWORD_RESET_PURPOSE },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const resetLink = `${FRONTEND_URL.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

    if (process.env.NODE_ENV !== "production") {
      console.log("[dev] Password reset link:", resetLink);
    }

    await notificationService.sendEmail(
      user.email,
      "Reset your password",
      `<p>Hi ${user.name || user.username},</p><p><a href="${resetLink}">Click here to reset your password</a>.</p><p>This link expires in one hour.</p>`,
      `Reset your password: ${resetLink}`
    );

    const payload = { message: generic };
    if (process.env.NODE_ENV !== "production") {
      payload.devResetLink = resetLink;
    }
    res.status(200).json(payload);
  } catch (err) {
    console.error("forgot-password", err);
    res.status(500).json({ message: err.message });
  }
});

/** Complete password reset using token from email */
userRoute.post("/users/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: "token and newPassword are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ message: "Invalid or expired reset link. Request a new one." });
    }

    if (decoded.purpose !== PASSWORD_RESET_PURPOSE || !decoded.userId) {
      return res.status(400).json({ message: "Invalid reset token" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    const updated = await UserTypeModel.findByIdAndUpdate(decoded.userId, {
      password: hashed,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
    });

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Password updated. You can sign in now." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** Change password while logged in */
userRoute.patch("/users/me/password", verifyToken("user"), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "currentPassword and newPassword are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    const user = await UserTypeModel.findById(req.user.userId);
    if (!user || !user.password) {
      return res.status(400).json({ message: "Password login is not enabled for this account" });
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** Change email (re-login may be required for JWT cookie identity; email in DB updates) */
userRoute.patch("/users/me/email", verifyToken("user"), async (req, res) => {
  try {
    const { newEmail, currentPassword } = req.body;
    const email = (newEmail || "").trim().toLowerCase();
    if (!email || !currentPassword) {
      return res.status(400).json({ message: "newEmail and currentPassword are required" });
    }

    const user = await UserTypeModel.findById(req.user.userId);
    if (!user || !user.password) {
      return res.status(400).json({ message: "Email change requires a password-protected account" });
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const taken = await UserTypeModel.findOne({ email, _id: { $ne: user._id } });
    if (taken) {
      return res.status(400).json({ message: "That email is already in use" });
    }

    user.email = email;
    await user.save();

    const fresh = await UserTypeModel.findById(user._id).select("-password").lean();
    res.status(200).json({ message: "Email updated", payload: fresh });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Upload profile photo (current user) — requires Cloudinary env vars; stores URL in user.avatar
userRoute.post(
  "/users/me/avatar",
  verifyToken("user"),
  fileService.getUploadMiddleware("avatar", { maxCount: 1, isPublic: true }),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided (field name: avatar)" });
      }
      if (!req.file.mimetype || !req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "Only image files are allowed for profile photos" });
      }

      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        return res.status(503).json({
          message:
            "Image upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET, or paste an image URL in Settings instead.",
        });
      }

      const result = await fileService.uploadFile(req.file, {
        folder: "profile-avatars",
        isPublic: true,
      });

      const updatedUser = await UserTypeModel.findByIdAndUpdate(
        req.user.userId,
        { avatar: result.url },
        { new: true }
      )
        .select("-password")
        .lean();

      res.status(200).json({
        message: "Profile photo updated",
        payload: updatedUser,
      });
    } catch (err) {
      console.error("Avatar upload error:", err);
      res.status(500).json({ message: err.message || "Upload failed" });
    }
  }
);

// Set profile photo by URL (no Cloudinary required)
userRoute.patch("/users/me/avatar", verifyToken("user"), async (req, res) => {
  try {
    const { avatarUrl } = req.body;
    if (!avatarUrl || typeof avatarUrl !== "string" || avatarUrl.length > 2000) {
      return res.status(400).json({ message: "avatarUrl must be a string (max 2000 chars)" });
    }
    if (!/^https?:\/\//i.test(avatarUrl.trim())) {
      return res.status(400).json({ message: "avatarUrl must start with http:// or https://" });
    }

    const updatedUser = await UserTypeModel.findByIdAndUpdate(
      req.user.userId,
      { avatar: avatarUrl.trim() },
      { new: true }
    )
      .select("-password")
      .lean();

    res.status(200).json({
      message: "Profile photo URL saved",
      payload: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update current user profile (sanitized fields)
userRoute.patch("/users/me", verifyToken("user"), async (req, res) => {
  try {
    const updateObj = pickProfileUpdates(req.body);
    if (Object.keys(updateObj).length === 0) {
      return res.status(400).json({ message: "No valid profile fields to update" });
    }

    const updatedUser = await UserTypeModel.findByIdAndUpdate(req.user.userId, updateObj, { new: true })
      .select("-password")
      .lean();

    res.status(200).json({
      message: "Profile updated successfully",
      payload: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get user profile by username
userRoute.get("/users/profile/:username", async (req, res) => {
  try {
    const user = await UserTypeModel.findOne({ username: req.params.username })
      .select("-password -refreshTokens -passwordResetToken -emailVerificationToken")
      .populate("repositories", "name description isPrivate updatedAt language");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "user fetched",
      payload: user
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// update user (self or admin)
userRoute.patch("/users/:id", verifyToken("user"), async (req, res) => {
  try {
    const userId = req.params.id;
    if (req.user.userId !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only update your own profile" });
    }

    const updateObj = pickProfileUpdates(req.body);
    delete updateObj.password;
    delete updateObj.email;
    delete updateObj.role;
    delete updateObj.refreshTokens;

    const updatedUser = await UserTypeModel.findByIdAndUpdate(userId, updateObj, { new: true }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User updated successfully",
      payload: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//delete user
userRoute.delete("/users/:id", verifyToken("user"), async (req, res) => {
  try {
    const userId = req.params.id;

    if (req.user.userId !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only delete your own account" });
    }

    const deletedUser = await UserTypeModel.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "user deleted successfully",
      payload: deletedUser
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});