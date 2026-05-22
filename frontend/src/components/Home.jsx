import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api.js';
import { Book, Star, Circle, Plus, Search } from 'lucide-react';
import { getUserAvatarUrl } from '../utils/userAvatar.js';

function Home() {
  const [searchParams] = useSearchParams();
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [error, setError] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q != null) setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    const fetchPublicRepos = async () => {
      try {
        setError('');
        const res = await api.get('/repo-api/repos/explore/public');
        setRepos(res.data.payload || []);
      } catch (err) {
        console.error('Error fetching explore feed', err);
        setError(err.response?.data?.message || 'Could not load public repositories.');
      } finally {
        setLoading(false);
      }
    };
    fetchPublicRepos();
  }, []);

  const filtered = repos.filter((repo) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const name = (repo.name || '').toLowerCase();
    const desc = (repo.description || '').toLowerCase();
    const owner = (repo.owner?.username || repo.owner?.name || '').toLowerCase();
    return name.includes(q) || desc.includes(q) || owner.includes(q);
  });

  return (
    <div className="flex flex-col lg:flex-row max-w-7xl mx-auto px-4 py-8 gap-8">
      <aside className="lg:w-1/4 hidden lg:block">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">Top Repositories</h2>
          <Link
            to="/new"
            className="bg-[#2da44e] text-white px-2 py-1 rounded-md text-xs flex items-center gap-1 hover:bg-[#2c974b]"
          >
            <Plus size={14} /> New
          </Link>
        </div>
        <input
          type="text"
          placeholder="Find a repository..."
          className="w-full bg-[#f6f8fa] border border-gray-300 rounded-md px-2 py-1 text-sm mb-4 outline-none focus:ring-1 focus:ring-blue-500"
        />
        <ul className="space-y-3">
          {user?.username ? (
            <li className="text-xs text-gray-500">
              Your repos appear on the{' '}
              <Link to="/" className="text-[#0969da] hover:underline">
                dashboard
              </Link>
              .
            </li>
          ) : (
            <li className="text-xs text-gray-500">
              <Link to="/login" className="text-[#0969da] hover:underline">
                Sign in
              </Link>{' '}
              to see your repositories.
            </li>
          )}
        </ul>
      </aside>

      <main className="lg:w-3/4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b pb-4">
          <h1 className="text-xl font-semibold">Explore public repositories</h1>
          <div className="relative max-w-sm w-full">
            <Search size={16} className="absolute left-2 top-2.5 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, description, owner…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:border-[#0969da]"
            />
          </div>
        </div>

        {error && (
          <p className="mb-4 p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">{error}</p>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 py-12 text-center">
            {search ? 'No repositories match your search.' : 'No public repositories yet. Create one and leave it public!'}
          </p>
        ) : (
          <div className="space-y-4">
            {filtered.map((repo) => (
              <div
                key={repo._id}
                className="p-4 bg-white border border-gray-200 rounded-md shadow-sm hover:border-blue-400 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src={getUserAvatarUrl(repo.owner)}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-sm">
                    <Link
                      to={`/profile/${repo.owner?.username}`}
                      className="font-semibold text-[#0969da] hover:underline"
                    >
                      {repo.owner?.username || repo.owner?.name}
                    </Link>
                    <span className="text-gray-500"> created a repository</span>
                  </span>
                </div>

                <div className="ml-8 border p-4 rounded-md">
                  <div className="flex items-center gap-2 mb-1">
                    <Book size={18} className="text-gray-500 shrink-0" />
                    <Link to={`/repo/${repo._id}`} className="text-lg font-bold text-[#0969da] hover:underline">
                      {repo.name}
                    </Link>
                    {!repo.isPrivate && (
                      <span className="text-xs px-2 py-0.5 border rounded-full text-gray-500">public</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{repo.description || 'No description'}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {repo.language && (
                      <span className="flex items-center gap-1">
                        <Circle size={10} fill="currentColor" className="text-yellow-500" />
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Star size={14} /> {repo.stats?.stars ?? 0}
                    </span>
                    <span>Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Home;
