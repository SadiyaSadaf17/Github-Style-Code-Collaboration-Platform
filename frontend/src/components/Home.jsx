import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom'; // Ensure correct router import
import { Book, Star, Circle, Plus } from 'lucide-react';
import { getUserAvatarUrl } from '../utils/userAvatar.js';

function Home() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Get user data for the sidebar UI
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const fetchPublicRepos = async () => {
      try {
        // IMPORTANT: Added withCredentials for HttpOnly cookie support
        const res = await axios.get('http://localhost:4000/repository-api/repositories', {
          withCredentials: true 
        });
        setRepos(res.data);
      } catch (err) {
        console.error("Error fetching feed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicRepos();
  }, []);

  return (
    <div className="flex flex-col lg:flex-row max-w-7xl mx-auto px-4 py-8 gap-8">
      
      {/* Left Sidebar: User's Repositories */}
      <aside className="lg:w-1/4 hidden lg:block">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">Top Repositories</h2>
          <Link to="/new" className="bg-[#2da44e] text-white px-2 py-1 rounded-md text-xs flex items-center gap-1 hover:bg-[#2c974b]">
            <Plus size={14} /> New
          </Link>
        </div>
        
        <input 
          type="text" 
          placeholder="Find a repository..." 
          className="w-full bg-[#f6f8fa] border border-gray-300 rounded-md px-2 py-1 text-sm mb-4 outline-none focus:ring-1 focus:ring-blue-500"
        />

        <ul className="space-y-3">
          {user?.repositories?.length > 0 ? (
            user.repositories.slice(0, 7).map((repo) => (
              <li key={repo._id} className="flex items-center gap-2 text-sm truncate">
                <img src={getUserAvatarUrl(user)} alt="owner" className="w-5 h-5 rounded-full object-cover" />
                <Link to={`/repo/${repo._id}`} className="font-semibold hover:underline truncate">
                  {user.username} / <span className="font-normal">{repo.title || repo.name}</span>
                </Link>
              </li>
            ))
          ) : (
            <p className="text-xs text-gray-500">No repositories yet.</p>
          )}
        </ul>
      </aside>

      {/* Main Content: Activity Feed */}
      <main className="lg:w-3/4">
        <h1 className="text-xl font-semibold mb-4 border-b pb-4">Recent Activity</h1>
        
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-md"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {repos.map((repo) => (
              <div key={repo._id} className="p-4 bg-white border border-gray-200 rounded-md shadow-sm hover:border-blue-400 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src={getUserAvatarUrl(repo.owner)}
                    alt="avatar"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-sm font-semibold">
                    {repo.owner?.name} <span className="font-normal text-gray-500">created a repository</span>
                  </span>
                </div>

                <div className="ml-8 border p-4 rounded-md">
                  <div className="flex items-center gap-2 mb-1">
                    <Book size={18} className="text-gray-500" />
                    <Link to={`/repo/${repo._id}`} className="text-lg font-bold text-[#0969da] hover:underline">
                      {repo.title}
                    </Link>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{repo.description}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Circle size={10} fill="currentColor" className="text-yellow-500" />
                      {repo.language}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star size={14} /> 0
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