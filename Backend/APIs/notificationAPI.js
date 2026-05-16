import exp from "express";
import { NotificationModel } from "../models/notificationModel.js";
import { verifyToken } from "../middlewares/verifyToken.js";

export const notificationRoute = exp.Router();

//Mark all notifications read
notificationRoute.patch("/notifications/read-all", verifyToken("user"), async (req, res) => {
  try {
    await NotificationModel.updateMany(
      { recipient: req.user.userId, read: { $ne: true } },
      { read: true }
    );
    res.status(200).json({ message: "all notifications marked read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// get notification
notificationRoute.get("/notifications", verifyToken("user"), async (req, res) => {
  try {
    const notifications = await NotificationModel.find({ recipient: req.user.userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "notifications fetched",
      payload: notifications
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Mark Notification as Read
notificationRoute.patch("/notifications/:id/read", verifyToken("user"), async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await NotificationModel.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "notification not found"
      });
    }

    res.status(200).json({
      message: "notification marked as read",
      payload: updated
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});