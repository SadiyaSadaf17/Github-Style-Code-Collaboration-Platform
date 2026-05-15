import { Schema, model } from "mongoose";

const notificationSchema = new Schema({
  recipient: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  type: {
    type: String,
    enum: [
      "issue_opened",
      "issue_closed",
      "issue_reopened",
      "issue_assigned",
      "pr_opened",
      "pr_closed",
      "pr_merged",
      "pr_review_requested",
      "pr_review_submitted",
      "comment_created",
      "mention",
      "team_invite",
      "repo_invite",
      "security_alert"
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: String,
  repository: {
    type: Schema.Types.ObjectId,
    ref: "Repository"
  },
  actor: {
    type: Schema.Types.ObjectId,
    ref: "user"
  },
  issue: {
    type: Schema.Types.ObjectId,
    ref: "Issue"
  },
  pullRequest: {
    type: Schema.Types.ObjectId,
    ref: "PullRequest"
  },
  comment: {
    type: Schema.Types.ObjectId,
    ref: "Comment"
  },
  team: {
    type: Schema.Types.ObjectId,
    ref: "Team"
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  url: String,
  metadata: Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });

export const NotificationModel = model("notification", notificationSchema);