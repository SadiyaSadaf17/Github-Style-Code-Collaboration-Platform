import React, { useRef, useEffect, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../store/authStore';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#85C1E9'];

function pickColor(id) {
  let hash = 0;
  const s = String(id || '');
  for (let i = 0; i < s.length; i += 1) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

const MonacoEditor = ({
  value,
  onChange,
  language = 'javascript',
  theme = 'vs-dark',
  repoId,
  filePath,
  readOnly = false,
  height = '400px',
  onSave,
  isDirty = false,
}) => {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const cursorDecorationsRef = useRef([]);
  const selectionDecorationsRef = useRef([]);
  const remoteApplyRef = useRef(false);
  const emitTimerRef = useRef(null);
  const versionRef = useRef(0);
  const remoteSelectionsRef = useRef({});

  const { getSocket, emit, subscribe, joinRepo, leaveRepo, connected } = useSocket();
  const { currentUser } = useAuth();
  const [collaborators, setCollaborators] = useState([]);
  const [wasDisconnected, setWasDisconnected] = useState(false);

  const displayName = currentUser?.username || currentUser?.name || 'You';
  const authUserId = currentUser?._id || currentUser?.id;

  const applyRemoteDecorations = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    const decos = [];
    for (const [remoteId, data] of Object.entries(remoteSelectionsRef.current)) {
      if (!data.selection) continue;
      const color = pickColor(remoteId);
      const { startLineNumber, startColumn, endLineNumber, endColumn } = data.selection;
      decos.push({
        range: new monaco.Range(startLineNumber, startColumn, endLineNumber, endColumn),
        options: {
          className: 'collab-selection',
          inlineClassName: 'collab-selection-inline',
          hoverMessage: { value: `${data.username || 'Collaborator'}'s selection` },
          overviewRuler: {
            color,
            position: monaco.editor.OverviewRulerLane.Full,
          },
        },
      });
      if (data.cursor) {
        decos.push({
          range: new monaco.Range(
            data.cursor.lineNumber,
            data.cursor.column,
            data.cursor.lineNumber,
            data.cursor.column + 1
          ),
          options: {
            className: 'collab-cursor-line',
            hoverMessage: { value: data.username || 'Collaborator' },
          },
        });
      }
    }
    selectionDecorationsRef.current = editor.deltaDecorations(
      selectionDecorationsRef.current,
      decos
    );
  }, []);

  useEffect(() => {
    if (!connected) setWasDisconnected(true);
    if (connected && wasDisconnected) {
      setWasDisconnected(false);
      emit('presence:join', {
        repoId,
        username: displayName,
        userId: authUserId,
        filePath,
      });
    }
  }, [connected, wasDisconnected, repoId, filePath, displayName, authUserId, emit]);

  useEffect(() => {
    if (!repoId) return undefined;

    joinRepo(repoId);
    emit('presence:join', {
      repoId,
      username: displayName,
      userId: authUserId,
      filePath,
    });

    const socketId = getSocket()?.id;

    const handleFileEditUpdate = (data) => {
      if (data.filePath !== filePath) return;
      if (data.authUserId === authUserId) return;
      if (data.userId === socketId && !data.authUserId) return;

      const remoteId = data.authUserId || data.userId || data.socketId;

      if (data.selection || data.cursor) {
        remoteSelectionsRef.current[remoteId] = {
          username: data.username,
          selection: data.selection,
          cursor: data.cursor,
        };
        applyRemoteDecorations();
      }

      if (data.content == null) return;

      const editor = editorRef.current;
      if (!editor) return;

      remoteApplyRef.current = true;
      const model = editor.getModel();
      if (model) {
        editor.executeEdits('remote', [
          {
            range: model.getFullModelRange(),
            text: data.content,
          },
        ]);
        onChange?.(data.content);
      }
      remoteApplyRef.current = false;
    };

    const handlePresenceJoin = (data) => {
      if (data.socketId === socketId) return;
      setCollaborators((prev) => {
        const id = data.socketId || data.userId;
        if (prev.some((c) => c.id === id)) return prev;
        return [
          ...prev,
          {
            id,
            name: data.username || 'Guest',
            color: pickColor(id),
          },
        ];
      });
    };

    const handlePresenceLeave = (data) => {
      const id = data.socketId || data.userId;
      delete remoteSelectionsRef.current[id];
      applyRemoteDecorations();
      setCollaborators((prev) => prev.filter((c) => c.id !== id));
    };

    const unsubs = [
      subscribe('file:edit:update', handleFileEditUpdate),
      subscribe('presence:join', handlePresenceJoin),
      subscribe('presence:leave', handlePresenceLeave),
    ];

    return () => {
      emit('presence:leave', { repoId, userId: authUserId, filePath });
      unsubs.forEach((u) => u());
      leaveRepo(repoId);
      remoteSelectionsRef.current = {};
    };
  }, [
    repoId,
    filePath,
    displayName,
    authUserId,
    joinRepo,
    leaveRepo,
    emit,
    subscribe,
    getSocket,
    onChange,
    applyRemoteDecorations,
  ]);

  const scheduleEmit = useCallback(
    (content, cursor, selection) => {
      if (remoteApplyRef.current || !getSocket()?.connected) return;
      clearTimeout(emitTimerRef.current);
      emitTimerRef.current = setTimeout(() => {
        versionRef.current += 1;
        emit('file:edit:update', {
          repoId,
          filePath,
          content,
          cursor,
          selection,
          username: displayName,
          authUserId,
          version: versionRef.current,
        });
      }, 120);
    },
    [repoId, filePath, displayName, authUserId, emit, getSocket]
  );

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
    });

    editor.onDidChangeCursorPosition((e) => {
      if (remoteApplyRef.current) return;
      const sel = editor.getSelection();
      const selection =
        sel &&
        (sel.startLineNumber !== sel.endLineNumber || sel.startColumn !== sel.endColumn)
          ? {
              startLineNumber: sel.startLineNumber,
              startColumn: sel.startColumn,
              endLineNumber: sel.endLineNumber,
              endColumn: sel.endColumn,
            }
          : null;
      scheduleEmit(editor.getValue(), e.position, selection);
    });

    editor.onDidChangeCursorSelection((e) => {
      if (remoteApplyRef.current) return;
      const sel = e.selection;
      const selection =
        sel.startLineNumber !== sel.endLineNumber || sel.startColumn !== sel.endColumn
          ? {
              startLineNumber: sel.startLineNumber,
              startColumn: sel.startColumn,
              endLineNumber: sel.endLineNumber,
              endColumn: sel.endColumn,
            }
          : null;
      scheduleEmit(editor.getValue(), sel.getPosition(), selection);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.(editor.getValue());
    });

    emit('file:edit:start', {
      repoId,
      filePath,
      username: displayName,
      authUserId,
    });
  };

  const handleEditorChange = (newValue) => {
    if (remoteApplyRef.current) return;
    onChange?.(newValue);
    const editor = editorRef.current;
    const pos = editor?.getPosition();
    const sel = editor?.getSelection();
    const selection =
      sel &&
      (sel.startLineNumber !== sel.endLineNumber || sel.startColumn !== sel.endColumn)
        ? {
            startLineNumber: sel.startLineNumber,
            startColumn: sel.startColumn,
            endLineNumber: sel.endLineNumber,
            endColumn: sel.endColumn,
          }
        : null;
    scheduleEmit(newValue, pos, selection);
  };

  const handleEditorBlur = () => {
    emit('file:edit:end', { repoId, filePath, authUserId });
  };

  return (
    <div className="relative">
      {(!connected || wasDisconnected) && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-amber-100 border-b border-amber-300 text-amber-900 text-xs px-3 py-1.5 text-center">
          {connected ? 'Reconnected — collaboration resumed' : 'Offline — changes are local until reconnected'}
        </div>
      )}

      {collaborators.length > 0 && (
        <div className="absolute top-8 right-2 z-10 flex flex-wrap gap-1 max-w-[50%] justify-end">
          {collaborators.map((c) => (
            <span
              key={c.id}
              className="text-xs px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: c.color }}
            >
              {c.name}
            </span>
          ))}
        </div>
      )}

      {isDirty && connected && (
        <div className="absolute top-8 left-2 z-10 text-xs text-[#9a6700] bg-[#fff8c5] px-2 py-0.5 rounded border border-[#d4a72c]">
          Unsaved changes
        </div>
      )}

      <Editor
        height={height}
        language={language}
        value={value}
        theme={theme}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        onBlur={handleEditorBlur}
        options={{
          readOnly,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          minimap: { enabled: true },
          fontSize: 14,
          wordWrap: 'on',
        }}
      />
    </div>
  );
};

export default MonacoEditor;
