import exp from "express";
import { CommentModel } from "../models/commentModel.js";
import { IssueModel } from "../models/issueModel.js";
import { PullModel } from "../models/pullModel.js";
import { RepoModel } from "../models/repoModel.js";
import { UserTypeModel } from "../models/userModel.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { optionalVerifyToken } from "../middlewares/optionalVerifyToken.js";
import notificationService from "../services/notificationService.js";
import { findRepoById, canReadRepo, refToIdString } from "../services/repoAccessService.js";
import { emitToRepo } from "../utils/socketRepoEmit.js";

export const commentRoute = exp.Router();

function normalizeSide(side) {
  if (side === "LEFT" || side === "RIGHT") return side;
  if (side === "left") return "LEFT";
  if (side === "right") return "RIGHT";
  return undefined;
}

async function assertCanReadRepo(repoId, req, res) {
  const repo = await findRepoById(repoId);
  if (!repo) {
    res.status(404).json({ message: "Repository not found" });
    return null;
  }
  if (!canReadRepo(repo, req.user?.userId)) {
    if (!req.user?.userId) {
      res.status(401).json({ message: "Login required to access this private repository" });
    } else {
      res.status(403).json({ message: "You do not have access to this repository" });
    }
    return null;
  }
  return repo;
}

// Generic comment create (requires repository id + issue or pullRequest id in body)
commentRoute.post("/comments", verifyToken("user"), async (req, res) => {
  try {
    const { repository, issue, pullRequest, content, body: bodyText } = req.body;
    const text = content || bodyText;
    if (!text || !repository) {
      return res.status(400).json({ message: "repository and content (or body) are required" });
    }
    const repo = await assertCanReadRepo(repository, req, res);
    if (!repo) return;

    const newComment = new CommentModel({
      body: text,
      author: req.user.userId,
      repository,
      issue: issue || undefined,
      pullRequest: pullRequest || undefined,
    });
    await newComment.save();
    const populated = await CommentModel.findById(newComment._id).populate("author", "name username");
    res.status(201).json({
      message: "comment added",
      payload: populated,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

commentRoute.get("/comments/:parentId", optionalVerifyToken(), async (req, res) => {
  try {
    const { parentId } = req.params;
    const comments = await CommentModel.find({ parentComment: parentId });
    res.status(200).json({
      message: "comments fetched",
      payload: comments,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add comment to issue (optional path/line/side for inline-style notes)
commentRoute.post("/issues/:issueId/comments", verifyToken("user"), async (req, res) => {
  try {
    const { issueId } = req.params;
    const { content, path, line, side } = req.body;

    const issue = await IssueModel.findById(issueId).populate("author", "name username");
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }

    const repo = await assertCanReadRepo(issue.repository, req, res);
    if (!repo) return;

    const newComment = new CommentModel({
      body: content,
      author: req.user.userId,
      repository: issue.repository,
      issue: issueId,
      path: path || undefined,
      line: line != null && line !== "" ? Number(line) : undefined,
      side: normalizeSide(side),
    });

    await newComment.save();

    const populated = await CommentModel.findById(newComment._id).populate("author", "name username");

    const recipients = [issue.author, repo.owner, ...repo.collaborators.map((c) => c.user)]
      .filter(Boolean)
      .map((id) => (id?._id ? id._id : id))
      .filter((id, index, arr) => arr.findIndex((x) => x.toString() === id.toString()) === index)
      .filter((id) => id.toString() !== req.user.userId.toString());

    const actorUser = await UserTypeModel.findById(req.user.userId).select("username name");
    const actorLabel = actorUser?.username || actorUser?.name || "Someone";

    for (const recipientId of recipients) {
      await notificationService.createNotification({
        recipient: recipientId,
        type: "comment_created",
        title: `New comment on issue #${issue.number}`,
        message: `${actorLabel} commented on "${issue.title}"`,
        repository: issue.repository,
        issue: issueId,
        comment: newComment._id,
        actor: req.user.userId,
      });
    }

    emitToRepo(issue.repository, "issue:comment", {
      issueId,
      repositoryId: issue.repository.toString(),
      comment: populated?.toObject?.() || populated,
    });

    res.status(201).json({
      message: "comment added to issue",
      payload: populated,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get comments for issue
commentRoute.get("/issues/:issueId/comments", optionalVerifyToken(), async (req, res) => {
  try {
    const { issueId } = req.params;
    const issue = await IssueModel.findById(issueId);
    if (!issue) {
      return res.status(404).json({ message: "Issue not found" });
    }
    const repo = await assertCanReadRepo(issue.repository, req, res);
    if (!repo) return;

    const comments = await CommentModel.find({ issue: issueId }).populate("author", "name username");

    res.status(200).json({
      message: "comments fetched",
      payload: comments,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add comment to pull request (supports GitHub-style review: path + line + side)
commentRoute.post("/pulls/:prId/comments", verifyToken("user"), async (req, res) => {
  try {
    const { prId } = req.params;
    const { content, path, line, side } = req.body;

    const pr = await PullModel.findById(prId).populate("authorId", "name username");
    if (!pr) {
      return res.status(404).json({ message: "Pull request not found" });
    }

    const repo = await assertCanReadRepo(pr.repoId, req, res);
    if (!repo) return;

    const newComment = new CommentModel({
      body: content,
      author: req.user.userId,
      repository: pr.repoId,
      pullRequest: prId,
      path: path || undefined,
      line: line != null && line !== "" ? Number(line) : undefined,
      side: normalizeSide(side),
    });

    await newComment.save();

    const populated = await CommentModel.findById(newComment._id).populate("author", "name username");

    const recipients = [pr.authorId, repo.owner, ...repo.collaborators.map((c) => c.user)]
      .filter(Boolean)
      .map((id) => (id?._id ? id._id : id))
      .filter((id, index, arr) => arr.findIndex((x) => x.toString() === id.toString()) === index)
      .filter((id) => id.toString() !== req.user.userId.toString());

    const actorUser = await UserTypeModel.findById(req.user.userId).select("username name");
    const actorLabel = actorUser?.username || actorUser?.name || "Someone";

    for (const recipientId of recipients) {
      await notificationService.createNotification({
        recipient: recipientId,
        type: "comment_created",
        title: `New comment on pull request`,
        message: `${actorLabel} commented on "${pr.title}"`,
        repository: pr.repoId,
        pullRequest: prId,
        comment: newComment._id,
        actor: req.user.userId,
      });
    }

    emitToRepo(pr.repoId, "review:comment", {
      pullRequestId: prId,
      repositoryId: pr.repoId.toString(),
      comment: populated?.toObject?.() || populated,
    });

    res.status(201).json({
      message: "comment added to pull request",
      payload: populated,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get comments for pull request
commentRoute.get("/pulls/:prId/comments", optionalVerifyToken(), async (req, res) => {
  try {
    const { prId } = req.params;
    const pr = await PullModel.findById(prId);
    if (!pr) {
      return res.status(404).json({ message: "Pull request not found" });
    }
    const repo = await assertCanReadRepo(pr.repoId, req, res);
    if (!repo) return;

    const comments = await CommentModel.find({ pullRequest: prId }).populate("author", "name username");

    res.status(200).json({
      message: "comments fetched",
      payload: comments,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete comment
commentRoute.delete("/comments/:commentId", verifyToken("user"), async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await CommentModel.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "comment not found" });
    }

    const repo = await RepoModel.findById(comment.repository);
    if (!repo) {
      return res.status(404).json({ message: "Repository not found" });
    }

    const isAuthor = comment.author.toString() === req.user.userId;
    const isOwner = refToIdString(repo.owner) === req.user.userId;
    if (!isAuthor && !isOwner) {
      return res.status(403).json({ message: "You can only delete your own comments (or owner may delete)" });
    }

    await CommentModel.findByIdAndDelete(commentId);

    emitToRepo(comment.repository, "comment:deleted", { commentId, repositoryId: comment.repository.toString() });

    res.status(200).json({
      message: "comment deleted",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
