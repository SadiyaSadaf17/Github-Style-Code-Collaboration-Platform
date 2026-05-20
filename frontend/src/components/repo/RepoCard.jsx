import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Globe, GitBranch } from 'lucide-react';

export default function RepoCard({ repo }) {
  const ownerName = repo.owner?.username || repo.owner?.name || 'unknown';
  const isPrivate = repo.isPrivate;

  return (
    <Link
      to={`/repo/${repo._id}`}
      className="block p-4 bg-white border border-[#d0d7de] rounded-md hover:border-[#0969da] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#0969da] truncate">
            {ownerName}
            <span className="text-[#1f2328] font-normal"> / </span>
            {repo.name}
          </p>
          {repo.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{repo.description}</p>
          )}
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            isPrivate ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-green-50 text-green-800 border border-green-200'
          }`}
        >
          {isPrivate ? <Lock size={12} /> : <Globe size={12} />}
          {isPrivate ? 'Private' : 'Public'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
        {repo.language && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#0969da]" />
            {repo.language}
          </span>
        )}
        {repo.myAccessRole && repo.myAccessRole !== 'owner' && (
          <span className="capitalize px-1.5 py-0.5 bg-gray-100 rounded">{repo.myAccessRole}</span>
        )}
        <span className="flex items-center gap-1">
          <GitBranch size={12} />
          Updated {repo.updatedAt ? new Date(repo.updatedAt).toLocaleDateString() : 'recently'}
        </span>
      </div>
    </Link>
  );
}
