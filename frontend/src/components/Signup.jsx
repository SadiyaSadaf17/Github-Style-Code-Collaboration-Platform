import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Github, UserPlus, Info } from 'lucide-react';

function Signup() {
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    bio: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Matches your POST http://localhost:4000/user-api/users
      const response = await axios.post('http://localhost:5001/user-api/users', 
        formData,
        { withCredentials: true } // Crucial to receive the HttpOnly cookie
      );
      
      // Store user info (non-sensitive) for UI personalization
      localStorage.setItem('user', JSON.stringify(response.data.user || response.data.payload));

      alert("Welcome to the community!");
      navigate('/');
      window.location.reload(); 
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#f6f8fa] py-12 px-4">
      <div className="mb-6 text-[#24292f]">
        <Github size={48} />
      </div>

      <div className="w-full max-w-[440px] p-8 bg-white border border-[#d0d7de] rounded-md shadow-md">
        <h1 className="text-2xl font-light text-center mb-8 text-[#1f2328]">Join AU 2027</h1>

        {error && (
          <div className="p-3 mb-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-semibold mb-2">Username *</label>
            <input 
              id="username"
              type="text" name="username"
              autoComplete="username"
              className="w-full px-3 py-2 border border-[#d0d7de] rounded-md focus:border-[#0969da] outline-none"
              placeholder="harshaa"
              onChange={handleChange} required 
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-semibold mb-2">Full Name *</label>
            <input 
              id="name"
              type="text" name="name"
              autoComplete="name"
              className="w-full px-3 py-2 border border-[#d0d7de] rounded-md focus:border-[#0969da] outline-none"
              placeholder="Harshaa S"
              onChange={handleChange} required 
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold mb-2">Email address *</label>
            <input 
              id="email"
              type="email" name="email"
              autoComplete="username"
              className="w-full px-3 py-2 border border-[#d0d7de] rounded-md focus:border-[#0969da] outline-none"
              placeholder="harshaa@example.com"
              onChange={handleChange} required 
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold mb-2">Password *</label>
            <input 
              id="password"
              type="password" name="password"
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-[#d0d7de] rounded-md focus:border-[#0969da] outline-none"
              placeholder="Min 8 characters"
              onChange={handleChange} required 
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-semibold mb-2">Bio *</label>
            <textarea 
              id="bio"
              name="bio" rows="3"
              autoComplete="off"
              className="w-full px-3 py-2 border border-[#d0d7de] rounded-md focus:border-[#0969da] outline-none"
              placeholder="Software developer..."
              onChange={handleChange} required 
            />
          </div>

          <button 
            type="submit" disabled={loading}
            className={`w-full py-2.5 text-sm font-semibold text-white bg-[#2da44e] rounded-md shadow-sm hover:bg-[#2c974b] transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-70' : ''}`}
          >
            <UserPlus size={18} />
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Signup;