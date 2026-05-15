import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Plus, Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../store/authStore.js';
import { getUserAvatarUrl } from '../utils/userAvatar.js';

function Header() {
  // Pull reactive state and actions from the store
  const { currentUser, isAuthenticated, logout } = useAuth();

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-[#24292f] text-white sticky top-0 z-50">
      {/* Left Section: Logo and Search */}
      <div className="flex items-center gap-4 flex-1">
        <Link to="/" className="hover:opacity-70">
          <Github size={32} />
        </Link>
        
        <div className="relative group hidden md:block">
          <input 
            type="text" 
            placeholder="Search or jump to..." 
            className="bg-[#1b1f23] border border-gray-600 rounded-md px-3 py-1 text-sm w-64 focus:w-80 focus:bg-white focus:text-black transition-all outline-none"
          />
          <kbd className="absolute right-2 top-1.5 px-1.5 py-0.5 text-[10px] font-sans font-semibold text-gray-400 border border-gray-600 rounded bg-[#1b1f23]">
            /
          </kbd>
        </div>

        <nav className="hidden lg:flex gap-4 text-sm font-semibold">
          <Link to="/pulls" className="hover:text-gray-300">Pull requests</Link>
          <Link to="/issues" className="hover:text-gray-300">Issues</Link>
          <Link to="/marketplace" className="hover:text-gray-300">Marketplace</Link>
          <Link to="/explore" className="hover:text-gray-300">Explore</Link>
        </nav>
      </div>

      {/* Right Section: Actions and Profile */}
      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <>
            <div className="flex items-center gap-3">
              <Link to="/notifications" className="hover:text-blue-400">
                <Bell size={20} />
              </Link>
              <Link to="/new" className="flex items-center gap-1 hover:text-blue-400">
                <Plus size={20} />
                <ChevronDown size={14} />
              </Link>
            </div>

            <div className="group relative">
              <button className="flex items-center gap-1 focus:outline-none">
                <img
                  src={getUserAvatarUrl(currentUser)}
                  alt="profile"
                  className="w-6 h-6 rounded-full border border-gray-500 object-cover bg-gray-700"
                />
                <ChevronDown size={14} />
              </button>
              
              {/* Dropdown Menu */}
              <div className="hidden group-hover:block absolute right-0 top-full pt-2 w-48 bg-white text-black border border-gray-300 rounded-md shadow-lg z-50">
                <div className="px-4 py-2 border-b text-sm">
                  Signed in as <span className="font-bold">{currentUser?.name}</span>
                </div>
                <Link to={`/profile/${currentUser?.username}`} className="block px-4 py-2 text-sm hover:bg-blue-600 hover:text-white font-normal">Your profile</Link>
                <Link to="/settings" className="block px-4 py-2 text-sm hover:bg-blue-600 hover:text-white font-normal">Settings</Link>
                <button 
                  onClick={() => logout().then(() => window.location.href = '/login')}
                  className="w-full text-left px-4 py-2 text-sm border-t hover:bg-red-50 text-red-600 font-normal"
                >
                  Sign out
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex gap-4 text-sm font-semibold">
            <Link to="/login" className="hover:text-gray-300 py-1">Sign in</Link>
            <Link to="/signup" className="border border-gray-500 px-3 py-1 rounded-md hover:bg-white hover:text-[#24292f] transition-all">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;