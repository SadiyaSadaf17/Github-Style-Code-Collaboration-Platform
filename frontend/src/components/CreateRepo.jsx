import React, { useState } from 'react';
import api from '../services/api.js';
import { useNavigate } from 'react-router-dom';
import { Info, Lock, Globe } from 'lucide-react';

function CreateRepo() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visibility: 'public'
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSend = {
        ...formData,
        isPrivate: formData.visibility === 'private'
      };
      delete dataToSend.visibility;

      // withCredentials sends the 'token' cookie automatically from the browser
      const response = await api.post('/repo-api/repos', dataToSend);

      navigate(`/repo/${response.data._id || response.data.payload._id}`);
    } catch (err) {
      if (err.response?.status === 401) {
        alert("Session expired. Please log in again.");
        navigate('/login');
      } else {
        alert(err.response?.data?.message || "Failed to create repository");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-[#1f2328]">
      <div className="border-b border-gray-200 pb-4 mb-8">
        <h1 className="text-2xl font-semibold text-[#1f2328]">Create a new repository</h1>
        <p className="text-gray-600">A repository contains all project files and history.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <div className="flex-1">
            <label htmlFor="name" className="block text-sm font-semibold mb-2">Repository name *</label>
            <input 
              id="name"
              type="text" name="name"
              autoComplete="off"
              className="w-full px-3 py-1.5 border border-gray-300 rounded-md bg-[#f6f8fa] focus:bg-white focus:border-[#0969da] outline-none transition-all"
              placeholder="e.g. my-awesome-project"
              value={formData.name}
              onChange={handleChange} required 
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-semibold mb-2">Description</label>
          <textarea 
            id="description"
            name="description" rows="3"
            autoComplete="off"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md bg-[#f6f8fa] focus:bg-white outline-none"
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-4">
          <label htmlFor="public" className="flex items-start gap-3 cursor-pointer">
            <input 
              id="public"
              type="radio" name="visibility" value="public"
              checked={formData.visibility === 'public'}
              onChange={handleChange}
              className="mt-1 accent-[#0969da]"
            />
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-gray-500" />
              <div>
                <span className="block font-semibold text-sm">Public</span>
                <span className="text-xs text-gray-500">Visible to everyone in the AU 2027 batch.</span>
              </div>
            </div>
          </label>

          <label htmlFor="private" className="flex items-start gap-3 cursor-pointer">
            <input 
              id="private"
              type="radio" name="visibility" value="private"
              checked={formData.visibility === 'private'}
              onChange={handleChange}
              className="mt-1 accent-[#0969da]"
            />
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-gray-500" />
              <div>
                <span className="block font-semibold text-sm">Private</span>
                <span className="text-xs text-gray-500">Only you can see this repository.</span>
              </div>
            </div>
          </label>
        </div>

        <div className="bg-blue-50 border border-blue-100 p-4 rounded-md flex gap-3 text-sm text-blue-800">
          <Info size={18} className="shrink-0" />
          <p>This will initialize a bare repository on your local server.</p>
        </div>

        <button 
          type="submit" disabled={loading}
          className={`px-5 py-2 text-sm font-semibold text-white bg-[#2da44e] rounded-md shadow-sm hover:bg-[#2c974b] transition-all ${loading ? 'opacity-70' : ''}`}
        >
          {loading ? 'Creating...' : 'Create repository'}
        </button>
      </form>
    </div>
  );
}

export default CreateRepo;