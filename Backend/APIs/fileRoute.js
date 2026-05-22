import exp from "express";
import { FileModel } from "../models/fileModel.js";
import { PullModel } from "../models/pullModel.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { optionalVerifyToken } from "../middlewares/optionalVerifyToken.js";
import { loadRepo, requireRepoRead, requireRepoWrite } from "../middlewares/repoAccessMiddleware.js";
import { emitToRepo } from "../utils/socketRepoEmit.js";

async function notifyOpenPullDiffs(repoId) {
  const openPrs = await PullModel.find({ repoId, status: "OPEN" }).select("_id");
  for (const pr of openPrs) {
    emitToRepo(repoId, "pr:diff-updated", {
      repositoryId: repoId.toString(),
      pullRequestId: pr._id.toString(),
    });
  }
}

export const fileRoute = exp.Router();

//create file
fileRoute.post("/repos/:repoId/files", verifyToken("user"), loadRepo("repoId"), requireRepoWrite, async (req, res) => {
  try {
    const repoId = req.params.repoId;
    const { path, content } = req.body;

    const existing = await FileModel.findOne({ repoId, path });

    if (existing) {
      return res.status(400).json({
        message: "file already exists"
      });
    }

    const newFile = new FileModel({
      repoId,
      path,
      content,
      createdBy: req.user?.userId // assuming verifyToken adds req.user
    });

    await newFile.save();
    await notifyOpenPullDiffs(repoId);

    res.status(201).json({
      message: "file created",
      payload: newFile
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


//Get files in repo
fileRoute.get("/repos/:repoId/files", optionalVerifyToken(), loadRepo("repoId"), requireRepoRead, async (req, res) => {
  try {
    const repoId = req.params.repoId;

    const files = await FileModel.find({ repoId });

    res.status(200).json({
      message: "files fetched",
      payload: files
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Get single file
fileRoute.get("/repos/:repoId/file", optionalVerifyToken(), loadRepo("repoId"), requireRepoRead, async (req, res) => {
  try {
    const repoId = req.params.repoId;
    const path = req.query.path;

    const file = await FileModel.findOne({ repoId, path });

    if (!file) {
      return res.status(404).json({
        message: "file not found"
      });
    }

    res.status(200).json({
      message: "file fetched",
      payload: file
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


//update file
fileRoute.patch("/repos/:repoId/file", verifyToken("user"), loadRepo("repoId"), requireRepoWrite, async (req, res) => {
  try {
    const repoId = req.params.repoId;
    const path = req.query.path;
    const { content, commitMessage = `Update ${path}` } = req.body;

    const updatedFile = await FileModel.findOneAndUpdate(
      { repoId, path },
      { content },
      { new: true }
    );

    if (!updatedFile) {
      return res.status(404).json({
        message: "file not found"
      });
    }

    // Create a commit for this file change
    const { CommitModel } = await import("../models/commitModel.js");
    const crypto = await import("crypto");

    const commitData = {
      repository: repoId,
      author: req.user.userId,
      message: commitMessage,
      files: [{
        filename: path,
        status: "modified"
      }],
      branch: "main",
      tree: crypto.default.randomBytes(20).toString('hex'),
      parents: []
    };

    const sha = crypto.default.createHash('sha1').update(JSON.stringify(commitData)).digest('hex');

    const newCommit = new CommitModel({
      ...commitData,
      sha
    });

    await newCommit.save();
    await notifyOpenPullDiffs(repoId);

    res.status(200).json({
      message: "file updated and committed",
      payload: { file: updatedFile, commit: newCommit }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Rename or move a file (single path)
fileRoute.patch("/repos/:repoId/file/move", verifyToken("user"), loadRepo("repoId"), requireRepoWrite, async (req, res) => {
  try {
    const repoId = req.params.repoId;
    const fromPath = req.body.fromPath || req.query.from;
    const toPath = req.body.toPath;

    if (!fromPath || !toPath) {
      return res.status(400).json({ message: "fromPath and toPath are required" });
    }
    if (fromPath === toPath) {
      return res.status(400).json({ message: "Paths must be different" });
    }

    const file = await FileModel.findOne({ repoId, path: fromPath });
    if (!file) {
      return res.status(404).json({ message: "file not found" });
    }

    const collision = await FileModel.findOne({ repoId, path: toPath });
    if (collision) {
      return res.status(400).json({ message: "A file already exists at the target path" });
    }

    file.path = toPath;
    await file.save();
    await notifyOpenPullDiffs(repoId);

    emitToRepo(repoId, "file:renamed", {
      repositoryId: repoId,
      fromPath,
      toPath,
    });

    res.status(200).json({
      message: "file moved",
      payload: file,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// delete file
fileRoute.delete("/repos/:repoId/file", verifyToken("user"), loadRepo("repoId"), requireRepoWrite, async (req, res) => {
  try {
    const repoId = req.params.repoId;
    const path = req.query.path;

    const deletedFile = await FileModel.findOneAndDelete({ repoId, path });

    if (!deletedFile) {
      return res.status(404).json({
        message: "file not found"
      });
    }

    await notifyOpenPullDiffs(repoId);

    emitToRepo(repoId, "file:deleted", {
      repositoryId: repoId,
      path,
    });

    res.status(200).json({
      message: "file deleted",
      payload: deletedFile
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});