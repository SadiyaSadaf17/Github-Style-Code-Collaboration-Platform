import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Github, AlertCircle } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5001/user-api/login', 
        { email, password },
        { withCredentials: true } 
      );

      // Store only UI-related info; the cookie handles security
      localStorage.setItem('user', JSON.stringify(response.data.user));

      navigate('/');
      window.location.reload(); 
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-[#f6f8fa] px-4">
      <div className="mb-6 text-[#24292f]">
        <Github size={48} />
      </div>
      
      <div className="w-full max-w-[340px] p-5 bg-white border border-[#d0d7de] rounded-md shadow-sm">
        <h1 className="text-2xl font-light text-center mb-4 text-[#1f2328]">Sign in to GitHub Clone</h1>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-normal mb-2 text-[#1f2328]">Email address</label>
            <input 
              id="email"
              type="email" 
              autoComplete="username"
              className="w-full px-3 py-1 border border-[#d0d7de] rounded-md focus:border-[#0969da] outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="password" className="text-sm font-normal text-[#1f2328]">Password</label>
              <a href="#" className="text-xs text-[#0969da] hover:underline">Forgot password?</a>
            </div>
            <input 
              id="password"
              type="password" 
              autoComplete="current-password"
              className="w-full px-3 py-1 border border-[#d0d7de] rounded-md focus:border-[#0969da] outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-2 text-sm font-semibold text-white bg-[#2da44e] rounded-md hover:bg-[#2c974b] transition-colors ${loading ? 'opacity-70' : ''}`}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>

      <div className="w-full max-w-[340px] mt-4 p-4 border border-[#d8dee4] rounded-md text-center">
        <p className="text-sm text-[#1f2328]">
          New here? <Link to="/signup" className="text-[#0969da] hover:underline">Create an account</Link>.
        </p>
      </div>
    </div>
  );
}

export default Login;