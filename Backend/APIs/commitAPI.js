import exp from "express";
import { CommitModel } from "../models/commitModel.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { optionalVerifyToken } from "../middlewares/optionalVerifyToken.js";
import { loadRepo, requireRepoRead, requireRepoWrite } from "../middlewares/repoAccessMiddleware.js";
import crypto from "crypto";
import { recordActivity } from "../services/activityService.js";

export const commitRoute = exp.Router();

//create api
commitRoute.post("/repos/:repoId/commits", verifyToken("user"), loadRepo("repoId"), requireRepoWrite, async (req, res) => {
  try {
    const repoId = req.params.repoId;
    const { message, files, branch = "main" } = req.body;

    // Generate SHA for the commit
    const commitData = {
      repository: repoId,
      author: req.user.userId,
      message,
      files,
      branch,
      tree: crypto.randomBytes(20).toString('hex'), // Simplified tree hash
      parents: [] // For now, no parent tracking
    };

    const sha = crypto.createHash('sha1').update(JSON.stringify(commitData)).digest('hex');

    const newCommit = new CommitModel({
      ...commitData,
      sha
    });

    await newCommit.save();

    await recordActivity({
      actor: req.user.userId,
      type: "commit",
      repository: repoId,
      payload: { sha, message },
    });

    res.status(201).json({
      message: "commit created",
      payload: newCommit
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Get All Commits of repo
commitRoute.get("/repos/:repoId/commits", optionalVerifyToken(), loadRepo("repoId"), requireRepoRead, async (req, res) => {
  try {
    const repoId = req.params.repoId;

    const commits = await CommitModel.find({ repository: repoId })
      .populate('author', 'name username')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "commits fetched",
      payload: commits
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//get single commit of repo 

commitRoute.get("/repos/:repoId/commits/:commitId", optionalVerifyToken(), loadRepo("repoId"), requireRepoRead, async (req, res) => {

  const { commitId, repoId } = req.params;

  const commit = await CommitModel.findById(commitId);

  if (!commit || commit.repository.toString() !== repoId) {
    return res.status(404).json({
      message: "commit not found"
    });
  }

  res.status(200).json({
    message: "commit fetched",
    payload: commit
  });

});