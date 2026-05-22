import { Schema, model } from "mongoose";

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, index: true },
    resourceId: { type: String },
    status: { type: String, enum: ["success", "failure"], default: "success" },
    ip: String,
    userAgent: String,
    requestId: String,
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLogModel = model("AuditLog", auditLogSchema);
