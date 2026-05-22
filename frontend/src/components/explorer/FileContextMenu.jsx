import React, { useEffect, useRef } from 'react';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';

export default function FileContextMenu({
  x,
  y,
  filePath,
  canWrite,
  onClose,
  onRename,
  onDelete,
  onOpenNewTab,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-[100] min-w-[180px] py-1 bg-white border border-[#d0d7de] rounded-md shadow-lg text-sm"
      style={{ left: x, top: y }}
      role="menu"
    >
      <button
        type="button"
        role="menuitem"
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#0969da] hover:text-white text-left"
        onClick={() => {
          onOpenNewTab?.();
          onClose();
        }}
      >
        <ExternalLink size={14} />
        Open in new tab
      </button>
      {canWrite && (
        <>
          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#0969da] hover:text-white text-left"
            onClick={() => {
              onRename?.();
              onClose();
            }}
          >
            <Pencil size={14} />
            Rename…
          </button>
          <button
            type="button"
            role="menuitem"
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-600 hover:text-white text-left text-red-700"
            onClick={() => {
              onDelete?.();
              onClose();
            }}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </>
      )}
      <div className="px-3 py-1.5 text-xs text-gray-500 border-t border-[#d0d7de] font-mono truncate" title={filePath}>
        {filePath}
      </div>
    </div>
  );
}
