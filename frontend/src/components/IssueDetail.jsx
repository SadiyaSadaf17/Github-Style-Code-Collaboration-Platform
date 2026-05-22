import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api.js';
import { MessageSquare, User, Calendar } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

function IssueDetail() {
  const { repoId, issueId } = useParams();
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [repoInfo, setRepoInfo] = useState(null);
  const [reviewPath, setReviewPath] = useState('');
  const [reviewLine, setReviewLine] = useState('');
  const [reviewSide, setReviewSide] = useState('RIGHT');
  const [labelInput, setLabelInput] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);
  const { joinRepo, leaveRepo, subscribe } = useSocket();

  const handleAddLabel = async () => {
    const name = labelInput.trim();
    if (!name || !issue) return;
    const labels = [...(issue.labels || [])];
    if (labels.some((l) => l.name === name)) return;
    labels.push({ name, color: '#0969da' });
    setSavingMeta(true);
    try {
      const res = await api.patch(`/issue-api/repos/${repoId}/issues/${issueId}`, { labels });
      setIssue(res.data.payload);
      setLabelInput('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update labels');
    } finally {
      setSavingMeta(false);
    }
  };

  const handleToggleState = async () => {
    if (!issue) return;
    const next = issue.state === 'closed' ? 'open' : 'closed';
    setSavingMeta(true);
    try {
      const res = await api.patch(`/issue-api/repos/${repoId}/issues/${issueId}`, { state: next });
      setIssue(res.data.payload);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update issue');
    } finally {
      setSavingMeta(false);
    }
  };

  const loadComments = useCallback(async () => {
    const commentRes = await api.get(`/comment-api/issues/${issueId}/comments`);
    setComments(commentRes.data.payload || []);
  }, [issueId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch repo info
        const repoRes = await api.get(`/repo-api/repos/${repoId}`);
        setRepoInfo(repoRes.data.payload || repoRes.data);

        // Fetch issue
        const issueRes = await api.get(`/issue-api/repos/${repoId}/issues/${issueId}`);
        setIssue(issueRes.data.payload || issueRes.data);

        await loadComments();
      } catch (err) {
        console.error("Error fetching issue", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [repoId, issueId, loadComments]);

  useEffect(() => {
    if (!repoId) return;
    joinRepo(repoId);
    const unsub = subscribe('issue:comment', (data) => {
      if (data?.issueId === issueId) loadComments();
    });
    return () => {
      unsub();
      leaveRepo(repoId);
    };
  }, [repoId, issueId, joinRepo, leaveRepo, subscribe, loadComments]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const payload = { content: newComment };
      if (reviewPath.trim()) {
        payload.path = reviewPath.trim();
        const ln = parseInt(reviewLine, 10);
        if (!Number.isNaN(ln)) payload.line = ln;
        payload.side = reviewSide === 'LEFT' ? 'LEFT' : 'RIGHT';
      }
      await api.post(`/comment-api/issues/${issueId}/comments`, payload);
      setNewComment('');
      setReviewPath('');
      setReviewLine('');
      await loadComments();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add comment");
    }
  };

  if (loading) return <div className="p-10 text-center">Loading issue...</div>;
  if (!issue) return <div className="p-10 text-center">Issue not found</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6 text-gray-600">
        <Link to={`/repo/${repoId}`} className="text-[#0969da] hover:underline">
          {repoInfo?.name}
        </Link>
        <span>/</span>
        <span>Issues</span>
        <span>/</span>
        <span className="font-semibold">#{issue.number || issueId}</span>
      </div>

      {/* Issue Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{issue.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className={`px-2 py-1 rounded-full ${issue.state === 'closed' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {issue.state || 'open'}
          </span>
          <div className="flex items-center gap-1">
            <User size={16} />
            <span>{issue.author?.name || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={16} />
            <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        {(issue.labels || []).map((lbl) => (
          <span
            key={lbl.name}
            className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
            style={{ backgroundColor: lbl.color || '#0969da' }}
          >
            {lbl.name}
          </span>
        ))}
        <div className="flex gap-1">
          <input
            type="text"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            placeholder="Add label"
            className="px-2 py-1 text-sm border border-gray-300 rounded-md"
          />
          <button
            type="button"
            disabled={savingMeta}
            onClick={handleAddLabel}
            className="px-2 py-1 text-sm bg-[#f6f8fa] border border-gray-300 rounded-md hover:bg-gray-100"
          >
            Add
          </button>
        </div>
        <button
          type="button"
          disabled={savingMeta}
          onClick={handleToggleState}
          className="ml-auto px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
        >
          {issue.state === 'closed' ? 'Reopen issue' : 'Close issue'}
        </button>
      </div>

      {/* Issue Description */}
      <div className="bg-white border border-gray-300 rounded-md p-6 mb-8">
        <p className="text-gray-800 whitespace-pre-wrap">{issue.body || issue.description}</p>
      </div>

      {/* Comments Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <MessageSquare size={20} />
          Comments ({comments.length})
        </h2>

        {/* Existing Comments */}
        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <div key={comment._id} className="bg-white border border-gray-300 rounded-md p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-gray-400" />
                  <span className="font-semibold">{comment.author?.name || 'Unknown'}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              {comment.path != null && comment.path !== '' && (
                <p className="text-xs font-mono text-[#0969da] mb-1">
                  {comment.path}
                  {comment.line != null ? ` (line ${comment.line}${comment.side ? `, ${comment.side}` : ''})` : ''}
                </p>
              )}
              <p className="text-gray-800">{comment.body}</p>
            </div>
          ))}
        </div>

        {/* Add Comment */}
        <div className="bg-white border border-gray-300 rounded-md p-4 space-y-3">
          <label className="block text-sm font-medium mb-2">Add a comment</label>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Leave a comment..."
            rows="4"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <div className="border-t border-gray-200 pt-3">
            <p className="text-xs font-semibold text-gray-600 mb-2">Optional: reference a file and line</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={reviewPath}
                onChange={(e) => setReviewPath(e.target.value)}
                placeholder="File path"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm sm:col-span-2"
              />
              <input
                type="number"
                min={1}
                value={reviewLine}
                onChange={(e) => setReviewLine(e.target.value)}
                placeholder="Line"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <select
              value={reviewSide}
              onChange={(e) => setReviewSide(e.target.value)}
              className="mt-2 px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="RIGHT">RIGHT</option>
              <option value="LEFT">LEFT</option>
            </select>
          </div>
          <button
            onClick={handleAddComment}
            className="px-4 py-2 bg-[#2da44e] text-white rounded-md hover:bg-[#2c974b]"
          >
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}

export default IssueDetail;
