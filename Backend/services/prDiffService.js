import { diffLines } from "diff";
import { FileModel } from "../models/fileModel.js";
import { PullModel } from "../models/pullModel.js";

function splitLines(text) {
  if (text == null || text === "") return [];
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/**
 * Convert diffLines output into structured hunks with line numbers.
 */
export function buildLineChanges(oldContent, newContent) {
  const parts = diffLines(oldContent || "", newContent || "");
  const changes = [];
  let oldLine = 1;
  let newLine = 1;

  for (const part of parts) {
    const lines = splitLines(part.value);
    if (lines.length === 0 && part.value === "\n") {
      lines.push("");
    }

    for (const content of lines) {
      if (part.added) {
        changes.push({
          type: "add",
          content,
          lineNumber: newLine,
          oldLineNumber: null,
          newLineNumber: newLine,
        });
        newLine += 1;
      } else if (part.removed) {
        changes.push({
          type: "remove",
          content,
          lineNumber: oldLine,
          oldLineNumber: oldLine,
          newLineNumber: null,
        });
        oldLine += 1;
      } else {
        changes.push({
          type: "context",
          content,
          lineNumber: oldLine,
          oldLineNumber: oldLine,
          newLineNumber: newLine,
        });
        oldLine += 1;
        newLine += 1;
      }
    }
  }

  return changes;
}

function summarizeFile(changes) {
  let additions = 0;
  let deletions = 0;
  for (const c of changes) {
    if (c.type === "add") additions += 1;
    if (c.type === "remove") deletions += 1;
  }
  return { additions, deletions };
}

/**
 * Capture current repo files as the PR base snapshot (called when PR is opened).
 */
export async function snapshotRepoFilesForPull(repoId) {
  const files = await FileModel.find({ repoId }).select("path content");
  return files.map((f) => ({
    filename: f.path,
    baseContent: f.content ?? "",
  }));
}

/**
 * Build multi-file diff: base = PR snapshot, head = live file content in DB.
 */
export async function buildPullRequestDiff(prId, repoId) {
  const pr = await PullModel.findById(prId);
  if (!pr || pr.repoId.toString() !== repoId.toString()) {
    return null;
  }

  let snapshots = pr.fileSnapshots || [];
  if (snapshots.length === 0) {
    snapshots = await snapshotRepoFilesForPull(repoId);
    pr.fileSnapshots = snapshots;
    await pr.save();
  }

  const currentFiles = await FileModel.find({ repoId }).select("path content");
  const headByPath = new Map(currentFiles.map((f) => [f.path, f.content ?? ""]));
  const baseByPath = new Map(snapshots.map((s) => [s.filename, s.baseContent ?? ""]));

  const allPaths = new Set([...baseByPath.keys(), ...headByPath.keys()]);
  const files = [];

  for (const filename of [...allPaths].sort()) {
    const baseContent = baseByPath.get(filename) ?? "";
    const headContent = headByPath.get(filename) ?? "";

    if (baseContent === headContent) {
      continue;
    }

    const changes = buildLineChanges(baseContent, headContent);
    if (changes.length === 0) continue;

    const stats = summarizeFile(changes);
    let status = "modified";
    if (!baseByPath.has(filename)) status = "added";
    if (!headByPath.has(filename)) status = "removed";

    files.push({
      filename,
      status,
      additions: stats.additions,
      deletions: stats.deletions,
      changes,
    });
  }

  return {
    pullRequestId: prId.toString(),
    fromBranch: pr.fromBranch,
    toBranch: pr.toBranch,
    files,
  };
}
