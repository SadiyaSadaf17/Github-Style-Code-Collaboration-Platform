import { Schema, model } from "mongoose";

const repoSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Repository name is required"],
      minlength: 1,
      maxlength: 100
    },

    fullName: {
      type: String,
      required: true
    },

    description: {
      type: String,
      maxlength: 500
    },

    owner: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: [true, "Owner is required"]
    },

    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization"
    },

    isPrivate: {
      type: Boolean,
      default: false
    },

    isArchived: {
      type: Boolean,
      default: false
    },

    isFork: {
      type: Boolean,
      default: false
    },

    forkedFrom: {
      type: Schema.Types.ObjectId,
      ref: "Repository"
    },

    defaultBranch: {
      type: String,
      default: "main"
    },

    language: String,
    topics: [String],
    homepage: String,
    license: String,

    size: {
      type: Number,
      default: 0
    },

    collaborators: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: true
      },
      /** Team role: collaborator (read + write) or viewer (read-only). Owner is always `owner` field. */
      role: {
        type: String,
        enum: ["collaborator", "viewer"],
        default: "viewer"
      },
      /** @deprecated Legacy field; use `role`. Still read by repoAccessService for old documents. */
      permission: {
        type: String,
        enum: ["read", "write", "admin"]
      },
      addedBy: {
        type: Schema.Types.ObjectId,
        ref: "user"
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],

    teams: [{
      team: {
        type: Schema.Types.ObjectId,
        ref: "Team"
      },
      permission: {
        type: String,
        enum: ["read", "write", "admin"],
        default: "read"
      }
    }],

    branches: [{
      name: String,
      sha: String,
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
      }
    }],

    stats: {
      stars: {
        type: Number,
        default: 0
      },
      forks: {
        type: Number,
        default: 0
      },
      watchers: {
        type: Number,
        default: 0
      },
      network: {
        type: Number,
        default: 0
      }
    },

    settings: {
      issues: {
        type: Boolean,
        default: true
      },
      wiki: {
        type: Boolean,
        default: true
      },
      projects: {
        type: Boolean,
        default: true
      },
      mergeCommit: {
        type: Boolean,
        default: true
      },
      squashMerge: {
        type: Boolean,
        default: true
      },
      rebaseMerge: {
        type: Boolean,
        default: true
      }
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes
repoSchema.index({ owner: 1, name: 1 }, { unique: true });
repoSchema.index({ fullName: 1 }, { unique: true });
repoSchema.index({ "collaborators.user": 1 });
repoSchema.index({ "teams.team": 1 });
repoSchema.index({ isPrivate: 1 });
repoSchema.index({ language: 1 });
repoSchema.index({ topics: 1 });
repoSchema.index({ "stats.stars": -1 });
repoSchema.index({ createdAt: -1 });

/** Single model name matches `ref: "Repository"` on User and Organization. */
export const RepoModel = model("Repository", repoSchema);