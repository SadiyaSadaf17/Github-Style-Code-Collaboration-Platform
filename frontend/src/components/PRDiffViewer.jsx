import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronRight, FileCode, Plus, Minus } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

function DiffLine({ change }) {
  const bg =
    change.type === 'add'
      ? 'bg-[#dafbe1]'
      : change.type === 'remove'
        ? 'bg-[#ffebe9]'
        : 'bg-white';

  const prefix =
    change.type === 'add' ? '+' : change.type === 'remove' ? '-' : ' ';

  const lineLabel =
    change.type === 'add'
      ? change.newLineNumber
      : change.type === 'remove'
        ? change.oldLineNumber
        : change.oldLineNumber ?? change.lineNumber;

  return (
    <div className={`flex font-mono text-xs leading-5 ${bg} border-b border-gray-100`}>
      <span className="w-12 shrink-0 text-right pr-2 text-gray-400 select-none border-r border-gray-200 bg-[#f6f8fa]">
        {lineLabel ?? ''}
      </span>
      <span
        className={`w-6 shrink-0 text-center select-none ${
          change.type === 'add'
            ? 'text-[#1a7f37]'
            : change.type === 'remove'
              ? 'text-[#cf222e]'
              : 'text-gray-400'
        }`}
      >
        {prefix}
      </span>
      <pre className="flex-1 px-2 overflow-x-auto whitespace-pre-wrap break-all text-[#1f2328] m-0">
        {change.content || ' '}
      </pre>
    </div>
  );
}

function FileDiffBlock({ file, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const statusBadge =
    file.status === 'added'
      ? 'bg-green-100 text-green-800'
      : file.status === 'removed'
        ? 'bg-red-100 text-red-800'
        : 'bg-yellow-100 text-yellow-800';

  return (
    <div className="border border-[#d0d7de] rounded-md overflow-hidden mb-4 bg-white">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-[#f6f8fa] hover:bg-[#eef1f4] text-left border-b border-[#d0d7de]"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <FileCode size={16} className="text-gray-500 shrink-0" />
        <span className="font-mono text-sm font-semibold text-[#0969da] truncate flex-1">
          {file.filename}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusBadge}`}>
          {file.status || 'modified'}
        </span>
        <span className="text-xs text-gray-600 flex items-center gap-2 shrink-0">
          <span className="text-[#1a7f37] flex items-center gap-0.5">
            <Plus size={12} />
            {file.additions ?? 0}
          </span>
          <span className="text-[#cf222e] flex items-center gap-0.5">
            <Minus size={12} />
            {file.deletions ?? 0}
          </span>
        </span>
      </button>

      {expanded && (
        <div className="overflow-x-auto">
          {file.changes?.map((change, idx) => (
            <DiffLine key={`${change.type}-${idx}-${change.lineNumber}`} change={change} />
          ))}
        </div>
      )}
    </div>
  );
}

function PRDiffViewer({ repoId, prId, fromBranch, toBranch }) {
  const { subscribe } = useSocket();
  const [diffData, setDiffData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFileIndex, setActiveFileIndex] = useState(0);

  const fetchDiff = useCallback(async () => {
    if (!repoId || !prId) return;
    try {
      setError(null);
      const res = await axios.get(
        `http://localhost:5001/pull-api/repos/${repoId}/pulls/${prId}/diff`,
        { withCredentials: true }
      );
      const payload = res.data.payload || { files: [] };
      setDiffData(payload);
      setActiveFileIndex(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load diff');
      setDiffData(null);
    } finally {
      setLoading(false);
    }
  }, [repoId, prId]);

  useEffect(() => {
    setLoading(true);
    fetchDiff();
  }, [fetchDiff]);

  useEffect(() => {
    if (!repoId) return undefined;
    const unsub = subscribe('pr:diff-updated', (data) => {
      if (data?.pullRequestId && data.pullRequestId !== prId) return;
      if (data?.repositoryId && data.repositoryId !== repoId) return;
      fetchDiff();
    });
    return unsub;
  }, [repoId, prId, subscribe, fetchDiff]);

  if (loading) {
    return (
      <div className="border border-[#d0d7de] rounded-md p-8 text-center text-gray-500 text-sm">
        Loading file changes…
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 rounded-md p-4 text-sm text-red-800 bg-red-50">{error}</div>
    );
  }

  const files = diffData?.files || [];

  if (files.length === 0) {
    return (
      <div className="border border-[#d0d7de] rounded-md p-8 text-center bg-[#f6f8fa]">
        <p className="text-gray-600 text-sm">No file changes in this pull request yet.</p>
        <p className="text-xs text-gray-500 mt-2">
          Edit files in the repository after opening the PR to see a live diff here.
        </p>
      </div>
    );
  }

  const branchLabel = fromBranch && toBranch ? (
    <p className="text-sm text-gray-600 mb-4 font-mono">
      Comparing <span className="text-[#0969da]">{fromBranch}</span>
      <span className="mx-2">→</span>
      <span className="text-[#0969da]">{toBranch}</span>
      <span className="ml-2 text-gray-500">
        ({files.length} file{files.length !== 1 ? 's' : ''} changed)
      </span>
    </p>
  ) : null;

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-3">Files changed</h2>
      {branchLabel}

      {files.length > 1 && (
        <div className="flex flex-wrap gap-1 mb-4 border-b border-[#d0d7de] pb-2 overflow-x-auto">
          {files.map((file, idx) => (
            <button
              key={file.filename}
              type="button"
              onClick={() => setActiveFileIndex(idx)}
              className={`px-3 py-1.5 text-xs font-mono rounded-t-md border border-b-0 whitespace-nowrap ${
                activeFileIndex === idx
                  ? 'bg-white border-[#d0d7de] text-[#0969da] font-semibold'
                  : 'bg-[#f6f8fa] border-transparent text-gray-600 hover:bg-gray-100'
              }`}
            >
              {file.filename}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-0">
        {files.length === 1 ? (
          <FileDiffBlock file={files[0]} defaultExpanded />
        ) : (
          <FileDiffBlock file={files[activeFileIndex]} defaultExpanded />
        )}
      </div>

      {files.length > 1 && (
        <details className="mt-4">
          <summary className="text-sm text-[#0969da] cursor-pointer hover:underline">
            Show all {files.length} files expanded
          </summary>
          <div className="mt-4 space-y-4">
            {files.map((file, idx) => (
              <FileDiffBlock key={file.filename} file={file} defaultExpanded={idx === 0} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export default PRDiffViewer;
