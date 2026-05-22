import exp from "express";
import { Activity } from "../models/activityModel.js";
import { UserTypeModel } from "../models/userModel.js";
import { optionalVerifyToken } from "../middlewares/optionalVerifyToken.js";
import { verifyToken } from "../middlewares/verifyToken.js";

export const activityRoute = exp.Router();

activityRoute.get("/feed", optionalVerifyToken(), async (req, res) => {
  try {
    const scope = req.query.scope || "global";
    const limit = Math.min(Number(req.query.limit) || 30, 50);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    let filter = { public: true };

    if (scope === "following" && req.user?.userId) {
      const me = await UserTypeModel.findById(req.user.userId).select("following");
      const followingIds = (me?.following || []).map((id) => id.toString());
      if (followingIds.length === 0) {
        return res.status(200).json({
          message: "activity feed fetched",
          payload: [],
          pagination: { page, limit, total: 0 },
        });
      }
      filter.actor = { $in: followingIds };
    } else if (scope === "user") {
      const userId = req.query.userId;
      if (!userId) {
        return res.status(400).json({ message: "userId required for scope=user" });
      }
      filter.actor = userId;
    } else if (scope === "me" && req.user?.userId) {
      filter.actor = req.user.userId;
    }

    const [items, total] = await Promise.all([
      Activity.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("actor", "username name avatar")
        .populate("repository", "name fullName"),
      Activity.countDocuments(filter),
    ]);

    res.status(200).json({
      message: "activity feed fetched",
      payload: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

activityRoute.get("/repos/:repoId", optionalVerifyToken(), async (req, res) => {
  try {
    const { repoId } = req.params;
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    const items = await Activity.find({ repository: repoId, public: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("actor", "username name avatar");

    res.status(200).json({
      message: "repository activity fetched",
      payload: items,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default activityRoute;
