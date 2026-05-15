import {
  canReadRepo,
  canWriteRepo,
  canManageTeam,
  findRepoById,
  getRepoTeamRole,
} from "../services/repoAccessService.js";

/**
 * Loads repo from req.params[param] into req.repo and sets req.repoTeamRole for req.user.
 */
export function loadRepo(param = "id") {
  return async (req, res, next) => {
    try {
      const repoId = req.params[param];
      const repo = await findRepoById(repoId);
      if (!repo) {
        return res.status(404).json({ message: "Repository not found" });
      }
      req.repo = repo;
      req.repoTeamRole = req.user?.userId ? getRepoTeamRole(repo, req.user.userId) : null;
      next();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
}

export function requireRepoRead(req, res, next) {
  if (!canReadRepo(req.repo, req.user?.userId)) {
    if (!req.user?.userId) {
      return res.status(401).json({ message: "Login required to access this private repository" });
    }
    return res.status(403).json({ message: "You do not have access to this repository" });
  }
  next();
}

export function requireRepoWrite(req, res, next) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Unauthorized. Please login" });
  }
  if (!canWriteRepo(req.repo, req.user.userId)) {
    return res.status(403).json({ message: "Write access required (owner or collaborator)" });
  }
  next();
}

export function requireRepoOwner(req, res, next) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Unauthorized. Please login" });
  }
  if (getRepoTeamRole(req.repo, req.user.userId) !== "owner") {
    return res.status(403).json({ message: "Only the repository owner can perform this action" });
  }
  next();
}

export function requireManageTeam(req, res, next) {
  if (!req.user?.userId) {
    return res.status(401).json({ message: "Unauthorized. Please login" });
  }
  if (!canManageTeam(req.repo, req.user.userId)) {
    return res.status(403).json({ message: "Only the owner can manage team members" });
  }
  next();
}
