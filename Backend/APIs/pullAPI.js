import exp from "express"
import { PullModel } from "../models/pullModel.js"
import { UserTypeModel } from "../models/userModel.js"
import { verifyToken } from "../middlewares/verifyToken.js"
import { optionalVerifyToken } from "../middlewares/optionalVerifyToken.js"
import { loadRepo, requireRepoRead, requireRepoWrite } from "../middlewares/repoAccessMiddleware.js"
import notificationService from "../services/notificationService.js"
import { emitToRepo } from "../utils/socketRepoEmit.js"

export const pullRoute=exp.Router();

// create pull request 
pullRoute.post("/repos/:repoId/pulls", verifyToken("user"), loadRepo("repoId"), requireRepoWrite, async (req, res) => {
  try {
    const repoId = req.params.repoId;
    const { title, description, fromBranch, toBranch } = req.body;

    const newPR = new PullModel({
      repoId,
      authorId: req.user.userId,
      title,
      description,
      fromBranch,
      toBranch
    });

    await newPR.save();

    const repo = req.repo;
    const actorUser = await UserTypeModel.findById(req.user.userId).select("username name");
    const actorLabel = actorUser?.username || actorUser?.name || "Someone";

    // Create notifications for repository owner and collaborators (excluding the author)
    const recipients = [repo.owner, ...repo.collaborators.map((c) => c.user)]
      .filter(Boolean)
      .map((id) => (id?._id ? id._id : id))
      .filter((id) => id.toString() !== req.user.userId.toString());

    for (const recipientId of recipients) {
      await notificationService.createNotification({
        recipient: recipientId,
        type: "pr_opened",
        title: `New pull request: ${title}`,
        message: `${actorLabel} opened pull request: ${title}`,
        repository: repoId,
        pullRequest: newPR._id,
        actor: req.user.userId,
      });
    }

    emitToRepo(repoId, "pr:opened", {
      repositoryId: repoId,
      pullRequest: newPR.toObject(),
    });

    res.status(201).json({
      message: "pull request created",
      payload: newPR
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


//Get all pull requests
pullRoute.get("/repos/:repoId/pulls", optionalVerifyToken(), loadRepo("repoId"), requireRepoRead, async (req, res) => {
  try {
    const repoId = req.params.repoId;

    const pulls = await PullModel.find({ repoId }).populate('authorId', 'name username');

    res.status(200).json({
      message: "pull requests fetched",
      payload: pulls
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


//get single pull request
pullRoute.get("/repos/:repoId/pulls/:prId", optionalVerifyToken(), loadRepo("repoId"), requireRepoRead, async (req, res) => {

  const { prId, repoId } = req.params;

  const pr = await PullModel.findById(prId).populate('authorId', 'name username');

  if (!pr || pr.repoId.toString() !== repoId) {
    return res.status(404).json({
      message: "pull request not found"
    });
  }

  res.status(200).json({
    message: "pull request fetched",
    payload: pr
  });

});


//update pull requests 
pullRoute.patch("/repos/:repoId/pulls/:prId", verifyToken("user"), loadRepo("repoId"), requireRepoWrite, async (req, res) => {

  const { prId, repoId } = req.params;

  const existing = await PullModel.findById(prId);
  if (!existing || existing.repoId.toString() !== repoId) {
    return res.status(404).json({ message: "pull request not found" });
  }

  const updatedPR = await PullModel.findByIdAndUpdate(
    prId,
    req.body,
    { new: true }
  );

  emitToRepo(repoId, "pr:updated", { repositoryId: repoId, pullRequestId: prId, pullRequest: updatedPR?.toObject?.() });

  res.status(200).json({
    message: "pull request updated",
    payload: updatedPR
  });

});


//merge pull requests 
pullRoute.post("/repos/:repoId/pulls/:prId/merge", verifyToken("user"), loadRepo("repoId"), requireRepoWrite, async (req, res) => {

  const { prId, repoId } = req.params;

  const pr = await PullModel.findById(prId);

  if (!pr || pr.repoId.toString() !== repoId) {
    return res.status(404).json({
      message: "pull request not found"
    });
  }

  pr.status = "MERGED";

  await pr.save();

  emitToRepo(repoId, "pr:merged", { repositoryId: repoId, pullRequestId: prId, pullRequest: pr.toObject?.() || pr });

  res.status(200).json({
    message: "pull request merged",
    payload: pr
  });

});