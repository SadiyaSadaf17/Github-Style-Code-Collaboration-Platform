import { Schema, model } from "mongoose";

const pullSchema = new Schema(
  {
    repoId: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true
    },

    authorId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true
    },

    title: {
      type: String,
      required: true
    },

    description: {
      type: String
    },

    fromBranch: {
      type: String,
      required: true
    },

    toBranch: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: ["OPEN", "MERGED", "CLOSED"],
      default: "OPEN"
    },

    /** Snapshot of file contents on the base branch when the PR was opened (for diffs). */
    fileSnapshots: [
      {
        filename: { type: String, required: true },
        baseContent: { type: String, default: "" },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const PullModel = model("pull", pullSchema);