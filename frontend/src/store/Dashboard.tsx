import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import RepoCard, { Repository } from '../../components/repo/RepoCard';
import CreateRepoModal from '../../components/repo/CreateRepoModal';

const Dashboard = () => {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const response = await api.get('/repos');
        // Ensure response data follows expected structure
        setRepos(Array.isArray(response.data) ? response.data : response.data.repositories || []);
      } catch (err) {
        console.error('Failed to fetch repositories', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRepos();
  }, []);

  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRepoCreated = (newRepo: Repository) => {
    setRepos([newRepo, ...repos]);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold">Your Repositories</h1>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded transition-colors text-sm"
          >
            New Repository
          </button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Find a repository..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-gray-400">Loading repositories...</div>
          ) : filteredRepos.length > 0 ? (
            <div className="divide-y divide-gray-700">
              {filteredRepos.map(repo => (
                <RepoCard key={repo._id} repo={repo} />
              ))}
            </div>
          ) : (
            <div className="p-10 text-center">
              <p className="text-gray-400">
                {searchQuery ? `No repositories found matching "${searchQuery}"` : "You don't have any repositories yet."}
              </p>
              {!searchQuery && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="mt-4 text-blue-400 hover:underline text-sm"
                >
                  Create your first repository
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <CreateRepoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCreated={handleRepoCreated}
      />
    </div>
  );
};

export default Dashboard;