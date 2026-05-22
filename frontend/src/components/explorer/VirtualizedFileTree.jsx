import React, { useMemo, useState, useRef, useCallback } from 'react';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { buildFileTree, flattenTreeNodes } from '../../utils/fileLanguage';
import FileContextMenu from './FileContextMenu';

const ROW_HEIGHT = 28;
const VIEWPORT_HEIGHT = 420;

export default function VirtualizedFileTree({
  repoId,
  files = [],
  selectedPath = '',
  canWrite = false,
  onSelectFile,
  onRenameFile,
  onDeleteFile,
}) {
  const tree = useMemo(() => buildFileTree(files), [files]);
  const [collapsed, setCollapsed] = useState({});
  const [scrollTop, setScrollTop] = useState(0);
  const [menu, setMenu] = useState(null);
  const scrollRef = useRef(null);

  const rows = useMemo(() => flattenTreeNodes(tree), [tree]);

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (row.depth === 0) return true;
      const parts = row.path.split('/');
      for (let i = 1; i < parts.length; i += 1) {
        const parentPath = parts.slice(0, i).join('/');
        if (collapsed[parentPath]) return false;
      }
      return true;
    });
  }, [rows, collapsed]);

  const totalHeight = visibleRows.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 2);
  const endIndex = Math.min(
    visibleRows.length,
    startIndex + Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + 4
  );
  const slice = visibleRows.slice(startIndex, endIndex);

  const toggleFolder = useCallback((path) => {
    setCollapsed((prev) => ({ ...prev, [path]: !prev[path] }));
  }, []);

  const handleContextMenu = (e, row) => {
    if (!row.isFile) return;
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, path: row.path });
  };

  if (!files.length) {
    return <p className="text-sm text-gray-500 p-3">No files in this repository yet.</p>;
  }

  return (
    <>
      <div
        ref={scrollRef}
        className="text-sm font-mono bg-[#f6f8fa] overflow-y-auto"
        style={{ height: VIEWPORT_HEIGHT }}
        onScroll={(e) => setScrollTop(e.target.scrollTop)}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${startIndex * ROW_HEIGHT}px)` }}>
            {slice.map((row) => {
              const isSelected = selectedPath === row.path;
              const paddingLeft = 8 + row.depth * 12;

              if (!row.isFile) {
                const isOpen = !collapsed[row.path];
                return (
                  <button
                    key={`folder-${row.path}`}
                    type="button"
                    onClick={() => toggleFolder(row.path)}
                    className="w-full flex items-center gap-1 hover:bg-[#eef1f4] text-left text-[#1f2328]"
                    style={{ height: ROW_HEIGHT, paddingLeft }}
                  >
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <Folder size={14} className="text-[#54aeff] shrink-0" />
                    <span className="truncate">{row.name}</span>
                  </button>
                );
              }

              return (
                <button
                  key={`file-${row.path}`}
                  type="button"
                  onClick={() => onSelectFile?.(row.path)}
                  onContextMenu={(e) => handleContextMenu(e, row)}
                  className={`w-full flex items-center gap-1 hover:bg-[#eef1f4] text-left ${
                    isSelected ? 'bg-white border-l-2 border-[#0969da] font-semibold' : ''
                  }`}
                  style={{ height: ROW_HEIGHT, paddingLeft: paddingLeft + 14 }}
                >
                  <File size={14} className="text-gray-500 shrink-0" />
                  <span className="truncate text-[#0969da]">{row.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {menu && (
        <FileContextMenu
          x={menu.x}
          y={menu.y}
          filePath={menu.path}
          canWrite={canWrite}
          onClose={() => setMenu(null)}
          onRename={() => onRenameFile?.(menu.path)}
          onDelete={() => onDeleteFile?.(menu.path)}
          onOpenNewTab={() => onSelectFile?.(menu.path, { newTab: true })}
        />
      )}
    </>
  );
}
