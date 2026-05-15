import exp from "express";
import { register, authenticate } from "../services/authService.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { UserTypeModel } from "../models/userModel.js";
import fileService from "../services/fileService.js";

export const userRoute = exp.Router();

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