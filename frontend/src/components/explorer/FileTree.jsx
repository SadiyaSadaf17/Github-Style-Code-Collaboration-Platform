import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { buildFileTree, flattenTreeNodes } from '../../utils/fileLanguage';

export default function FileTree({ repoId, files = [], selectedPath = '' }) {
  const tree = useMemo(() => buildFileTree(files), [files]);
  const [collapsed, setCollapsed] = useState({});

  const rows = useMemo(() => flattenTreeNodes(tree), [tree]);

  const toggleFolder = (path) => {
    setCollapsed((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const visibleRows = rows.filter((row) => {
    if (row.depth === 0) return true;
    const parts = row.path.split('/');
    for (let i = 1; i < parts.length; i += 1) {
      const parentPath = parts.slice(0, i).join('/');
      if (collapsed[parentPath]) return false;
    }
    return true;
  });

  if (!files.length) {
    return <p className="text-sm text-gray-500 p-3">No files in this repository yet.</p>;
  }

  return (
    <nav className="text-sm font-mono border-r border-[#d0d7de] bg-[#f6f8fa] min-h-[200px]">
      {visibleRows.map((row) => {
        const isSelected = selectedPath === row.path;
        const paddingLeft = 8 + row.depth * 12;

        if (!row.isFile) {
          const isOpen = !collapsed[row.path];
          return (
            <button
              key={`folder-${row.path}`}
              type="button"
              onClick={() => toggleFolder(row.path)}
              className="w-full flex items-center gap-1 py-1.5 px-2 hover:bg-[#eef1f4] text-left text-[#1f2328]"
              style={{ paddingLeft }}
            >
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Folder size={14} className="text-[#54aeff] shrink-0" />
              <span className="truncate">{row.name}</span>
            </button>
          );
        }

        return (
          <Link
            key={`file-${row.path}`}
            to={`/repo/${repoId}/blob/${row.path}`}
            className={`flex items-center gap-1 py-1.5 px-2 hover:bg-[#eef1f4] ${
              isSelected ? 'bg-white border-l-2 border-[#0969da] font-semibold' : ''
            }`}
            style={{ paddingLeft: paddingLeft + 14 }}
          >
            <File size={14} className="text-gray-500 shrink-0" />
            <span className="truncate text-[#0969da]">{row.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
