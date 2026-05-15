import { Schema, model } from "mongoose";

const issueSchema = new Schema(
  {
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
      enum: ["open", "closed"],
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
    labels: [{
      name: String,
      color: String,
      description: String
    }],
    milestone: {
      type: Schema.Types.ObjectId,
      ref: "Milestone"
    },
    comments: [{
      type: Schema.Types.ObjectId,
      ref: "Comment"
    }],
    locked: {
      type: Boolean,
      default: false
    },
    pullRequest: {
      type: Schema.Types.ObjectId,
      ref: "PullRequest"
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    closedAt: Date,
    closedBy: {
      type: Schema.Types.ObjectId,
      ref: "user"
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes
issueSchema.index({ repository: 1, number: 1 }, { unique: true });
issueSchema.index({ author: 1 });
issueSchema.index({ state: 1 });
issueSchema.index({ "assignees": 1 });
issueSchema.index({ "labels.name": 1 });
issueSchema.index({ createdAt: -1 });

export const IssueModel = model("issue", issueSchema);