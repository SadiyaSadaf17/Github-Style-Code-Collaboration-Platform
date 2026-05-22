import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';

export default function QuickFileOpen({ files = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = files.map((f) => f.path || f.filename).filter(Boolean);
    if (!q) return list.slice(0, 20);
    return list.filter((p) => p.toLowerCase().includes(q)).slice(0, 20);
  }, [files, query]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[150] flex items-start justify-center pt-[15vh] bg-black/30 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-[#d0d7de]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <Search size={16} className="text-gray-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlight((h) => Math.min(h + 1, matches.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              }
              if (e.key === 'Enter' && matches[highlight]) {
                onSelect(matches[highlight]);
                onClose();
              }
            }}
            placeholder="Quick open file…"
            className="flex-1 text-sm outline-none font-mono"
          />
        </div>
        <ul className="max-h-64 overflow-y-auto py-1">
          {matches.map((path, idx) => (
            <li key={path}>
              <button
                type="button"
                onClick={() => {
                  onSelect(path);
                  onClose();
                }}
                className={`w-full text-left px-3 py-2 text-sm font-mono truncate ${
                  idx === highlight ? 'bg-[#0969da] text-white' : 'hover:bg-[#f6f8fa] text-[#0969da]'
                }`}
              >
                {path}
              </button>
            </li>
          ))}
          {matches.length === 0 && (
            <li className="px-3 py-4 text-sm text-gray-500 text-center">No files match</li>
          )}
        </ul>
      </div>
    </div>
  );
}
