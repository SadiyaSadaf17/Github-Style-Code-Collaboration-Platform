import { Schema, model } from "mongoose";

const commentSchema = new Schema({
  body: {
    type: String,
    required: true
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true
  },
  repository: {
    type: Schema.Types.ObjectId,
    ref: "Repository",
    required: true
  },
  issue: {
    type: Schema.Types.ObjectId,
    ref: "Issue"
  },
  pullRequest: {
    type: Schema.Types.ObjectId,
    ref: "pull"
  },
  commit: {
    type: Schema.Types.ObjectId,
    ref: "commit"
  },
  parentComment: {
    type: Schema.Types.ObjectId,
    ref: "Comment"
  },
  line: Number,
  path: String,
  side: {
    type: String,
    enum: ["LEFT", "RIGHT"]
  },
  startLine: Number,
  startSide: {
    type: String,
    enum: ["LEFT", "RIGHT"]
  },
  originalPosition: Number,
  position: Number,
  reactions: [{
    type: {
      type: String,
      enum: ["+1", "-1", "laugh", "confused", "heart", "hooray", "rocket", "eyes"]
    },
    users: [{
      type: Schema.Types.ObjectId,
      ref: "user"
    }]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
commentSchema.index({ repository: 1 });
commentSchema.index({ issue: 1 });
commentSchema.index({ pullRequest: 1 });
commentSchema.index({ commit: 1 });
commentSchema.index({ author: 1 });
commentSchema.index({ createdAt: -1 });

export const CommentModel = model("comment", commentSchema);