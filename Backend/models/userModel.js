import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      minlength: 3,
      maxlength: 30,
      lowercase: true,
      trim: true
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: function() {
        return !this.oauthProviders || this.oauthProviders.length === 0;
      }
    },

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true
    },

    bio: {
      type: String,
      maxlength: 500
    },

    avatar: {
      type: String // S3 URL
    },

    location: String,
    website: String,
    company: String,

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },

    emailVerified: {
      type: Boolean,
      default: false
    },

    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,

    refreshTokens: [{
      token: String,
      createdAt: {
        type: Date,
        default: Date.now
      },
      userAgent: String,
      ipAddress: String
    }],

    oauthProviders: [{
      provider: {
        type: String,
        enum: ["google", "github"]
      },
      providerId: String,
      providerData: Schema.Types.Mixed
    }],

    followers: [{
      type: Schema.Types.ObjectId,
      ref: "user"
    }],

    following: [{
      type: Schema.Types.ObjectId,
      ref: "user"
    }],

    organizations: [{
      organization: {
        type: Schema.Types.ObjectId,
        ref: "Organization"
      },
      role: {
        type: String,
        enum: ["owner", "admin", "member"]
      }
    }],

    teams: [{
      team: {
        type: Schema.Types.ObjectId,
        ref: "Team"
      },
      role: {
        type: String,
        enum: ["maintainer", "member"]
      }
    }],

    repositories: [{
      type: Schema.Types.ObjectId,
      ref: "Repository"
    }],

    starredRepos: [{
      type: Schema.Types.ObjectId,
      ref: "Repository"
    }],

    contributionStats: {
      commits: { type: Number, default: 0 },
      pullRequests: { type: Number, default: 0 },
      issues: { type: Number, default: 0 },
      repositories: { type: Number, default: 0 }
    },

    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "auto"],
        default: "auto"
      },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false }
      }
    },

    isActive: {
      type: Boolean,
      default: true
    },

    lastLogin: Date,
    lastActivity: Date
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes
// Note: email and username already have indexes from 'unique: true' in schema
userSchema.index({ "organizations.organization": 1 });
userSchema.index({ "teams.team": 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastActivity: -1 });

export const UserTypeModel = model("user", userSchema);