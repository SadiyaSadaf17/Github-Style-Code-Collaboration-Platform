import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { User, Calendar, MessageSquare } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import PRDiffViewer from './PRDiffViewer';

function PullRequestDetail() {
  const { repoId, prId } = useParams();
  const [pr, setPr] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [repoInfo, setRepoInfo] = useState(null);
  const [reviewPath, setReviewPath] = useState('');
  const [reviewLine, setReviewLine] = useState('');
  const [reviewSide, setReviewSide] = useState('RIGHT');
  const { joinRepo, leaveRepo, subscribe } = useSocket();

  const loadComments = useCallback(async () => {
    const commentRes = await axios.get(`http://localhost:5001/comment-api/pulls/${prId}/comments`, {
      withCredentials: true,
    });
    setComments(commentRes.data.payload || []);
  }, [prId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const repoRes = await axios.get(`http://localhost:5001/repo-api/repos/${repoId}`, {
          withCredentials: true,
        });
        setRepoInfo(repoRes.data.payload || repoRes.data);

        const prRes = await axios.get(`http://localhost:5001/pull-api/repos/${repoId}/pulls/${prId}`, {
          withCredentials: true,
        });
        setPr(prRes.data.payload || prRes.data);

        await loadComments();
      } catch (err) {
        console.error('Error fetching pull request', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [repoId, prId, loadComments]);

  useEffect(() => {
    if (!repoId) return;
    joinRepo(repoId);
    const unsubReview = subscribe('review:comment', (data) => {
      if (data?.pullRequestId === prId) loadComments();
    });
    const unsubPr = subscribe('pr:updated', (data) => {
      if (data?.pullRequestId !== prId && data?.pullRequest?._id !== prId) return;
      const updated = data?.pullRequest;
      if (updated) setPr((prev) => ({ ...prev, ...updated }));
    });
    return () => {
      unsubReview();
      unsubPr();
      leaveRepo(repoId);
    };
  }, [repoId, prId, joinRepo, leaveRepo, subscribe, loadComments]);

  const canWrite = repoInfo?.currentUserRole === 'owner' || repoInfo?.currentUserRole === 'collaborator';

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
      await axios.post(`http://localhost:5001/comment-api/pulls/${prId}/comments`, payload, {
        withCredentials: true,
      });
      setNewComment('');
      setReviewPath('');
      setReviewLine('');
      await loadComments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add comment');
    }
  };

  const handleMergePR = async () => {
    try {
      await axios.post(
        `http://localhost:5001/pull-api/repos/${repoId}/pulls/${prId}/merge`,
        {},
        { withCredentials: true }
      );
      setPr((prev) => (prev ? { ...prev, status: 'MERGED' } : prev));
      alert('Pull request merged successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to merge pull request');
    }
  };

  if (loading) return <div className="p-10 text-center">Loading pull request...</div>;
  if (!pr) return <div className="p-10 text-center">Pull request not found</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm mb-6 text-gray-600">
        <Link to={`/repo/${repoId}`} className="text-[#0969da] hover:underline">
          {repoInfo?.name}
        </Link>
        <span>/</span>
        <span>Pull Requests</span>
        <span>/</span>
        <span className="font-semibold">#{pr.number || prId}</span>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{pr.title}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span
            className={`px-2 py-1 rounded-full ${
              pr.status === 'MERGED' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
            }`}
          >
            {pr.status || 'open'}
          </span>
          <div className="flex items-center gap-1">
            <User size={16} />
            <span>{pr.authorId?.name || 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={16} />
            <span>{new Date(pr.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-100 border border-gray-300 rounded-md p-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm text-gray-600">Branches</p>
              <p className="font-mono text-sm">
                <span className="text-blue-600">{pr.fromBranch}</span>
                <span className="mx-2">→</span>
                <span className="text-blue-600">{pr.toBranch}</span>
              </p>
            </div>
          </div>
          {pr.status !== 'MERGED' && canWrite && (
            <button
              onClick={handleMergePR}
              className="px-4 py-2 bg-[#2da44e] text-white rounded-md hover:bg-[#2c974b]"
            >
              Merge Pull Request
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-300 rounded-md p-6 mb-8">
        <p className="text-gray-800 whitespace-pre-wrap">{pr.description}</p>
      </div>

      <PRDiffViewer
        repoId={repoId}
        prId={prId}
        fromBranch={pr.fromBranch}
        toBranch={pr.toBranch}
      />

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <MessageSquare size={20} />
          Comments ({comments.length})
        </h2>

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

        <div className="bg-white border border-gray-300 rounded-md p-4 space-y-3">
          <label className="block text-sm font-medium">Add a comment</label>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Leave a general or review comment…"
            rows="4"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <div className="border-t border-gray-200 pt-3 mt-2">
            <p className="text-xs font-semibold text-gray-600 mb-2">Optional: comment on a specific line (GitHub-style review)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={reviewPath}
                onChange={(e) => setReviewPath(e.target.value)}
                placeholder="File path (e.g. src/App.jsx)"
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
              <option value="RIGHT">RIGHT (after change)</option>
              <option value="LEFT">LEFT (before change)</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleAddComment}
            className="px-4 py-2 bg-[#2da44e] text-white rounded-md hover:bg-[#2c974b]"
          >
            Comment
          </button>
          {!canWrite && (
            <p className="text-xs text-gray-500">Viewers can comment on discussions; merge requires collaborator or owner.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PullRequestDetail;
