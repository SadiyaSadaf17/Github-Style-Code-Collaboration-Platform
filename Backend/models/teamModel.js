import { Schema, model } from "mongoose";

const teamSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true
  },
  description: String,
  organization: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true
  },
  privacy: {
    type: String,
    enum: ["secret", "closed"],
    default: "secret"
  },
  permission: {
    type: String,
    enum: ["pull", "push", "admin"],
    default: "pull"
  },
  members: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
    role: {
      type: String,
      enum: ["member", "maintainer"],
      default: "member"
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
  repositories: [{
    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true
    },
    permission: {
      type: String,
      enum: ["pull", "push", "admin"],
      default: "pull"
    }
  }],
  parentTeam: {
    type: Schema.Types.ObjectId,
    ref: "Team"
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
teamSchema.index({ organization: 1, slug: 1 }, { unique: true });
teamSchema.index({ "members.user": 1 });
teamSchema.index({ "repositories.repository": 1 });

export const Team = model("team", teamSchema);