import { Schema, model } from "mongoose";

const commitSchema = new Schema(
  {
    sha: {
      type: String,
      required: true,
      unique: true
    },

    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true
    },

    committer: {
      type: Schema.Types.ObjectId,
      ref: "user"
    },

    message: {
      type: String,
      required: true
    },

    tree: {
      type: String,
      required: true
    },

    parents: [{
      type: String
    }],

    branch: {
      type: String,
      required: true
    },

    files: [{
      filename: String,
      status: {
        type: String,
        enum: ["added", "modified", "deleted", "renamed"]
      },
      additions: Number,
      deletions: Number,
      changes: Number,
      patch: String,
      blobId: String
    }],

    stats: {
      additions: Number,
      deletions: Number,
      total: Number
    },

    verified: {
      type: Boolean,
      default: false
    },

    signature: String
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes
commitSchema.index({ repository: 1, sha: 1 }, { unique: true });
commitSchema.index({ repository: 1, branch: 1 });
commitSchema.index({ author: 1 });
commitSchema.index({ createdAt: -1 });

export const CommitModel = model("commit", commitSchema);