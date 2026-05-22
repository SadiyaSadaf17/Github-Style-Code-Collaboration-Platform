import { createHash } from "crypto";
import { RepoModel } from "../models/repoModel.js";
import { IssueModel } from "../models/issueModel.js";
import { PullModel } from "../models/pullModel.js";
import { FileModel } from "../models/fileModel.js";
import { UserTypeModel } from "../models/userModel.js";
import { canReadRepo } from "./repoAccessService.js";
import { cacheGet, cacheSet } from "./cacheService.js";

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function getAccessibleRepoIds(userId) {
  if (!userId) return { publicOnly: true, ids: [] };
  const repos = await RepoModel.find({
    $or: [{ owner: userId }, { "collaborators.user": userId }],
  }).select("_id");
  return { publicOnly: false, ids: repos.map((r) => r._id) };
}

export async function globalSearch({ q, types = [], userId, limit = 15 }) {
  const query = (q || "").trim();
  if (!query || query.length < 2) {
    return { repositories: [], issues: [], pullRequests: [], users: [], code: [] };
  }

  const regex = new RegExp(escapeRegex(query), "i");
  const want = types.length ? types : ["repositories", "issues", "pullRequests", "users", "code"];
  const cap = Math.min(Math.max(limit, 1), 30);
  const access = await getAccessibleRepoIds(userId);

  const repoFilter = access.publicOnly
    ? { isPrivate: false, $or: [{ name: regex }, { description: regex }, { fullName: regex }, { topics: regex }] }
    : {
        $or: [
          { isPrivate: false, $or: [{ name: regex }, { description: regex }, { fullName: regex }, { topics: regex }] },
          {
            _id: { $in: access.ids },
            $or: [{ name: regex }, { description: regex }, { fullName: regex }, { topics: regex }],
          },
        ],
      };

  const results = {
    repositories: [],
    issues: [],
    pullRequests: [],
    users: [],
    code: [],
  };

  if (want.includes("repositories")) {
    const repos = await RepoModel.find(repoFilter)
      .populate("owner", "username name avatar")
      .sort({ updatedAt: -1 })
      .limit(cap);
    results.repositories = repos.map((r) => ({
      _id: r._id,
      name: r.name,
      fullName: r.fullName,
      description: r.description,
      isPrivate: r.isPrivate,
      owner: r.owner,
      stats: r.stats,
    }));
  }

  let readableRepoIds = [];
  if (!access.publicOnly) {
    const publicRepos = await RepoModel.find({ isPrivate: false }).select("_id");
    readableRepoIds = [
      ...new Set([
        ...publicRepos.map((r) => r._id.toString()),
        ...access.ids.map((id) => id.toString()),
      ]),
    ];
  } else {
    const publicRepos = await RepoModel.find({ isPrivate: false }).select("_id");
    readableRepoIds = publicRepos.map((r) => r._id.toString());
  }

  const repoScope =
    readableRepoIds.length > 0 ? { $in: readableRepoIds } : { $in: ["000000000000000000000000"] };

  if (want.includes("issues")) {
    const issues = await IssueModel.find({
      repository: repoScope,
      $or: [{ title: regex }, { body: regex }],
    })
      .populate("author", "username name avatar")
      .populate("repository", "name fullName owner")
      .sort({ updatedAt: -1 })
      .limit(cap);
    results.issues = issues;
  }

  if (want.includes("pullRequests")) {
    const pulls = await PullModel.find({
      repoId: repoScope,
      $or: [{ title: regex }, { description: regex }],
    })
      .populate("authorId", "username name avatar")
      .sort({ updatedAt: -1 })
      .limit(cap);

    results.pullRequests = await Promise.all(
      pulls.map(async (pr) => {
        const repo = await RepoModel.findById(pr.repoId).select("name fullName");
        return { ...pr.toObject(), repository: repo };
      })
    );
  }

  if (want.includes("users")) {
    const users = await UserTypeModel.find({
      isActive: { $ne: false },
      $or: [{ username: regex }, { name: regex }, { bio: regex }],
    })
      .select("username name bio avatar")
      .limit(cap);
    results.users = users;
  }

  if (want.includes("code") && userId) {
    const files = await FileModel.find({
      repoId: repoScope,
      $or: [{ path: regex }, { content: regex }],
    })
      .select("repoId path content")
      .limit(cap * 2);

    const filtered = [];
    for (const f of files) {
      const repo = await RepoModel.findById(f.repoId);
      if (repo && canReadRepo(repo, userId)) {
        const snippet = (f.content || "").slice(0, 120);
        filtered.push({
          repoId: f.repoId,
          path: f.path,
          snippet,
          repositoryName: repo.name,
        });
        if (filtered.length >= cap) break;
      }
    }
    results.code = filtered;
  } else if (want.includes("code")) {
    const files = await FileModel.find({
      repoId: repoScope,
      $or: [{ path: regex }],
    })
      .select("repoId path")
      .limit(cap);
    results.code = await Promise.all(
      files.map(async (f) => {
        const repo = await RepoModel.findById(f.repoId).select("name");
        return {
          repoId: f.repoId,
          path: f.path,
          repositoryName: repo?.name,
        };
      })
    );
  }

  return results;
}

function searchCacheKey({ q, types, userId, limit }) {
  const raw = JSON.stringify({
    q: (q || "").trim().toLowerCase(),
    types: [...(types || [])].sort(),
    userId: userId ? String(userId) : "anon",
    limit,
  });
  return `search:${createHash("sha256").update(raw).digest("hex").slice(0, 24)}`;
}

/** Cached search with optional background warm via BullMQ. */
export async function cachedGlobalSearch(params) {
  const key = searchCacheKey(params);
  const hit = await cacheGet(key);
  if (hit) return hit;

  const payload = await globalSearch(params);
  await cacheSet(key, payload, 90);
  import("./queueService.js")
    .then((m) => m.enqueueSearchIndex({ cacheKey: key, ...params }))
    .catch(() => {});
  return payload;
}
