import { Schema, model } from "mongoose";

const fileSchema = new Schema(
  {
    repoId: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: [true, "Repository id required"],
    },

    path: {
      type: String,
      required: [true, "File path required"],
    },

    content: {
      type: String,
      required: [true, "File content required"],
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const FileModel = model("file", fileSchema);