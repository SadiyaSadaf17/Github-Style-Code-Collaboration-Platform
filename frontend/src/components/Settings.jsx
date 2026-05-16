import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/authStore.js';
import { Settings, Mail, Lock, Bell, Palette } from 'lucide-react';
import { getUserAvatarUrl } from '../utils/userAvatar.js';

function SettingsPage() {
  const { currentUser, setCurrentUser } = useAuth();
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    name: '',
    bio: '',
    location: '',
    website: '',
    company: ''
  });
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [accountFeedback, setAccountFeedback] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  const [emailForm, setEmailForm] = useState({ newEmail: '', currentPassword: '' });
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });

  useEffect(() => {
    if (currentUser) {
      setProfileData({
        name: currentUser.name || '',
        bio: currentUser.bio || '',
        location: currentUser.location || '',
        website: currentUser.website || '',
        company: currentUser.company || ''
      });
      setAvatarUrlInput(currentUser.avatar || currentUser.profileImage || '');
    }
  }, [currentUser]);

  const persistUser = (userObj) => {
    setCurrentUser(userObj);
  };

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setAvatarLoading(true);
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await axios.post('http://localhost:5001/user-api/users/me/avatar', fd, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const user = res.data.payload;
      persistUser(user);
      setAvatarUrlInput(user.avatar || '');
      setMessage('Profile photo updated!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not upload photo');
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAvatarUrlSave = async () => {
    if (!currentUser || !avatarUrlInput.trim()) return;
    setAvatarLoading(true);
    setMessage('');
    try {
      const res = await axios.patch(
        'http://localhost:5001/user-api/users/me/avatar',
        { avatarUrl: avatarUrlInput.trim() },
        { withCredentials: true }
      );
      persistUser(res.data.payload);
      setMessage('Profile photo URL saved!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not save URL');
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.patch('http://localhost:5001/user-api/users/me', profileData, {
        withCredentials: true,
      });

      persistUser(res.data.payload);
      setMessage('Profile updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-8">
        <Settings size={28} />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="lg:w-1/4">
          <nav className="space-y-2 sticky top-20">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'account'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Account
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'notifications'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full text-left px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === 'appearance'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Appearance
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="lg:w-3/4">
          {message && (
            <div className={`mb-4 p-4 rounded-md ${
              message.includes('Error')
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {message}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">Profile Settings</h2>

                <div className="border border-gray-200 rounded-lg p-6 mb-8 bg-gray-50">
                  <h3 className="text-lg font-semibold mb-2">Profile photo</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload an image (JPEG, PNG, GIF, WebP) or paste a public image URL. Uploads use Cloudinary when
                    <code className="mx-1 text-xs bg-white px-1 border rounded">CLOUDINARY_*</code> env vars are set on the server.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <img
                      src={getUserAvatarUrl(currentUser)}
                      alt="Profile"
                      className="w-28 h-28 rounded-full object-cover border-2 border-white shadow"
                    />
                    <div className="flex-1 space-y-3 w-full max-w-lg">
                      <div>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                        <button
                          type="button"
                          disabled={avatarLoading}
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                          {avatarLoading ? 'Uploading…' : 'Choose image file'}
                        </button>
                      </div>
                      <div className="flex gap-2 flex-col sm:flex-row">
                        <input
                          type="url"
                          value={avatarUrlInput}
                          onChange={(e) => setAvatarUrlInput(e.target.value)}
                          placeholder="https://… (image URL)"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                        <button
                          type="button"
                          disabled={avatarLoading}
                          onClick={handleAvatarUrlSave}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
                        >
                          Save URL
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border border-blue-100 bg-blue-50/80 rounded-lg p-4 mb-8 text-sm text-gray-800">
                  <p className="font-semibold text-blue-900 mb-1">Where to add collaborators</p>
                  <p className="mb-2">
                    Open one of <strong>your repositories</strong> from the dashboard, then use the <strong>Team</strong> tab
                    on that repo page. Only the <strong>owner</strong> can invite people by username (as <strong>Viewer</strong> or{' '}
                    <strong>Collaborator</strong>).
                  </p>
                  <p>
                    Example: <Link className="text-blue-700 underline font-medium" to="/">Home</Link> → your repo →{' '}
                    <strong>Team</strong>.
                  </p>
                </div>

                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={profileData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bio
                    </label>
                    <textarea
                      name="bio"
                      value={profileData.bio}
                      onChange={handleInputChange}
                      rows="4"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tell us about yourself"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={profileData.location}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="City, Country"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={profileData.website}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company
                    </label>
                    <input
                      type="text"
                      name="company"
                      value={profileData.company}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Your company"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Account Settings</h2>

              {accountFeedback && (
                <div
                  className={`p-4 rounded-md text-sm ${
                    accountFeedback.includes('Error') || accountFeedback.includes('incorrect')
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {accountFeedback}
                </div>
              )}

              <div className="border border-gray-200 rounded-md p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Mail size={20} className="text-gray-600 mt-1 shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold">Email Address</h3>
                    <p className="text-gray-600 text-sm mt-1">Current: {currentUser?.email}</p>
                    <form
                      className="mt-4 space-y-3 max-w-md"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setAccountLoading(true);
                        setAccountFeedback('');
                        try {
                          const res = await axios.patch(
                            'http://localhost:5001/user-api/users/me/email',
                            {
                              newEmail: emailForm.newEmail.trim(),
                              currentPassword: emailForm.currentPassword,
                            },
                            { withCredentials: true }
                          );
                          if (res.data.payload) {
                            persistUser(res.data.payload);
                          }
                          setAccountFeedback(res.data.message || 'Email updated.');
                          setEmailForm({ newEmail: '', currentPassword: '' });
                        } catch (err) {
                          setAccountFeedback(err.response?.data?.message || 'Could not update email');
                        } finally {
                          setAccountLoading(false);
                        }
                      }}
                    >
                      <input
                        type="email"
                        placeholder="New email address"
                        value={emailForm.newEmail}
                        onChange={(e) => setEmailForm((p) => ({ ...p, newEmail: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        required
                      />
                      <input
                        type="password"
                        placeholder="Current password (confirm it’s you)"
                        value={emailForm.currentPassword}
                        onChange={(e) => setEmailForm((p) => ({ ...p, currentPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        autoComplete="current-password"
                        required
                      />
                      <button
                        type="submit"
                        disabled={accountLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {accountLoading ? 'Saving…' : 'Change email'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-md p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Lock size={20} className="text-gray-600 mt-1 shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold">Password</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      Use at least 8 characters. You stay signed in until the cookie expires.
                    </p>
                    <form
                      className="mt-4 space-y-3 max-w-md"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setAccountLoading(true);
                        setAccountFeedback('');
                        if (pwdForm.next !== pwdForm.confirm) {
                          setAccountFeedback('New passwords do not match.');
                          setAccountLoading(false);
                          return;
                        }
                        try {
                          await axios.patch(
                            'http://localhost:5001/user-api/users/me/password',
                            {
                              currentPassword: pwdForm.current,
                              newPassword: pwdForm.next,
                            },
                            { withCredentials: true }
                          );
                          setAccountFeedback('Password changed successfully.');
                          setPwdForm({ current: '', next: '', confirm: '' });
                        } catch (err) {
                          setAccountFeedback(err.response?.data?.message || 'Could not change password');
                        } finally {
                          setAccountLoading(false);
                        }
                      }}
                    >
                      <input
                        type="password"
                        placeholder="Current password"
                        value={pwdForm.current}
                        onChange={(e) => setPwdForm((p) => ({ ...p, current: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        autoComplete="current-password"
                        required
                      />
                      <input
                        type="password"
                        placeholder="New password"
                        value={pwdForm.next}
                        onChange={(e) => setPwdForm((p) => ({ ...p, next: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        autoComplete="new-password"
                        required
                        minLength={8}
                      />
                      <input
                        type="password"
                        placeholder="Confirm new password"
                        value={pwdForm.confirm}
                        onChange={(e) => setPwdForm((p) => ({ ...p, confirm: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        autoComplete="new-password"
                        required
                        minLength={8}
                      />
                      <button
                        type="submit"
                        disabled={accountLoading}
                        className="px-4 py-2 bg-[#24292f] text-white rounded-md text-sm font-medium hover:bg-black disabled:opacity-50"
                      >
                        {accountLoading ? 'Updating…' : 'Change password'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Notification Settings</h2>
              <div className="border border-gray-200 rounded-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell size={20} className="text-gray-600" />
                    <div>
                      <h3 className="font-semibold">Email Notifications</h3>
                      <p className="text-gray-600 text-sm">Receive emails about your account activity</p>
                    </div>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Appearance Settings</h2>
              <div className="border border-gray-200 rounded-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Palette size={20} className="text-gray-600" />
                    <div>
                      <h3 className="font-semibold">Theme</h3>
                      <p className="text-gray-600 text-sm">Choose your preferred theme</p>
                    </div>
                  </div>
                  <select className="border border-gray-300 rounded-md px-3 py-1">
                    <option>Light</option>
                    <option>Dark</option>
                    <option>Auto</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default SettingsPage;