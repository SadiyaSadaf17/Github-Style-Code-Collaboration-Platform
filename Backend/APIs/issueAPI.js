import exp from "express";
import { IssueModel } from "../models/issueModel.js";
import { UserTypeModel } from "../models/userModel.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { optionalVerifyToken } from "../middlewares/optionalVerifyToken.js";
import { loadRepo, requireRepoRead, requireRepoWrite } from "../middlewares/repoAccessMiddleware.js";
import notificationService from "../services/notificationService.js";
import { emitToRepo } from "../utils/socketRepoEmit.js";
import { recordActivity } from "../services/activityService.js";

export const issueRoute = exp.Router();

// Create issue
issueRoute.post("/repos/:repoId/issues", verifyToken("user"), loadRepo("repoId"), requireRepoWrite, async (req, res) => {
  try {
    const repoId = req.params.repoId;
    const { title, description } = req.body;

    // Find the highest issue number for this repository
    const lastIssue = await IssueModel.findOne({ repository: repoId }).sort({ number: -1 });
    const nextNumber = lastIssue ? lastIssue.number + 1 : 1;

    const newIssue = new IssueModel({
      repository: repoId,
      author: req.user.userId,
      title,
      body: description,
      number: nextNumber
    });

    await newIssue.save();

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
        type: "issue_opened",
        title: `New issue: ${title}`,
        message: `${actorLabel} opened issue #${nextNumber}: ${title}`,
        repository: repoId,
        issue: newIssue._id,
        actor: req.user.userId,
      });
    }

    emitToRepo(repoId, "issue:opened", {
      repositoryId: repoId,
      issue: newIssue.toObject(),
    });

    await recordActivity({
      actor: req.user.userId,
      type: "issue_opened",
      repository: repoId,
      payload: { issueId: newIssue._id, title, number: nextNumber },
    });

    res.status(201).json({
      message: "issue created",
      payload: newIssue
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


//Get all issues
issueRoute.get("/repos/:repoId/issues", optionalVerifyToken(), loadRepo("repoId"), requireRepoRead, async (req, res) => {
  try {
    const repoId = req.params.repoId;

    const issues = await IssueModel.find({ repository: repoId }).populate('author', 'name username');

    res.status(200).json({
      message: "issues fetched",
      payload: issues
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Get single issue
issueRoute.get("/repos/:repoId/issues/:issueId", optionalVerifyToken(), loadRepo("repoId"), requireRepoRead, async (req, res) => {

  const { issueId, repoId } = req.params;

  const issue = await IssueModel.findById(issueId).populate('author', 'name username');

  if (!issue || issue.repository.toString() !== repoId) {
    return res.status(404).json({
      message: "issue not found"
    });
  }

  res.status(200).json({
    message: "issue fetched",
    payload: issue
  });

});


//Update issue 
issueRoute.patch("/repos/:repoId/issues/:issueId", verifyToken("user"), loadRepo("repoId"), requireRepoWrite, async (req, res) => {

  const { issueId, repoId } = req.params;

  const existing = await IssueModel.findById(issueId);
  if (!existing || existing.repository.toString() !== repoId) {
    return res.status(404).json({ message: "issue not found" });
  }

  const allowed = {};
  if (req.body.title !== undefined) allowed.title = req.body.title;
  if (req.body.body !== undefined) allowed.body = req.body.body;
  if (req.body.description !== undefined) allowed.body = req.body.description;
  if (req.body.state !== undefined) {
    if (!["open", "closed"].includes(req.body.state)) {
      return res.status(400).json({ message: "state must be open or closed" });
    }
    allowed.state = req.body.state;
    if (req.body.state === "closed") {
      allowed.closedAt = new Date();
      allowed.closedBy = req.user.userId;
    } else {
      allowed.closedAt = null;
      allowed.closedBy = null;
    }
  }
  if (req.body.labels !== undefined) allowed.labels = req.body.labels;
  if (req.body.assignees !== undefined) allowed.assignees = req.body.assignees;

  const updatedIssue = await IssueModel.findByIdAndUpdate(issueId, allowed, { new: true })
    .populate("author", "name username")
    .populate("assignees", "name username");

  res.status(200).json({
    message: "issue updated",
    payload: updatedIssue
  });

});