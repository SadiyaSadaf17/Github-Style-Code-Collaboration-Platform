import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { FileText, GitBranch, Plus, MessageSquare, GitPullRequest, GitCommit, Users } from 'lucide-react';

function RepoExplorer() {
  const { repoId } = useParams();
  const [repoInfo, setRepoInfo] = useState(null);
  const [files, setFiles] = useState([]);
  const [issues, setIssues] = useState([]);
  const [pulls, setPulls] = useState([]);
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('code');
  const [newFilePath, setNewFilePath] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [creating, setCreating] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showPRForm, setShowPRForm] = useState(false);
  const [issueForm, setIssueForm] = useState({ title: '', description: '' });
  const [prForm, setPrForm] = useState({ title: '', description: '', fromBranch: '', toBranch: '' });
  const [fetchError, setFetchError] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');

  useEffect(() => {
    const fetchRepoData = async () => {
      try {
        setFetchError(null);
        const repoRes = await axios.get(`http://localhost:5001/repo-api/repos/${repoId}`, {
          withCredentials: true
        });
        const repoPayload = repoRes.data.payload || repoRes.data;
        setRepoInfo(repoPayload);

        const [fileRes, issueRes, pullRes, commitRes] = await Promise.all([
          axios.get(`http://localhost:5001/file-api/repos/${repoId}/files`, { withCredentials: true }),
          axios.get(`http://localhost:5001/issue-api/repos/${repoId}/issues`, { withCredentials: true }),
          axios.get(`http://localhost:5001/pull-api/repos/${repoId}/pulls`, { withCredentials: true }),
          axios.get(`http://localhost:5001/commit-api/repos/${repoId}/commits`, { withCredentials: true })
        ]);

        setFiles(fileRes.data.payload || fileRes.data || []);
        setIssues(issueRes.data.payload || issueRes.data || []);
        setPulls(pullRes.data.payload || pullRes.data || []);
        setCommits(commitRes.data.payload || commitRes.data || []);
      } catch (err) {
        const st = err.response?.status;
        if (st === 401 || st === 403) {
          setFetchError(err.response?.data?.message || 'You do not have access to this repository.');
        } else {
          console.error('Error loading repository', err);
          setFetchError(err.response?.data?.message || 'Failed to load repository.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchRepoData();
  }, [repoId]);

  useEffect(() => {
    if (activeTab !== 'team' || !repoId || fetchError) return;
    const loadTeam = async () => {
      try {
        const res = await axios.get(`http://localhost:5001/repo-api/repos/${repoId}/collaborators`, {
          withCredentials: true
        });
        setCollaborators(res.data.payload || []);
      } catch (err) {
        console.error('Failed to load team', err);
      }
    };
    loadTeam();
  }, [activeTab, repoId, fetchError]);

  const handleCreateFile = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await axios.post(`http://localhost:5001/file-api/repos/${repoId}/files`, {
        path: newFilePath,
        content: newFileContent
      }, { withCredentials: true });
      setNewFilePath('');
      setNewFileContent('');
      // Refresh files
      const fileRes = await axios.get(`http://localhost:5001/file-api/repos/${repoId}/files`, {
        withCredentials: true
      });
      setFiles(fileRes.data.payload || fileRes.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create file');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const response = await axios.post(`http://localhost:5001/issue-api/repos/${repoId}/issues`, {
        title: issueForm.title,
        description: issueForm.description
      }, { withCredentials: true });
      
      setIssueForm({ title: '', description: '' });
      setShowIssueForm(false);
      
      // Refresh issues
      const issueRes = await axios.get(`http://localhost:5001/issue-api/repos/${repoId}/issues`, {
        withCredentials: true
      });
      setIssues(issueRes.data.payload || issueRes.data);
      alert('Issue created successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create issue');
    } finally {
      setCreating(false);
    }
  };

  const handleCreatePR = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await axios.post(`http://localhost:5001/pull-api/repos/${repoId}/pulls`, {
        title: prForm.title,
        description: prForm.description,
        fromBranch: prForm.fromBranch,
        toBranch: prForm.toBranch
      }, { withCredentials: true });
      
      setPrForm({ title: '', description: '', fromBranch: '', toBranch: '' });
      setShowPRForm(false);
      
      // Refresh pull requests
      const pullRes = await axios.get(`http://localhost:5001/pull-api/repos/${repoId}/pulls`, {
        withCredentials: true
      });
      setPulls(pullRes.data.payload || pullRes.data);
      alert('Pull request created successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create pull request');
    } finally {
      setCreating(false);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await axios.post(
        `http://localhost:5001/repo-api/repos/${repoId}/collaborators`,
        { username: inviteUsername.trim(), role: inviteRole },
        { withCredentials: true }
      );
      setInviteUsername('');
      setInviteRole('viewer');
      const res = await axios.get(`http://localhost:5001/repo-api/repos/${repoId}/collaborators`, { withCredentials: true });
      setCollaborators(res.data.payload || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add member');
    } finally {
      setCreating(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this person from the repository?')) return;
    try {
      await axios.delete(`http://localhost:5001/repo-api/repos/${repoId}/collaborators/${userId}`, { withCredentials: true });
      const res = await axios.get(`http://localhost:5001/repo-api/repos/${repoId}/collaborators`, { withCredentials: true });
      setCollaborators(res.data.payload || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleChangeMemberRole = async (userId, role) => {
    try {
      await axios.patch(
        `http://localhost:5001/repo-api/repos/${repoId}/collaborators/${userId}`,
        { role },
        { withCredentials: true }
      );
      const res = await axios.get(`http://localhost:5001/repo-api/repos/${repoId}/collaborators`, { withCredentials: true });
      setCollaborators(res.data.payload || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role');
    }
  };

  if (loading) return <div className="p-10 text-center font-mono">Loading code...</div>;

  if (fetchError) {
    return (
      <div className="max-w-xl mx-auto mt-20 p-6 border border-red-200 rounded-md bg-red-50 text-red-800">
        <p className="font-semibold">Cannot open repository</p>
        <p className="mt-2 text-sm">{fetchError}</p>
      </div>
    );
  }

  if (!repoInfo) {
    return <div className="p-10 text-center text-gray-500">Repository not found.</div>;
  }

  const canWrite = repoInfo.currentUserRole === 'owner' || repoInfo.currentUserRole === 'collaborator';
  const canManageTeam = repoInfo.currentUserRole === 'owner';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-xl mb-6">
        <GitBranch size={20} className="text-gray-500" />
        <Link to={`/profile/${repoInfo?.owner?.name}`} className="text-[#0969da] hover:underline">
          {repoInfo?.owner?.name}
        </Link>
        <span className="text-gray-400">/</span>
        <span className="font-bold">{repoInfo?.name}</span>
        <span className="ml-2 px-2 py-0.5 border border-gray-300 rounded-full text-xs text-gray-500 lowercase">
          {repoInfo?.isPrivate ? 'private' : 'public'}
        </span>
        {repoInfo?.currentUserRole && (
          <span className="ml-2 px-2 py-0.5 bg-gray-100 border border-gray-200 rounded-full text-xs text-gray-700 capitalize">
            your role: {repoInfo.currentUserRole}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('code')}
          className={`px-4 py-2 ${activeTab === 'code' ? 'border-b-2 border-[#0969da] text-[#0969da]' : 'text-gray-600'}`}
        >
          <FileText size={16} className="inline mr-2" />
          Code
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={`px-4 py-2 ${activeTab === 'issues' ? 'border-b-2 border-[#0969da] text-[#0969da]' : 'text-gray-600'}`}
        >
          <MessageSquare size={16} className="inline mr-2" />
          Issues ({issues.length})
        </button>
        <button
          onClick={() => setActiveTab('pulls')}
          className={`px-4 py-2 ${activeTab === 'pulls' ? 'border-b-2 border-[#0969da] text-[#0969da]' : 'text-gray-600'}`}
        >
          <GitPullRequest size={16} className="inline mr-2" />
          Pull Requests ({pulls.length})
        </button>
        <button
          onClick={() => setActiveTab('commits')}
          className={`px-4 py-2 ${activeTab === 'commits' ? 'border-b-2 border-[#0969da] text-[#0969da]' : 'text-gray-600'}`}
        >
          <GitCommit size={16} className="inline mr-2" />
          Commits ({commits.length})
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2 ${activeTab === 'team' ? 'border-b-2 border-[#0969da] text-[#0969da]' : 'text-gray-600'}`}
        >
          <Users size={16} className="inline mr-2" />
          Team
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'code' && (
        <>
          <div className="border border-gray-300 rounded-md overflow-hidden bg-white">
            <table className="w-full text-sm">
              <tbody>
                {files.map((file, index) => (
                  <tr key={index} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2 w-8">
                      <FileText size={18} className="text-gray-500" />
                    </td>
                    <td className="py-2">
                      <Link to={`/repo/${repoId}/blob/${file.path}`} className="text-[#0969da] hover:underline font-medium">
                        {file.path}
                      </Link>
                    </td>
                    <td className="py-2 text-gray-500">Latest commit message</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canWrite && (
          <div className="mt-8 p-4 border border-gray-300 rounded-md bg-white">
            <h3 className="text-lg font-semibold mb-4">Create New File</h3>
            <form onSubmit={handleCreateFile} className="space-y-4">
              <div>
                <label htmlFor="filePath" className="block text-sm font-medium mb-2">File Path</label>
                <input
                  id="filePath"
                  type="text"
                  autoComplete="off"
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g. src/index.js"
                  required
                />
              </div>
              <div>
                <label htmlFor="fileContent" className="block text-sm font-medium mb-2">File Content</label>
                <textarea
                  id="fileContent"
                  value={newFileContent}
                  onChange={(e) => setNewFileContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows="10"
                  placeholder="Enter file content..."
                  required
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-[#2da44e] text-white rounded-md hover:bg-[#2c974b] disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create File'}
              </button>
            </form>
          </div>
          )}
        </>
      )}

      {activeTab === 'issues' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Issues</h3>
            {canWrite && (
            <button 
              onClick={() => setShowIssueForm(!showIssueForm)}
              className="px-4 py-2 bg-[#2da44e] text-white rounded-md hover:bg-[#2c974b]"
            >
              <Plus size={16} className="inline mr-2" />
              New Issue
            </button>
            )}
          </div>

          {!canWrite && (
            <p className="text-sm text-gray-500">Viewers can browse issues but cannot open new ones.</p>
          )}

          {canWrite && showIssueForm && (
            <form onSubmit={handleCreateIssue} className="border border-gray-300 rounded-md p-4 bg-white">
              <div className="space-y-4">
                <div>
                  <label htmlFor="issueTitle" className="block text-sm font-medium mb-2">Title</label>
                  <input
                    id="issueTitle"
                    type="text"
                    value={issueForm.title}
                    onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Issue title..."
                    required
                  />
                </div>
                <div>
                  <label htmlFor="issueDesc" className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    id="issueDesc"
                    value={issueForm.description}
                    onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows="5"
                    placeholder="Issue description..."
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-[#2da44e] text-white rounded-md hover:bg-[#2c974b] disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Issue'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowIssueForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {issues.map((issue) => (
            <Link key={issue._id} to={`/repo/${repoId}/issues/${issue._id}`} className="block">
              <div className="p-4 border border-gray-300 rounded-md bg-white hover:bg-gray-50 hover:border-gray-400 transition">
                <h4 className="font-semibold text-[#0969da]">{issue.title}</h4>
                <p className="text-gray-600">{issue.body || issue.description}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded">{issue.state || 'open'}</span>
                  <span>#{issue.number || issue._id?.slice(-6)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {activeTab === 'pulls' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Pull Requests</h3>
            {canWrite && (
            <button 
              onClick={() => setShowPRForm(!showPRForm)}
              className="px-4 py-2 bg-[#2da44e] text-white rounded-md hover:bg-[#2c974b]"
            >
              <Plus size={16} className="inline mr-2" />
              New Pull Request
            </button>
            )}
          </div>

          {!canWrite && (
            <p className="text-sm text-gray-500">Viewers can browse pull requests but cannot create them.</p>
          )}

          {canWrite && showPRForm && (
            <form onSubmit={handleCreatePR} className="border border-gray-300 rounded-md p-4 bg-white">
              <div className="space-y-4">
                <div>
                  <label htmlFor="prTitle" className="block text-sm font-medium mb-2">Title</label>
                  <input
                    id="prTitle"
                    type="text"
                    value={prForm.title}
                    onChange={(e) => setPrForm({ ...prForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Pull request title..."
                    required
                  />
                </div>
                <div>
                  <label htmlFor="prDesc" className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    id="prDesc"
                    value={prForm.description}
                    onChange={(e) => setPrForm({ ...prForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows="4"
                    placeholder="Pull request description..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fromBranch" className="block text-sm font-medium mb-2">From Branch</label>
                    <input
                      id="fromBranch"
                      type="text"
                      value={prForm.fromBranch}
                      onChange={(e) => setPrForm({ ...prForm, fromBranch: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g. feature/new-feature"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="toBranch" className="block text-sm font-medium mb-2">To Branch</label>
                    <input
                      id="toBranch"
                      type="text"
                      value={prForm.toBranch}
                      onChange={(e) => setPrForm({ ...prForm, toBranch: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="e.g. main"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-[#2da44e] text-white rounded-md hover:bg-[#2c974b] disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Pull Request'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPRForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {pulls.map((pull) => (
            <Link key={pull._id} to={`/repo/${repoId}/pull/${pull._id}`} className="block">
              <div className="p-4 border border-gray-300 rounded-md bg-white hover:bg-gray-50 hover:border-gray-400 transition">
                <h4 className="font-semibold text-[#0969da]">{pull.title}</h4>
                <p className="text-gray-600">{pull.description}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <span className={`px-2 py-1 rounded ${pull.status === 'MERGED' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                    {pull.status || 'open'}
                  </span>
                  <span>#{pull._id?.slice(-6)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {activeTab === 'commits' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Commits</h3>
          {commits.map((commit) => (
            <div key={commit._id} className="p-4 border border-gray-300 rounded-md bg-white">
              <p className="font-semibold">{commit.message}</p>
              <p className="text-gray-600">Files: {commit.files?.length || 0}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Team and permissions</h3>
            <p className="text-sm text-gray-600">
              <strong>Owner</strong> controls settings and membership. <strong>Collaborators</strong> can change code, files, issues, and pull requests.
              <strong> Viewers</strong> can browse the repository but cannot make changes.
            </p>
          </div>

          <div className="border border-gray-300 rounded-md overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Member</th>
                  <th className="text-left px-4 py-2 font-medium">Role</th>
                  {canManageTeam && <th className="text-right px-4 py-2 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-4 py-3">
                    <span className="font-medium">{repoInfo.owner?.name || repoInfo.owner?.username}</span>
                    {repoInfo.owner?.username && (
                      <span className="text-gray-500 ml-2">@{repoInfo.owner.username}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-amber-100 text-amber-900 rounded text-xs font-medium capitalize">owner</span>
                  </td>
                  {canManageTeam && <td className="px-4 py-3" />}
                </tr>
                {collaborators.map((c) => {
                  const u = c.user;
                  const uid = u?._id ?? c.user;
                  const idStr = typeof uid === 'string' ? uid : uid?.toString?.();
                  return (
                    <tr key={idStr} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <span className="font-medium">{u?.name || u?.username || 'User'}</span>
                        {u?.username && <span className="text-gray-500 ml-2">@{u.username}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {canManageTeam ? (
                          <select
                            value={c.role === 'collaborator' ? 'collaborator' : 'viewer'}
                            onChange={(e) => handleChangeMemberRole(idStr, e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-xs capitalize"
                          >
                            <option value="viewer">viewer</option>
                            <option value="collaborator">collaborator</option>
                          </select>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs capitalize">
                            {c.role === 'collaborator' ? 'collaborator' : 'viewer'}
                          </span>
                        )}
                      </td>
                      {canManageTeam && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(idStr)}
                            className="text-red-600 text-xs hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {canManageTeam && (
            <form onSubmit={handleInviteMember} className="p-4 border border-gray-300 rounded-md bg-gray-50 space-y-3 max-w-lg">
              <h4 className="font-semibold text-sm">Invite by username</h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  placeholder="Git username"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  required
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="viewer">Viewer</option>
                  <option value="collaborator">Collaborator</option>
                </select>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-[#0969da] text-white rounded-md text-sm font-semibold hover:bg-[#055ac1] disabled:opacity-50 whitespace-nowrap"
                >
                  Add member
                </button>
              </div>
            </form>
          )}

          {!canManageTeam && (
            <p className="text-xs text-gray-500">Only the repository owner can invite people or change roles.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default RepoExplorer;