/** Map file path extension to Monaco / Prism language id. */
export function getLanguageFromPath(filePath = '') {
  const name = filePath.split('/').pop() || '';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  const map = {
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    md: 'markdown',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'scss',
    less: 'less',
    py: 'python',
    java: 'java',
    go: 'go',
    rs: 'rust',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    c: 'c',
    h: 'c',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    yml: 'yaml',
    yaml: 'yaml',
    xml: 'xml',
    sql: 'sql',
    vue: 'html',
    dockerfile: 'dockerfile',
  };
  if (name.toLowerCase() === 'dockerfile') return 'dockerfile';
  return map[ext] || 'plaintext';
}

/** Build nested tree from flat file paths. */
export function buildFileTree(files = []) {
  const root = { name: '', path: '', children: {}, isFile: false };

  for (const file of files) {
    const path = file.path || file.filename || '';
    if (!path) continue;
    const parts = path.split('/').filter(Boolean);
    let node = root;
    let currentPath = '';

    parts.forEach((part, i) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = i === parts.length - 1;
      if (!node.children[part]) {
        node.children[part] = {
          name: part,
          path: currentPath,
          children: {},
          isFile,
        };
      }
      node = node.children[part];
      if (isFile) node.isFile = true;
    });
  }

  return root;
}

export function flattenTreeNodes(node, depth = 0) {
  const entries = Object.values(node.children || {}).sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  const rows = [];
  for (const child of entries) {
    rows.push({ ...child, depth });
    if (!child.isFile) {
      rows.push(...flattenTreeNodes(child, depth + 1));
    }
  }
  return rows;
}
