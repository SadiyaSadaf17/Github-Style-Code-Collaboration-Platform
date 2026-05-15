/**
 * Broadcast to everyone in a repository Socket.io room (see server.js join-repo).
 */
export function emitToRepo(repoId, event, payload) {
  if (!global.io || !repoId) return;
  const id = typeof repoId === "string" ? repoId : repoId.toString();
  global.io.to(`repo:${id}`).emit(event, payload);
}
