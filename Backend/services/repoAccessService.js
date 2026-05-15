import { RepoModel } from "../models/repoModel.js";

/** Resolve Mongo id from ObjectId, populated subdoc, or string. */
export function refToIdString(ref) {
  if (ref == null) return "";
  if (typeof ref === "string") return ref;
  if (typeof ref === "object" && ref._id != null) return ref._id.toString();
  return ref.toString();
}

/**
 * Normalize collaborator entry: supports legacy `permission` (read/write/admin) and `role` (collaborator/viewer).
 */
export function effectiveCollaboratorRole(collab) {
  if (!collab) return "viewer";
  if (collab.role === "collaborator" || collab.role === "viewer") {
    return collab.role;
  }
  const p = collab.permission;
  if (p === "write" || p === "admin") return "collaborator";
  return "viewer";
}

/**
 * @returns {"owner"|"collaborator"|"viewer"|null}
 */
export function getRepoTeamRole(repo, userId) {
  if (!repo || !userId) return null;
  const uid = userId.toString();
  if (refToIdString(repo.owner) === uid) return "owner";
  const entry = repo.collaborators?.find((c) => refToIdString(c.user) === uid);
  if (!entry) return null;
  return effectiveCollaboratorRole(entry);
}

export function canReadRepo(repo, userId) {
  if (!repo?.isPrivate) return true;
  return !!getRepoTeamRole(repo, userId);
}

export function canWriteRepo(repo, userId) {
  const r = getRepoTeamRole(repo, userId);
  return r === "owner" || r === "collaborator";
}

export function canManageTeam(repo, userId) {
  return getRepoTeamRole(repo, userId) === "owner";
}

export async function findRepoById(repoId, populate = true) {
  let q = RepoModel.findById(repoId);
  if (populate) {
    q = q
      .populate("owner", "name username email")
      .populate("collaborators.user", "name username email");
  }
  return q.exec();
}
