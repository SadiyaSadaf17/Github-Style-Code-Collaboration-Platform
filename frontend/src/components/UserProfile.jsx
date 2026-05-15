import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Book, Users, Star } from 'lucide-react';
import { getUserAvatarUrl } from '../utils/userAvatar.js';

function UserProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`http://localhost:5001/user-api/users/profile/${username}`);
        setProfile(response.data.payload || response.data);
      } catch (err) {
        console.error('User not found', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [username]);

  // Handle Follow Logic (using your repo structure)
  const handleFollow = async () => {
    try {
      await axios.post(`http://localhost:4000/user-api/users/${profile._id}/follow`, {}, {
        withCredentials: true
      });
      alert("Following!");
    } catch (err) {
      alert("Action failed");
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-500 font-mono">Loading developer profile...</div>;
  if (!profile) return <div className="text-center py-20 text-red-500">User not found</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="md:w-1/4">
          <img
            src={getUserAvatarUrl(profile)}
            className="w-full aspect-square object-cover rounded-full border border-gray-300"
            alt={profile.name}
          />
          <h1 className="text-2xl font-bold mt-4">{profile.name}</h1>
          <p className="text-xl font-light text-gray-500">{username}</p>
          <p className="mt-4 text-[#1f2328]">{profile.bio}</p>
          <button onClick={handleFollow} className="w-full mt-4 py-1.5 border border-gray-300 rounded-md bg-[#f6f8fa] font-semibold text-sm hover:bg-gray-100">
            Follow
          </button>
        </div>

        {/* Repositories */}
        <div className="md:w-3/4">
          <div className="border-b border-gray-200 mb-6 pb-2">
            <h2 className="font-semibold flex items-center gap-2 text-sm">
              <Book size={16} /> Repositories
              <span className="bg-gray-100 px-2 rounded-full">{profile.repositories?.length || 0}</span>
            </h2>
          </div>
          <div className="space-y-4">
            {profile.repositories?.map((repo) => (
              <div key={repo._id} className="py-4 border-b border-gray-100">
                <Link to={`/repo/${repo._id}`} className="text-xl font-semibold text-[#0969da] hover:underline">
                  {repo.title || repo.name}
                </Link>
                <p className="text-sm text-gray-600 mt-1">{repo.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;