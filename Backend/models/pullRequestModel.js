import { Schema, model } from "mongoose";

const pullRequestSchema = new Schema({
  number: {
    type: Number,
    required: true
  },
  repository: {
    type: Schema.Types.ObjectId,
    ref: "Repository",
    required: true
  },
  title: {
    type: String,
    required: true
  },
  body: String,
  state: {
    type: String,
    enum: ["open", "closed", "merged"],
    default: "open"
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  assignees: [{
    type: Schema.Types.ObjectId,
    ref: "user"
  }],
  reviewers: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: "user"
    },
    state: {
      type: String,
      enum: ["pending", "approved", "changes_requested", "dismissed"]
    },
    reviewedAt: Date
  }],
  labels: [{
    name: String,
    color: String,
    description: String
  }],
  milestone: {
    type: Schema.Types.ObjectId,
    ref: "Milestone"
  },
  head: {
    ref: String,
    sha: String,
    repo: {
      type: Schema.Types.ObjectId,
      ref: "Repository"
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "user"
    }
  },
  base: {
    ref: String,
    sha: String,
    repo: {
      type: Schema.Types.ObjectId,
      ref: "Repository"
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "user"
    }
  },
  mergeCommitSha: String,
  mergedAt: Date,
  mergedBy: {
    type: Schema.Types.ObjectId,
    ref: "user"
  },
  mergeable: {
    type: String,
    enum: ["mergeable", "conflicting", "unknown"],
    default: "unknown"
  },
  rebaseable: {
    type: Boolean,
    default: true
  },
  mergeableState: {
    type: String,
    enum: ["clean", "has_hooks", "unknown", "blocked", "behind", "unstable"],
    default: "unknown"
  },
  commits: [{
    type: Schema.Types.ObjectId,
    ref: "commit"
  }],
  changedFiles: Number,
  additions: Number,
  deletions: Number,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  closedAt: Date
}, {
  timestamps: true
});

// Indexes
pullRequestSchema.index({ repository: 1, number: 1 }, { unique: true });
pullRequestSchema.index({ author: 1 });
pullRequestSchema.index({ state: 1 });
pullRequestSchema.index({ "assignees": 1 });
pullRequestSchema.index({ createdAt: -1 });

export const PullRequest = model("pullrequest", pullRequestSchema);