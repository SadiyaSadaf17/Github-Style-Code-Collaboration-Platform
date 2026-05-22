/** Encode file path for URL segment after /blob/ */
export function encodeRepoFilePath(filePath) {
  if (!filePath) return '';
  return filePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

/** Decode splat param from react-router into file path */
export function decodeRepoFilePath(splat) {
  if (!splat) return '';
  return splat
    .split('/')
    .map((segment) => decodeURIComponent(segment))
    .join('/');
}

export function repoBlobUrl(repoId, filePath) {
  return `/repo/${repoId}/blob/${encodeRepoFilePath(filePath)}`;
}
