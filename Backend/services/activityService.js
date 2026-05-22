import { Activity } from "../models/activityModel.js";

export async function recordActivity({ actor, type, repository, organization, payload, isPublic = true }) {
  if (!actor || !type) return null;
  try {
    const doc = new Activity({
      actor,
      type,
      repository: repository || undefined,
      organization: organization || undefined,
      payload: payload || {},
      public: isPublic,
    });
    await doc.save();
    return doc;
  } catch (err) {
    console.error("recordActivity failed:", err.message);
    return null;
  }
}

export default { recordActivity };
