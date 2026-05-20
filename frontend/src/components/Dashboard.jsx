import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../store/authStore';
import { getUserAvatarUrl } from '../utils/userAvatar.js';
import RepoCard from './repo/RepoCard';
import CreateRepoModal from './repo/CreateRepoModal';

function Dashboard() {
  const { currentUser } = useAuth();
  const [myRepos, setMyRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchRepos = async () => {
    try {
      const res = await api.get('/repo-api/repos');
      setMyRepos(res.data.payload || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const filteredRepos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return myRepos.filter((repo) => {
      const matchesSearch =
        !q ||
        repo.name?.toLowerCase().includes(q) ||
        repo.description?.toLowerCase().includes(q) ||
        repo.owner?.username?.toLowerCase().includes(q);
      const matchesVisibility =
        visibilityFilter === 'all' ||
        (visibilityFilter === 'public' && !repo.isPrivate) ||
        (visibilityFilter === 'private' && repo.isPrivate);
      return matchesSearch && matchesVisibility;
    });
  }, [myRepos, searchQuery, visibilityFilter]);

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Loading your dashboard…</div>;
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1f2328]">Your repositories</h1>
          <p className="text-sm text-gray-600 mt-1">
            {filteredRepos.length} of {myRepos.length} repositories
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#2da44e] text-white text-sm font-semibold rounded-md hover:bg-[#2c974b]"
        >
          <Plus size={16} />
          New repository
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="search"
          placeholder="Search repositories…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-white border border-[#d0d7de] rounded-md px-3 py-2 text-sm outline-none focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da]"
        />
        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value)}
          className="border border-[#d0d7de] rounded-md px-3 py-2 text-sm bg-white"
        >
          <option value="all">All</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </div>

      {filteredRepos.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-lg p-12 text-center bg-[#f6f8fa]">
          <h2 className="text-lg font-medium text-gray-700">No repositories match</h2>
          <p className="text-sm text-gray-500 mt-2">Create one or adjust your filters.</p>
          <Link to="/explore" className="inline-block mt-4 text-[#0969da] text-sm hover:underline">
            Explore public repositories
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRepos.map((repo) => (
            <RepoCard key={repo._id} repo={repo} />
          ))}
        </div>
      )}

      <aside className="mt-10 pt-8 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <img src={getUserAvatarUrl(currentUser)} alt="" className="w-10 h-10 rounded-full object-cover" />
          <div>
            <p className="font-semibold text-[#1f2328]">{currentUser?.name || currentUser?.username}</p>
            <p className="text-sm text-gray-500">@{currentUser?.username}</p>
          </div>
        </div>
      </aside>

      <CreateRepoModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(repo) => {
          setMyRepos((prev) => [repo, ...prev]);
        }}
      />
    </div>
  );
}

export default Dashboard;
