import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { Book, Users, Star, Settings } from 'lucide-react';
import { getUserAvatarUrl } from '../utils/userAvatar.js';

function Profile() {
  const { username } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return u && u.username === username;
    } catch {
      return false;
    }
  }, [username]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // This should match your getUserByUsername route
        const res = await axios.get(`http://localhost:5001/user-api/users/profile/${username}`);
        setProfileData(res.data.payload);
      } catch (err) {
        console.error("Error fetching profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);


  const handleUpdateProfile = async (updatedData) => {
  try {
    const response = await axios.put('http://localhost:4000/user-api/users', updatedData, {
      withCredentials: true
    });
    
    // Update the local storage with the new user details (name, bio, etc.)
    localStorage.setItem('user', JSON.stringify(response.data.user));
    alert("Profile updated successfully!");
  } catch (err) {
    console.error("Update failed", err);
  }
};

  if (loading) return <div className="text-center py-20">Loading profile...</div>;
  if (!profileData) return <div className="text-center py-20">User not found.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left Column: Sidebar Info */}
        <div className="md:w-1/4">
          <div className="relative group mb-4">
            <img
              src={getUserAvatarUrl(profileData)}
              alt={profileData.name}
              className="w-full aspect-square rounded-full border border-gray-300 shadow-sm object-cover bg-gray-100"
            />
          </div>

          {isOwnProfile && (
            <div className="mb-4 space-y-2">
              <Link
                to="/settings"
                className="flex items-center justify-center gap-2 w-full py-2 border border-gray-300 rounded-md bg-white text-sm font-semibold text-[#0969da] hover:bg-gray-50"
              >
                <Settings size={16} />
                Edit profile &amp; photo
              </Link>
              <p className="text-xs text-gray-600 leading-relaxed">
                To add <strong>collaborators</strong>, open a repository you own, then open the <strong>Team</strong> tab.
              </p>
            </div>
          )}

          <h1 className="text-2xl font-bold text-[#1f2328]">{profileData.name}</h1>
          <p className="text-xl font-light text-gray-500 mb-4">{username}</p>

          <p className="text-[#1f2328] mb-4">{profileData.bio}</p>

          <button className="w-full py-1.5 border border-gray-300 rounded-md bg-[#f6f8fa] font-semibold text-sm hover:bg-gray-100 mb-4">
            Follow
          </button>

          <div className="flex items-center gap-1 text-sm text-gray-600 mb-6">
            <Users size={16} />
            <span className="font-bold text-[#1f2328]">{profileData.followers?.length || 0}</span>
            <span>followers</span>
            <span className="mx-1">·</span>
            <span className="font-bold text-[#1f2328]">{profileData.following?.length || 0}</span>
            <span>following</span>
          </div>
        </div>

        {/* Right Column: Repository List */}
        <div className="md:w-3/4">
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex gap-6">
              <button className="pb-3 border-b-2 border-[#fd8c73] font-semibold text-sm flex items-center gap-2">
                <Book size={16} /> Repositories
                <span className="bg-gray-200 px-2 py-0.5 rounded-full text-xs">
                  {profileData.repositories?.length || 0}
                </span>
              </button>
            </nav>
          </div>

          <div className="space-y-6">
            {profileData.repositories && profileData.repositories.length > 0 ? (
              profileData.repositories.map((repo) => (
                <div key={repo._id} className="py-6 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link to={`/repo/${repo._id}`} className="text-xl font-semibold text-[#0969da] hover:underline">
                        {repo.name || repo.title}
                      </Link>
                      <span className="ml-2 px-2 py-0.5 border border-gray-300 rounded-full text-xs text-gray-500 font-medium lowercase">
                        {repo.visibility}
                      </span>
                      <p className="text-sm text-gray-600 mt-2 max-w-lg">
                        {repo.description}
                      </p>
                      <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                          {repo.language}
                        </span>
                        <span>Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-md bg-[#f6f8fa] text-xs font-semibold hover:bg-gray-100">
                      <Star size={14} /> Star
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 py-10 text-center">This user doesn't have any repositories yet.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Profile;