import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, File, FolderGit2, Home, Settings, Bell, CircleDot, GitPullRequest, User } from 'lucide-react';
import api from '../services/api.js';
import { useAuth } from '../store/authStore.js';
import { repoBlobUrl } from '../utils/repoPaths.js';

const STATIC_ITEMS = [
  { id: 'home', label: 'Dashboard', path: '/', icon: Home },
  { id: 'explore', label: 'Explore repositories', path: '/explore', icon: FolderGit2 },
  { id: 'search-page', label: 'Search', path: '/search', icon: Search },
  { id: 'issues', label: 'Your issues', path: '/issues', icon: CircleDot },
  { id: 'pulls', label: 'Your pull requests', path: '/pulls', icon: GitPullRequest },
  { id: 'notifications', label: 'Notifications', path: '/notifications', icon: Bell },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings },
];

function flattenSearchResults(payload) {
  if (!payload) return [];
  const items = [];
  for (const repo of payload.repositories || []) {
    items.push({
      id: `repo-${repo._id}`,
      label: repo.fullName || repo.name,
      path: `/repo/${repo._id}`,
      icon: FolderGit2,
      group: 'Repositories',
    });
  }
  for (const issue of payload.issues || []) {
    items.push({
      id: `issue-${issue._id}`,
      label: `#${issue.number} ${issue.title}`,
      path: `/repo/${issue.repository?._id || issue.repository}/issues/${issue._id}`,
      icon: CircleDot,
      group: 'Issues',
    });
  }
  for (const pr of payload.pullRequests || []) {
    items.push({
      id: `pr-${pr._id}`,
      label: pr.title,
      path: `/repo/${pr.repoId}/pull/${pr._id}`,
      icon: GitPullRequest,
      group: 'Pull requests',
    });
  }
  for (const user of payload.users || []) {
    items.push({
      id: `user-${user._id}`,
      label: user.username,
      path: `/profile/${user.username}`,
      icon: User,
      group: 'Users',
    });
  }
  for (const file of payload.code || []) {
    items.push({
      id: `code-${file.repoId}-${file.path}`,
      label: `${file.repositoryName || 'repo'}/${file.path}`,
      path: repoBlobUrl(file.repoId, file.path),
      icon: File,
      group: 'Code',
    });
  }
  return items;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchHits, setSearchHits] = useState([]);
  const [highlight, setHighlight] = useState(0);
  const searchTimer = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const runSearch = useCallback(
    (q) => {
      clearTimeout(searchTimer.current);
      if (q.length < 2) {
        setSearchHits([]);
        return;
      }
      searchTimer.current = setTimeout(() => {
        api
          .get('/search-api/', { params: { q, limit: 8 } })
          .then((res) => setSearchHits(flattenSearchResults(res.data.payload)))
          .catch(() => setSearchHits([]));
      }, 200);
    },
    []
  );

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery('');
        setHighlight(0);
        setSearchHits([]);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) runSearch(query.trim());
  }, [query, open, runSearch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const staticFiltered = STATIC_ITEMS.filter((s) => !q || s.label.toLowerCase().includes(q));
    if (q.length >= 2 && searchHits.length) {
      return [...searchHits, ...staticFiltered].slice(0, 14);
    }
    return staticFiltered.slice(0, 12);
  }, [query, searchHits]);

  const run = (item) => {
    setOpen(false);
    if (item.path === '/search' && query.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    } else if (item.path) {
      navigate(item.path);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-white rounded-lg shadow-2xl border border-[#d0d7de] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#d0d7de]">
          <Search size={18} className="text-gray-400" />
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
                setHighlight((h) => Math.min(h + 1, filtered.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              }
              if (e.key === 'Enter' && filtered[highlight]) {
                run(filtered[highlight]);
              }
            }}
            placeholder="Search repos, issues, users, code… (Ctrl+K)"
            className="flex-1 outline-none text-sm"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 border rounded text-gray-500">esc</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-sm text-gray-500 text-center">
              {query.length >= 2 ? 'No matches' : 'Type to search or pick a destination'}
            </li>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon || File;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => run(item)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm ${
                      idx === highlight ? 'bg-[#0969da] text-white' : 'hover:bg-[#f6f8fa]'
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.group && (
                      <span
                        className={`text-[10px] shrink-0 ${
                          idx === highlight ? 'text-blue-100' : 'text-gray-400'
                        }`}
                      >
                        {item.group}
                      </span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
        {!isAuthenticated && (
          <p className="px-4 py-2 text-xs text-amber-800 bg-amber-50 border-t">
            Sign in for code search and personalized results.
          </p>
        )}
      </div>
    </div>
  );
}
