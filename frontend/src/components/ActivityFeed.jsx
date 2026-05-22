import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GitCommit, GitPullRequest, CircleDot, FolderGit2 } from 'lucide-react';
import api from '../services/api.js';
import { getUserAvatarUrl } from '../utils/userAvatar.js';

const TYPE_META = {
  commit: { icon: GitCommit, label: 'committed' },
  issue_opened: { icon: CircleDot, label: 'opened an issue' },
  issue_closed: { icon: CircleDot, label: 'closed an issue' },
  pr_opened: { icon: GitPullRequest, label: 'opened a pull request' },
  pr_merged: { icon: GitPullRequest, label: 'merged a pull request' },
  pr_closed: { icon: GitPullRequest, label: 'closed a pull request' },
  repo_created: { icon: FolderGit2, label: 'created a repository' },
  repo_forked: { icon: FolderGit2, label: 'forked a repository' },
};

function ActivityItem({ item }) {
  const meta = TYPE_META[item.type] || { icon: GitCommit, label: item.type };
  const Icon = meta.icon;
  const actor = item.actor;
  const repo = item.repository;
  const payload = item.payload || {};

  let detail = '';
  if (payload.title) detail = payload.title;
  else if (payload.name) detail = payload.name;

  return (
    <li className="flex gap-3 py-3 border-b border-gray-100 last:border-0">
      <img
        src={getUserAvatarUrl(actor)}
        alt=""
        className="w-8 h-8 rounded-full object-cover bg-gray-200 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[#1f2328]">
          <Link to={`/profile/${actor?.username}`} className="font-semibold text-[#0969da] hover:underline">
            {actor?.username || actor?.name}
          </Link>{' '}
          {meta.label}
          {repo && (
            <>
              {' '}
              in{' '}
              <Link to={`/repo/${repo._id}`} className="font-semibold text-[#0969da] hover:underline">
                {repo.fullName || repo.name}
              </Link>
            </>
          )}
        </p>
        {detail && <p className="text-sm text-gray-600 truncate mt-0.5">{detail}</p>}
        <p className="text-xs text-gray-400 mt-1">
          {new Date(item.createdAt).toLocaleString()}
        </p>
      </div>
      <Icon size={16} className="text-gray-400 shrink-0 mt-1" />
    </li>
  );
}

export default function ActivityFeed({ scope = 'following', userId, title = 'Activity' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { scope, limit: 20 };
    if (scope === 'user' && userId) params.userId = userId;
    api
      .get('/activity-api/feed', { params })
      .then((res) => setItems(res.data.payload || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [scope, userId]);

  return (
    <div className="border border-[#d0d7de] rounded-md bg-white">
      <div className="px-4 py-3 border-b border-[#d0d7de] font-semibold text-sm">{title}</div>
      {loading ? (
        <div className="p-6 text-center text-gray-500 text-sm">Loading activity…</div>
      ) : items.length === 0 ? (
        <div className="p-6 text-center text-gray-500 text-sm">
          {scope === 'following' ? 'Follow developers to see their activity here.' : 'No recent activity.'}
        </div>
      ) : (
        <ul className="px-4">
          {items.map((item) => (
            <ActivityItem key={item._id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
