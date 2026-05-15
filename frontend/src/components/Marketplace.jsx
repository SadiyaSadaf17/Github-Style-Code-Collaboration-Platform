import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Star, Download } from 'lucide-react';

function Marketplace() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
        <p className="text-gray-600">Discover tools and services to enhance your workflow</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder marketplace items */}
        <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3 mb-4">
            <Package size={24} className="text-blue-500" />
            <div>
              <h3 className="font-semibold text-lg">GitHub Actions</h3>
              <p className="text-sm text-gray-600">Automate your workflow</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Star size={14} />
              <span>4.8k</span>
            </div>
            <button className="bg-[#2da44e] text-white px-3 py-1 rounded-md text-sm hover:bg-[#2c974b]">
              Install
            </button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3 mb-4">
            <Package size={24} className="text-green-500" />
            <div>
              <h3 className="font-semibold text-lg">Dependabot</h3>
              <p className="text-sm text-gray-600">Keep dependencies secure</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Star size={14} />
              <span>2.1k</span>
            </div>
            <button className="bg-[#2da44e] text-white px-3 py-1 rounded-md text-sm hover:bg-[#2c974b]">
              Install
            </button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3 mb-4">
            <Package size={24} className="text-purple-500" />
            <div>
              <h3 className="font-semibold text-lg">CodeQL</h3>
              <p className="text-sm text-gray-600">Security analysis</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Star size={14} />
              <span>1.9k</span>
            </div>
            <button className="bg-[#2da44e] text-white px-3 py-1 rounded-md text-sm hover:bg-[#2c974b]">
              Install
            </button>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-500 mb-4">Marketplace is under development. More tools coming soon!</p>
        <Link
          to="/dashboard"
          className="text-[#0969da] hover:underline"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default Marketplace;