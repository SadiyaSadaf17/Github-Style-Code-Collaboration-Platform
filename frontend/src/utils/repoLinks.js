/** Deep-link into RepoExplorer issue/PR create forms. */
export function repoTabCreateUrl(repoId, tab) {
  if (!repoId) return '/';
  const safeTab = tab === 'pulls' ? 'pulls' : 'issues';
  return `/repo/${repoId}?tab=${safeTab}&create=1`;
}
