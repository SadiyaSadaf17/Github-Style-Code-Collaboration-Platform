import { Schema, model } from "mongoose";

const organizationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    login: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    description: {
      type: String,
      default: "",
    },

    avatar: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    website: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      default: "",
    },

    billingEmail: {
      type: String,
      default: "",
    },

    owners: [
      {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: true,
      },
    ],

    members: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "user",
          required: true,
        },

        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        },

        addedBy: {
          type: Schema.Types.ObjectId,
          ref: "user",
        },

        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    repositories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Repository",
      },
    ],

    teams: [
      {
        type: Schema.Types.ObjectId,
        ref: "Team",
      },
    ],

    isVerified: {
      type: Boolean,
      default: false,
    },

    plan: {
      name: {
        type: String,
        enum: ["free", "team", "enterprise"],
        default: "free",
      },

      seats: {
        type: Number,
        default: 1,
      },

      privateRepos: {
        type: Number,
        default: 5,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
organizationSchema.index({ owners: 1 });
organizationSchema.index({ "members.user": 1 });

export const Organization = model("organization", organizationSchema);