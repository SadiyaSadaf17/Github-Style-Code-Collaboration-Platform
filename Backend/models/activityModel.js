import { Schema, model } from "mongoose";

const activitySchema = new Schema({
  actor: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  type: {
    type: String,
    enum: [
      "commit",
      "issue_opened",
      "issue_closed",
      "issue_reopened",
      "pr_opened",
      "pr_closed",
      "pr_merged",
      "comment",
      "repo_created",
      "repo_forked",
      "repo_starred",
      "branch_created",
      "branch_deleted",
      "tag_created",
      "release_published",
      "member_added",
      "team_created"
    ],
    required: true
  },
  repository: {
    type: Schema.Types.ObjectId,
    ref: "Repository"
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: "Organization"
  },
  payload: Schema.Types.Mixed,
  public: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
activitySchema.index({ actor: 1, createdAt: -1 });
activitySchema.index({ repository: 1, createdAt: -1 });
activitySchema.index({ organization: 1, createdAt: -1 });
activitySchema.index({ type: 1 });
activitySchema.index({ public: 1, createdAt: -1 });

export const Activity = model("activity", activitySchema);