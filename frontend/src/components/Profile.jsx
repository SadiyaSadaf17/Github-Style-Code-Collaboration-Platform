import React, { useEffect, useState, useMemo, useCallback } from 'react';
import api from '../services/api.js';
import { useParams, Link } from 'react-router-dom';
import { Book, Users, Star, Settings, Activity } from 'lucide-react';
import { getUserAvatarUrl } from '../utils/userAvatar.js';
import ContributionHeatmap from './ContributionHeatmap';
import ActivityFeed from './ActivityFeed';

function Profile() {
  const { username } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const [profileTab, setProfileTab] = useState('repos');

  const isOwnProfile = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return u && u.username === username;
    } catch {
      return false;
    }
  }, [username]);

  const loadProfile = useCallback(async () => {
    const res = await api.get(`/user-api/users/profile/${username}`);
    setProfileData(res.data.payload);
  }, [username]);

  useEffect(() => {
    setLoading(true);
    loadProfile()
      .catch((err) => console.error('Error fetching profile', err))
      .finally(() => setLoading(false));
  }, [loadProfile]);

  const handleFollow = async () => {
    if (!profileData?._id || profileData.isSelf) return;
    setFollowBusy(true);
    try {
      if (profileData.isFollowing) {
        await api.delete(`/user-api/users/${profileData._id}/follow`);
        setProfileData((p) => ({
          ...p,
          isFollowing: false,
          followerCount: Math.max(0, (p.followerCount || 1) - 1),
        }));
      } else {
        await api.post(`/user-api/users/${profileData._id}/follow`);
        setProfileData((p) => ({
          ...p,
          isFollowing: true,
          followerCount: (p.followerCount || 0) + 1,
        }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update follow status');
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) return <div className="text-center py-20">Loading profile...</div>;
  if (!profileData) return <div className="text-center py-20">User not found.</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/4">
          <img
            src={getUserAvatarUrl(profileData)}
            alt={profileData.name}
            className="w-full aspect-square rounded-full border border-gray-300 shadow-sm object-cover bg-gray-100 mb-4"
          />

          {isOwnProfile && (
            <div className="mb-4">
              <Link
                to="/settings"
                className="flex items-center justify-center gap-2 w-full py-2 border border-gray-300 rounded-md bg-white text-sm font-semibold text-[#0969da] hover:bg-gray-50"
              >
                <Settings size={16} />
                Edit profile
              </Link>
            </div>
          )}

          <h1 className="text-2xl font-bold text-[#1f2328]">{profileData.name}</h1>
          <p className="text-xl font-light text-gray-500 mb-4">@{username}</p>
          {profileData.bio && <p className="text-[#1f2328] mb-4 text-sm">{profileData.bio}</p>}

          {!profileData.isSelf && (
            <button
              type="button"
              disabled={followBusy}
              onClick={handleFollow}
              className={`w-full py-1.5 border rounded-md font-semibold text-sm mb-4 ${
                profileData.isFollowing
                  ? 'border-[#d0d7de] bg-[#f6f8fa] hover:bg-gray-100'
                  : 'border-[#1b7f37] bg-[#2da44e] text-white hover:bg-[#2c974b]'
              }`}
            >
              {profileData.isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          )}

          <div className="flex items-center gap-1 text-sm text-gray-600 mb-6">
            <Users size={16} />
            <span className="font-bold text-[#1f2328]">{profileData.followerCount ?? 0}</span>
            <span>followers</span>
            <span className="mx-1">·</span>
            <span className="font-bold text-[#1f2328]">{profileData.followingCount ?? 0}</span>
            <span>following</span>
          </div>

          <div className="mb-6">
            <ContributionHeatmap username={username} />
          </div>
        </div>

        <div className="md:w-3/4">
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex gap-6">
              <button
                type="button"
                onClick={() => setProfileTab('repos')}
                className={`pb-3 text-sm flex items-center gap-2 ${
                  profileTab === 'repos' ? 'border-b-2 border-[#fd8c73] font-semibold' : 'text-gray-600'
                }`}
              >
                <Book size={16} /> Repositories
                <span className="bg-gray-200 px-2 py-0.5 rounded-full text-xs">
                  {profileData.repositories?.length || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setProfileTab('activity')}
                className={`pb-3 text-sm flex items-center gap-2 ${
                  profileTab === 'activity' ? 'border-b-2 border-[#fd8c73] font-semibold' : 'text-gray-600'
                }`}
              >
                <Activity size={16} /> Activity
              </button>
            </nav>
          </div>

          {profileTab === 'repos' && (
            <div className="space-y-6">
              {profileData.repositories?.length > 0 ? (
                profileData.repositories.map((repo) => (
                  <div key={repo._id} className="py-6 border-b border-gray-200">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <Link
                          to={`/repo/${repo._id}`}
                          className="text-xl font-semibold text-[#0969da] hover:underline"
                        >
                          {repo.name}
                        </Link>
                        <span className="ml-2 px-2 py-0.5 border border-gray-300 rounded-full text-xs text-gray-500 lowercase">
                          {repo.isPrivate ? 'private' : 'public'}
                        </span>
                        <p className="text-sm text-gray-600 mt-2">{repo.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Updated {new Date(repo.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 py-10 text-center">No public repositories yet.</p>
              )}
            </div>
          )}

          {profileTab === 'activity' && (
            <ActivityFeed scope="user" userId={profileData._id} title={`@${username}'s activity`} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
