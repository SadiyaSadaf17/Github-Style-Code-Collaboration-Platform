import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { CircleDot, Plus } from 'lucide-react';

function Issues() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        // For now, we'll fetch issues from all repositories the user has access to
        // This is a simplified implementation - in a real app you'd want to aggregate issues
        const reposRes = await axios.get('http://localhost:5001/repo-api/repos', {
          withCredentials: true
        });

        const allIssues = [];
        for (const repo of reposRes.data.payload || []) {
          try {
            const issuesRes = await axios.get(`http://localhost:5001/issue-api/repos/${repo._id}/issues`);
            const repoIssues = (issuesRes.data.payload || []).map(issue => ({
              ...issue,
              repository: repo
            }));
            allIssues.push(...repoIssues);
          } catch (err) {
            console.error(`Error fetching issues for repo ${repo._id}:`, err);
          }
        }

        setIssues(allIssues);
      } catch (err) {
        console.error("Error fetching issues:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, []);

  if (loading) return <div className="p-10 text-center">Loading issues...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Issues</h1>
        <Link
          to="/new"
          className="bg-[#2da44e] text-white px-4 py-2 rounded-md hover:bg-[#2c974b] flex items-center gap-2"
        >
          <Plus size={16} />
          New issue
        </Link>
      </div>

      <div className="space-y-4">
        {issues.length > 0 ? (
          issues.map((issue) => (
            <div key={issue._id} className="border border-gray-200 rounded-md p-4 hover:bg-gray-50">
              <div className="flex items-start gap-3">
                <CircleDot size={20} className="text-green-500 mt-1" />
                <div className="flex-1">
                  <Link
                    to={`/repo/${issue.repository._id}/issues/${issue._id}`}
                    className="text-lg font-semibold text-[#0969da] hover:underline"
                  >
                    {issue.title}
                  </Link>
                  <p className="text-sm text-gray-600 mt-1">{issue.body}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>#{issue.number}</span>
                    <span>opened by {issue.author?.name || 'Unknown'}</span>
                    <span>in {issue.repository.name}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <CircleDot size={48} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No issues found</h2>
            <p className="text-gray-500 mb-4">There are no issues in your repositories yet.</p>
            <Link
              to="/new"
              className="bg-[#2da44e] text-white px-4 py-2 rounded-md hover:bg-[#2c974b] inline-flex items-center gap-2"
            >
              <Plus size={16} />
              Create your first issue
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default Issues;