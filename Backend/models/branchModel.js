import { Schema, model } from "mongoose";

const branchSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  repository: {
    type: Schema.Types.ObjectId,
    ref: "Repository",
    required: true
  },
  sha: {
    type: String,
    required: true
  },
  commit: {
    type: Schema.Types.ObjectId,
    ref: "commit"
  },
  protected: {
    type: Boolean,
    default: false
  },
  protectionRules: {
    requiredStatusChecks: [String],
    enforceAdmins: Boolean,
    requiredPullRequestReviews: {
      requiredApprovingReviewCount: Number,
      dismissStaleReviews: Boolean,
      requireCodeOwnerReviews: Boolean,
      dismissalRestrictions: {
        users: [{
          type: Schema.Types.ObjectId,
          ref: "user"
        }],
        teams: [{
          type: Schema.Types.ObjectId,
          ref: "Team"
        }]
      }
    },
    restrictions: {
      users: [{
        type: Schema.Types.ObjectId,
        ref: "user"
      }],
      teams: [{
        type: Schema.Types.ObjectId,
        ref: "Team"
      }]
    },
    allowForcePushes: Boolean,
    allowDeletions: Boolean
  },
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
branchSchema.index({ repository: 1, name: 1 }, { unique: true });

export const Branch = model("branch", branchSchema);