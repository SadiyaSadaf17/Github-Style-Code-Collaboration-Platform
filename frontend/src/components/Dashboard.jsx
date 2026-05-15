import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Book, Plus, GitPullRequest, CircleDot, Star, History } from 'lucide-react';
import { getUserAvatarUrl } from '../utils/userAvatar.js';

function Dashboard() {
  const [myRepos, setMyRepos] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch repositories owned by the logged-in user
        const reposRes = await axios.get('http://localhost:5001/repo-api/repos', {
          withCredentials: true
        });
        
        // Fetch activity feed (commits/actions from followed users)
        // const activityRes = await axios.get('http://localhost:5000/repository-api/repositories  ', {
        //   withCredentials: true
        // });

        setMyRepos(reposRes.data.payload || []);
        // setMyRepos(reposRes.data);
        // setActivity(activityRes.data.payload || []);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-500">Loading your dashboard...</div>;

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-8 px-4 py-8">
      
      {/* Left Sidebar: Navigation & Personal Repos */}
      <aside className="lg:w-1/4 space-y-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#1f2328]">Top Repositories</h2>
            <Link to="/new" className="bg-[#2da44e] text-white px-2 py-1 rounded-md text-xs font-semibold hover:bg-[#2c974b] flex items-center gap-1">
              <Plus size={14} /> New
            </Link>
          </div>
          <input 
            type="text" 
            placeholder="Find a repository..." 
            className="w-full bg-[#f6f8fa] border border-[#d0d7de] rounded-md px-3 py-1 text-sm mb-4 outline-none focus:border-[#0969da] focus:ring-1 focus:ring-[#0969da]"
          />
          <ul className="space-y-2">
            {Array.isArray(myRepos) && myRepos.map(repo => ( 
              <li key={repo._id} className="flex items-center gap-2 text-sm truncate">
                <img src={getUserAvatarUrl(user)} className="w-4 h-4 rounded-full object-cover" alt="avatar" />
                <Link to={`/repo/${repo._id}`} className="font-semibold text-[#1f2328] hover:underline truncate flex-1 min-w-0">
                  <span className="font-normal">{repo.owner?.username || repo.owner?.name || user?.username || user?.name}</span>
                  <span className="text-gray-500"> / </span>
                  <span className="font-normal">{repo.name}</span>
                  {repo.myAccessRole && repo.myAccessRole !== 'owner' && (
                    <span className="ml-1 text-xs font-normal text-gray-500 capitalize">({repo.myAccessRole})</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-sm font-semibold mb-4 text-[#1f2328]">Recent Activity</h2>
          <div className="space-y-4 text-xs text-gray-500 italic">
            <p>No recent activity found in your network.</p>
          </div>
        </div>
      </aside>

      {/* Main Content: Personal Feed */}
      <main className="lg:w-3/4">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#1f2328]">All activity</h1>
        </div>

        <div className="space-y-4">
          {activity.length > 0 ? (
            activity.map((item, idx) => (
              <div key={idx} className="p-4 bg-white border border-[#d0d7de] rounded-md shadow-sm">
                {/* Activity Feed Item Template */}
                <div className="flex items-start gap-3">
                  <History size={18} className="text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold text-black">{item.user}</span> pushed to 
                      <span className="font-semibold text-black ml-1">{item.repo}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{item.timestamp}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="border border-dashed border-gray-300 rounded-lg p-12 text-center">
              <h2 className="text-lg font-medium text-gray-600">Welcome to your dashboard!</h2>
              <p className="text-sm text-gray-500 mt-2">
                Follow other developers from the AU 2027 batch to see their latest commits here.
              </p>
              <Link to="/explore" className="inline-block mt-4 text-[#0969da] text-sm hover:underline">
                Explore repositories
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;