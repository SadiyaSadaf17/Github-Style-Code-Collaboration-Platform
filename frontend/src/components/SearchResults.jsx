import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, FolderGit2, CircleDot, GitPullRequest, User, FileCode } from 'lucide-react';
import api from '../services/api.js';
import { repoBlobUrl } from '../utils/repoPaths.js';

const SECTIONS = [
  { key: 'repositories', label: 'Repositories', icon: FolderGit2 },
  { key: 'issues', label: 'Issues', icon: CircleDot },
  { key: 'pullRequests', label: 'Pull requests', icon: GitPullRequest },
  { key: 'users', label: 'Users', icon: User },
  { key: 'code', label: 'Code', icon: FileCode },
];

function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [query, setQuery] = useState(q);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setQuery(q);
    if (!q || q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    setError('');
    api
      .get('/search-api/', { params: { q, limit: 20 } })
      .then((res) => {
        setResults(res.data.payload);
        try {
          const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
          const next = [q, ...recent.filter((r) => r !== q)].slice(0, 8);
          localStorage.setItem('recentSearches', JSON.stringify(next));
        } catch {
          /* ignore */
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Search failed');
        setResults(null);
      })
      .finally(() => setLoading(false));
  }, [q]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      setSearchParams({ q: trimmed });
    }
  };

  const recent = (() => {
    try {
      return JSON.parse(localStorage.getItem('recentSearches') || '[]');
    } catch {
      return [];
    }
  })();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4 flex items-center gap-2">
        <Search size={24} />
        Search
      </h1>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search repositories, issues, code, users…"
            className="w-full pl-10 pr-4 py-2 border border-[#d0d7de] rounded-md text-sm focus:border-[#0969da] outline-none"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">Minimum 2 characters</p>
      </form>

      {!q && recent.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-600 mb-2">Recent searches</p>
          <div className="flex flex-wrap gap-2">
            {recent.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setSearchParams({ q: term })}
                className="text-sm px-2 py-1 bg-[#f6f8fa] border border-[#d0d7de] rounded-md hover:border-[#0969da]"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="mb-4 p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">{error}</p>
      )}

      {loading && <p className="text-gray-500 text-sm">Searching…</p>}

      {results && !loading && (
        <div className="space-y-8">
          {SECTIONS.map(({ key, label, icon: Icon }) => {
            const items = results[key] || [];
            if (!items.length) return null;
            return (
              <section key={key}>
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Icon size={16} />
                  {label}
                  <span className="text-gray-400 font-normal">({items.length})</span>
                </h2>
                <ul className="border border-[#d0d7de] rounded-md divide-y bg-white">
                  {key === 'repositories' &&
                    items.map((repo) => (
                      <li key={repo._id}>
                        <Link
                          to={`/repo/${repo._id}`}
                          className="block px-4 py-3 hover:bg-[#f6f8fa]"
                        >
                          <span className="font-semibold text-[#0969da]">{repo.fullName || repo.name}</span>
                          {repo.description && (
                            <p className="text-sm text-gray-600 mt-0.5 line-clamp-1">{repo.description}</p>
                          )}
                        </Link>
                      </li>
                    ))}
                  {key === 'issues' &&
                    items.map((issue) => (
                      <li key={issue._id}>
                        <Link
                          to={`/repo/${issue.repository?._id || issue.repository}/issues/${issue._id}`}
                          className="block px-4 py-3 hover:bg-[#f6f8fa]"
                        >
                          <span className="text-[#0969da] font-medium">
                            #{issue.number} {issue.title}
                          </span>
                          <p className="text-xs text-gray-500 mt-0.5">{issue.state}</p>
                        </Link>
                      </li>
                    ))}
                  {key === 'pullRequests' &&
                    items.map((pr) => (
                      <li key={pr._id}>
                        <Link
                          to={`/repo/${pr.repoId}/pull/${pr._id}`}
                          className="block px-4 py-3 hover:bg-[#f6f8fa]"
                        >
                          <span className="text-[#0969da] font-medium">{pr.title}</span>
                          <p className="text-xs text-gray-500 mt-0.5">{pr.status}</p>
                        </Link>
                      </li>
                    ))}
                  {key === 'users' &&
                    items.map((user) => (
                      <li key={user._id}>
                        <Link
                          to={`/profile/${user.username}`}
                          className="block px-4 py-3 hover:bg-[#f6f8fa]"
                        >
                          <span className="font-semibold text-[#0969da]">{user.username}</span>
                          {user.name && <span className="text-gray-600 ml-2">{user.name}</span>}
                        </Link>
                      </li>
                    ))}
                  {key === 'code' &&
                    items.map((file, idx) => (
                      <li key={`${file.repoId}-${file.path}-${idx}`}>
                        <Link
                          to={repoBlobUrl(file.repoId, file.path)}
                          className="block px-4 py-3 hover:bg-[#f6f8fa] font-mono text-sm"
                        >
                          <span className="text-[#0969da]">
                            {file.repositoryName}/{file.path}
                          </span>
                          {file.snippet && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{file.snippet}</p>
                          )}
                        </Link>
                      </li>
                    ))}
                </ul>
              </section>
            );
          })}
          {SECTIONS.every(({ key }) => !(results[key]?.length)) && (
            <p className="text-gray-500 text-center py-12">No results for &quot;{q}&quot;</p>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchResults;
