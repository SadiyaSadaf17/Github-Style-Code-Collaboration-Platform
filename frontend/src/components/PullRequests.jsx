import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { GitPullRequest, Plus } from 'lucide-react';

function PullRequests() {
  const [pullRequests, setPullRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPullRequests = async () => {
      try {
        // For now, we'll fetch PRs from all repositories the user has access to
        // This is a simplified implementation - in a real app you'd want to aggregate PRs
        const reposRes = await axios.get('http://localhost:5001/repo-api/repos', {
          withCredentials: true
        });

        const allPRs = [];
        for (const repo of reposRes.data.payload || []) {
          try {
            const prsRes = await axios.get(`http://localhost:5001/pull-api/repos/${repo._id}/pulls`);
            const repoPRs = (prsRes.data.payload || []).map(pr => ({
              ...pr,
              repository: repo
            }));
            allPRs.push(...repoPRs);
          } catch (err) {
            console.error(`Error fetching PRs for repo ${repo._id}:`, err);
          }
        }

        setPullRequests(allPRs);
      } catch (err) {
        console.error("Error fetching pull requests:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPullRequests();
  }, []);

  if (loading) return <div className="p-10 text-center">Loading pull requests...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Pull requests</h1>
        <Link
          to="/new"
          className="bg-[#2da44e] text-white px-4 py-2 rounded-md hover:bg-[#2c974b] flex items-center gap-2"
        >
          <Plus size={16} />
          New pull request
        </Link>
      </div>

      <div className="space-y-4">
        {pullRequests.length > 0 ? (
          pullRequests.map((pr) => (
            <div key={pr._id} className="border border-gray-200 rounded-md p-4 hover:bg-gray-50">
              <div className="flex items-start gap-3">
                <GitPullRequest size={20} className="text-green-500 mt-1" />
                <div className="flex-1">
                  <Link
                    to={`/repo/${pr.repository._id}/pull/${pr._id}`}
                    className="text-lg font-semibold text-[#0969da] hover:underline"
                  >
                    {pr.title}
                  </Link>
                  <p className="text-sm text-gray-600 mt-1">{pr.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>#{pr._id?.slice(-6)}</span>
                    <span>opened by {pr.authorId?.name || 'Unknown'}</span>
                    <span>in {pr.repository.name}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <GitPullRequest size={48} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No pull requests found</h2>
            <p className="text-gray-500 mb-4">There are no pull requests in your repositories yet.</p>
            <Link
              to="/new"
              className="bg-[#2da44e] text-white px-4 py-2 rounded-md hover:bg-[#2c974b] inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Create your first pull request
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default PullRequests;