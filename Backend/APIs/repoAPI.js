import exp from "express";
import { RepoModel } from "../models/repoModel.js";
import { UserTypeModel } from "../models/userModel.js";
import { FileModel } from "../models/fileModel.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { optionalVerifyToken } from "../middlewares/optionalVerifyToken.js";
import {
  loadRepo,
  requireManageTeam,
  requireRepoOwner,
  requireRepoRead,
} from "../middlewares/repoAccessMiddleware.js";
import { getRepoTeamRole, refToIdString } from "../services/repoAccessService.js";
import { recordActivity } from "../services/activityService.js";
import { auditFromRequest } from "../services/auditService.js";

export const repoRoute = exp.Router();

function attachListAccess(repoDoc, userId) {
  const plain = repoDoc.toObject ? repoDoc.toObject() : { ...repoDoc };
  plain.myAccessRole = getRepoTeamRole(repoDoc, userId);
  return plain;
}

async function attachSocialFlags(repoPlain, userId) {
  if (!userId) {
    repoPlain.isStarred = false;
    repoPlain.isWatched = false;
    return repoPlain;
  }
  const user = await UserTypeModel.findById(userId).select("starredRepos watchedRepos");
  if (!user) return repoPlain;
  const id = repoPlain._id.toString();
  repoPlain.isStarred = user.starredRepos.some((r) => r.toString() === id);
  repoPlain.isWatched = (user.watchedRepos || []).some((r) => r.toString() === id);
  return repoPlain;
}

// create repo
repoRoute.post("/repos", verifyToken("user"), async (req, res) => {
  try {
    const user = await UserTypeModel.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const repoObj = {
      ...req.body,
      owner: req.user.userId,
      fullName: `${user.username}/${req.body.name}`,
    };

    const newRepo = new RepoModel(repoObj);
    await newRepo.save();

    await recordActivity({
      actor: req.user.userId,
      type: "repo_created",
      repository: newRepo._id,
      payload: { name: newRepo.name },
    });

    res.status(201).json({
      message: "repository created",
      payload: newRepo,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// get repositories the user owns or collaborates on
repoRoute.get("/repos", verifyToken("user"), async (req, res) => {
  try {
    const uid = req.user.userId;
    const repos = await RepoModel.find({
      $or: [{ owner: uid }, { "collaborators.user": uid }],
    })
      .populate("owner", "name username")
      .sort({ updatedAt: -1 });

    const payload = repos.map((r) => attachListAccess(r, uid));

    res.status(200).json({
      message: "repositories fetched",
      payload,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Public repositories (Explore) — no auth required
repoRoute.get("/repos/explore/public", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const repos = await RepoModel.find({ isPrivate: false })
      .populate("owner", "name username avatar")
      .sort({ updatedAt: -1 })
      .limit(limit);

    res.status(200).json({
      message: "public repositories fetched",
      payload: repos,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// get single repository (public read OK; private requires team membership)
repoRoute.get(
  "/repos/:id",
  optionalVerifyToken(),
  loadRepo("id"),
  requireRepoRead,
  async (req, res) => {
    try {
      let repo = req.repo.toObject ? req.repo.toObject() : { ...req.repo };
      repo.currentUserRole = req.user?.userId ? getRepoTeamRole(req.repo, req.user.userId) : null;
      repo = await attachSocialFlags(repo, req.user?.userId);

      res.status(200).json({
        message: "repository fetched",
        payload: repo,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// current user's role on a repo (requires auth)
repoRoute.get("/repos/:id/my-role", verifyToken("user"), loadRepo("id"), requireRepoRead, (req, res) => {
  res.status(200).json({
    message: "role fetched",
    payload: { role: req.repoTeamRole },
  });
});

// update repository (owner only)
repoRoute.patch("/repos/:id", verifyToken("user"), loadRepo("id"), requireRepoOwner, async (req, res) => {
  try {
    const updateObj = { ...req.body };
    delete updateObj.owner;
    delete updateObj.collaborators;
    delete updateObj.fullName;

    const updatedRepo = await RepoModel.findByIdAndUpdate(req.params.id, updateObj, { new: true }).populate(
      "owner",
      "name username"
    );

    res.status(200).json({
      message: "repository updated",
      payload: updatedRepo,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// delete repository (owner only)
repoRoute.delete("/repos/:id", verifyToken("user"), loadRepo("id"), requireRepoOwner, async (req, res) => {
  try {
    const deletedRepo = await RepoModel.findByIdAndDelete(req.params.id);

    auditFromRequest(req, {
      action: "repo.delete",
      resourceType: "repository",
      resourceId: req.params.id,
      metadata: { fullName: deletedRepo?.fullName },
    });

    res.status(200).json({
      message: "repository deleted",
      payload: deletedRepo,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// add collaborator (owner only) — body: { username, role: "collaborator" | "viewer" }
repoRoute.post(
  "/repos/:id/collaborators",
  verifyToken("user"),
  loadRepo("id"),
  requireManageTeam,
  async (req, res) => {
    try {
      const { username, role = "viewer" } = req.body;
      if (!username || typeof username !== "string") {
        return res.status(400).json({ message: "username is required" });
      }
      if (!["collaborator", "viewer"].includes(role)) {
        return res.status(400).json({ message: "role must be collaborator or viewer" });
      }

      const target = await UserTypeModel.findOne({ username: username.trim().toLowerCase() });
      if (!target) {
        return res.status(404).json({ message: "User not found" });
      }

      const targetId = target._id.toString();
      if (refToIdString(req.repo.owner) === targetId) {
        return res.status(400).json({ message: "Repository owner is already the owner" });
      }

      const exists = req.repo.collaborators.some((c) => refToIdString(c.user) === targetId);
      if (exists) {
        return res.status(400).json({ message: "User is already a team member" });
      }

      req.repo.collaborators.push({
        user: target._id,
        role,
        addedBy: req.user.userId,
      });
      await req.repo.save();

      const fresh = await RepoModel.findById(req.params.id).populate("collaborators.user", "name username email");

      res.status(200).json({
        message: "collaborator added",
        payload: fresh.collaborators,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// list collaborators (must be able to read repo)
repoRoute.get(
  "/repos/:id/collaborators",
  optionalVerifyToken(),
  loadRepo("id"),
  requireRepoRead,
  async (req, res) => {
    try {
      const repo = await RepoModel.findById(req.params.id).populate("collaborators.user", "name username email");

      res.status(200).json({
        message: "collaborators fetched",
        payload: repo.collaborators,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// update collaborator role (owner only)
repoRoute.patch(
  "/repos/:id/collaborators/:userId",
  verifyToken("user"),
  loadRepo("id"),
  requireManageTeam,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      if (!["collaborator", "viewer"].includes(role)) {
        return res.status(400).json({ message: "role must be collaborator or viewer" });
      }
      if (refToIdString(req.repo.owner) === userId) {
        return res.status(400).json({ message: "Cannot change role of the owner" });
      }

      const sub = req.repo.collaborators.find((c) => refToIdString(c.user) === userId);
      if (!sub) {
        return res.status(404).json({ message: "Collaborator not found" });
      }
      sub.role = role;
      sub.permission = undefined;
      await req.repo.save();

      const repo = await RepoModel.findById(req.params.id).populate("collaborators.user", "name username email");

      res.status(200).json({
        message: "collaborator updated",
        payload: repo.collaborators,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Toggle star
repoRoute.post("/repos/:id/star", verifyToken("user"), loadRepo("id"), requireRepoRead, async (req, res) => {
  try {
    const repoId = req.params.id;
    const user = await UserTypeModel.findById(req.user.userId);
    const idx = user.starredRepos.findIndex((r) => r.toString() === repoId);
    let starred = false;

    if (idx >= 0) {
      user.starredRepos.splice(idx, 1);
      await RepoModel.findByIdAndUpdate(repoId, { $inc: { "stats.stars": -1 } });
    } else {
      user.starredRepos.push(repoId);
      await RepoModel.findByIdAndUpdate(repoId, { $inc: { "stats.stars": 1 } });
      starred = true;
    }
    await user.save();

    const repo = await RepoModel.findById(repoId);
    res.status(200).json({
      message: starred ? "Repository starred" : "Star removed",
      payload: { starred, stars: Math.max(0, repo?.stats?.stars ?? 0) },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle watch
repoRoute.post("/repos/:id/watch", verifyToken("user"), loadRepo("id"), requireRepoRead, async (req, res) => {
  try {
    const repoId = req.params.id;
    const user = await UserTypeModel.findById(req.user.userId);
    if (!user.watchedRepos) user.watchedRepos = [];
    const idx = user.watchedRepos.findIndex((r) => r.toString() === repoId);
    let watched = false;

    if (idx >= 0) {
      user.watchedRepos.splice(idx, 1);
      await RepoModel.findByIdAndUpdate(repoId, { $inc: { "stats.watchers": -1 } });
    } else {
      user.watchedRepos.push(repoId);
      await RepoModel.findByIdAndUpdate(repoId, { $inc: { "stats.watchers": 1 } });
      watched = true;
    }
    await user.save();

    const repo = await RepoModel.findById(repoId);
    res.status(200).json({
      message: watched ? "Watching repository" : "Unwatched",
      payload: { watched, watchers: Math.max(0, repo?.stats?.watchers ?? 0) },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Fork repository
repoRoute.post("/repos/:id/fork", verifyToken("user"), loadRepo("id"), requireRepoRead, async (req, res) => {
  try {
    const source = req.repo;
    const user = await UserTypeModel.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let forkName = (req.body.name || `${source.name}-fork`).trim().toLowerCase().replace(/\s+/g, "-");
    const exists = await RepoModel.findOne({ owner: user._id, name: forkName });
    if (exists) {
      forkName = `${forkName}-${Date.now().toString(36).slice(-4)}`;
    }

    const fork = new RepoModel({
      name: forkName,
      fullName: `${user.username}/${forkName}`,
      description: source.description,
      owner: user._id,
      isPrivate: false,
      isFork: true,
      forkedFrom: source._id,
      defaultBranch: source.defaultBranch,
      language: source.language,
      topics: source.topics || [],
    });
    await fork.save();

    const sourceFiles = await FileModel.find({ repoId: source._id });
    if (sourceFiles.length) {
      await FileModel.insertMany(
        sourceFiles.map((f) => ({
          repoId: fork._id,
          path: f.path,
          content: f.content,
          createdBy: req.user.userId,
        }))
      );
    }

    await RepoModel.findByIdAndUpdate(source._id, { $inc: { "stats.forks": 1 } });

    await recordActivity({
      actor: req.user.userId,
      type: "repo_forked",
      repository: fork._id,
      payload: { sourceRepoId: source._id, name: fork.name },
    });

    res.status(201).json({
      message: "Repository forked",
      payload: fork,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// remove collaborator (owner only)
repoRoute.delete(
  "/repos/:id/collaborators/:userId",
  verifyToken("user"),
  loadRepo("id"),
  requireManageTeam,
  async (req, res) => {
    try {
      const { userId } = req.params;
      if (refToIdString(req.repo.owner) === userId) {
        return res.status(400).json({ message: "Cannot remove the owner" });
      }

      req.repo.collaborators = req.repo.collaborators.filter((c) => refToIdString(c.user) !== userId);
      await req.repo.save();

      res.status(200).json({
        message: "collaborator removed",
        payload: req.repo.collaborators,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);
