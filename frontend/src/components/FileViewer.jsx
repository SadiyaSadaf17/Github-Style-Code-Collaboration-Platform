import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom'; // Using react-router-dom
import axios from 'axios';
import { FileCode, Copy, Trash2, Edit, Save, X } from 'lucide-react';
import MonacoEditor from './editor/MonacoEditor';

function FileViewer() {
  const { repoId, "*": filePath } = useParams();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  useEffect(() => {
    const fetchFileContent = async () => {
      try {
        // IMPORTANT: withCredentials must be true to send the HttpOnly cookie
        const res = await axios.get(`http://localhost:5001/file-api/repos/${repoId}/file`, {
          params: { path: filePath },
          withCredentials: true 
        });
        setContent(res.data.payload.content);
        setEditedContent(res.data.payload.content);
      } catch (err) {
        console.error("Error fetching file content", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFileContent();
  }, [repoId, filePath]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    alert("Copied to clipboard!");
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await axios.patch(`http://localhost:5001/file-api/repos/${repoId}/file`, {
        content: editedContent
      }, {
        params: { path: filePath },
        withCredentials: true
      });
      setContent(editedContent);
      setIsEditing(false);
      alert("File saved successfully!");
    } catch (err) {
      console.error("Error saving file", err);
      alert("Failed to save file");
    }
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Reading file...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-sm mb-4 text-gray-600">
        <Link to={`/repo/${repoId}`} className="text-[#0969da] hover:underline font-semibold">
          {repoId}
        </Link>
        <span>/</span>
        <span className="font-mono">{filePath}</span>
      </nav>

      <div className="border border-gray-300 rounded-t-md bg-[#f6f8fa] p-2 flex justify-between items-center">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileCode size={16} className="text-gray-500" />
          <span>{content.split('\n').length} lines</span>
          <span className="text-gray-400">|</span>
          <span>{(new Blob([content]).size / 1024).toFixed(2)} KB</span>
        </div>
        
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button onClick={handleSave} className="p-1.5 border rounded-md hover:bg-white transition-colors text-green-600">
                <Save size={16} />
              </button>
              <button onClick={handleCancel} className="p-1.5 border rounded-md hover:bg-white transition-colors text-gray-600">
                <X size={16} />
              </button>
            </>
          ) : (
            <>
              <button onClick={copyToClipboard} className="p-1.5 border rounded-md hover:bg-white transition-colors">
                <Copy size={16} className="text-gray-600" />
              </button>
              <button onClick={handleEdit} className="p-1.5 border rounded-md hover:bg-white text-gray-600">
                <Edit size={16} />
              </button>
              <button className="p-1.5 border rounded-md hover:bg-white text-red-600">
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="border border-t-0 border-gray-300 rounded-b-md bg-white overflow-x-auto">
        {isEditing ? (
          <MonacoEditor
            value={editedContent}
            onChange={setEditedContent}
            language="javascript" // You can detect language based on file extension
            repoId={repoId}
            filePath={filePath}
            height="600px"
          />
        ) : (
          <table className="w-full text-xs font-mono border-collapse">
            <tbody>
              {content.split('\n').map((line, index) => (
                <tr key={index} className="hover:bg-blue-50 group">
                  <td className="w-12 text-right pr-4 text-gray-400 select-none border-r border-gray-200 bg-[#f6f8fa] py-0.5">
                    {index + 1}
                  </td>
                  <td className="pl-4 whitespace-pre py-0.5 text-[#1f2328]">
                    {line || ' '}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default FileViewer;