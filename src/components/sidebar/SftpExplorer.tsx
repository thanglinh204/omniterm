import React, { useState, useEffect } from "react";
import {
  Folder,
  File,
  FileText,
  FileCode,
  Download,
  Upload,
  RefreshCw,
  ArrowUp,
  FolderPlus,
  Trash2,
  X,
  Save,
  Check,
  Edit3,
} from "lucide-react";
import { createInitialFs, VirtualFile, VirtualFsState } from "../../services/virtualShell";

interface SftpExplorerProps {
  currentPath?: string;
  onNavigate?: (newPath: string) => void;
  onDownload?: (fileName: string) => void;
  onUpload?: () => void;
}

export const SftpExplorer: React.FC<SftpExplorerProps> = ({
  currentPath = "/root",
  onNavigate,
}) => {
  const [fs, setFs] = useState<VirtualFsState>(() => createInitialFs());
  const [activePath, setActivePath] = useState<string>(currentPath);
  const [pathInput, setPathInput] = useState<string>(currentPath);

  // File editor modal state
  const [editingFile, setEditingFile] = useState<{ name: string; content: string; path: string } | null>(null);
  const [isSavedNotice, setIsSavedNotice] = useState<boolean>(false);
  const [newFolderModal, setNewFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>("");

  useEffect(() => {
    setActivePath(currentPath);
    setPathInput(currentPath);
  }, [currentPath]);

  const currentFiles: VirtualFile[] = fs[activePath] || [];

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (item: VirtualFile) => {
    if (item.isDir) {
      return <Folder className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    if (item.name.endsWith(".sh") || item.name.endsWith(".yml") || item.name.endsWith(".conf")) {
      return <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
  };

  const navigateTo = (newPath: string) => {
    // Clean path
    const normalized = newPath.endsWith("/") && newPath.length > 1 ? newPath.slice(0, -1) : newPath;
    setActivePath(normalized);
    setPathInput(normalized);
    onNavigate?.(normalized);
  };

  const handleRowDoubleClick = (item: VirtualFile) => {
    if (item.isDir) {
      if (item.name === "..") {
        const parts = activePath.split("/").filter(Boolean);
        parts.pop();
        const parent = parts.length > 0 ? `/${parts.join("/")}` : "/";
        navigateTo(parent);
      } else {
        const next = activePath === "/" ? `/${item.name}` : `${activePath}/${item.name}`;
        navigateTo(next);
      }
    } else {
      // Open editor for text files
      const fullPath = activePath === "/" ? `/${item.name}` : `${activePath}/${item.name}`;
      setEditingFile({
        name: item.name,
        path: fullPath,
        content: item.content ?? `# Remote File: ${item.name}\n# Size: ${item.size} bytes\n`,
      });
    }
  };

  const handleSaveFile = () => {
    if (!editingFile) return;
    setFs((prev) => {
      const copy = { ...prev };
      const dirFiles = copy[activePath] ? [...copy[activePath]] : [];
      const idx = dirFiles.findIndex((f) => f.name === editingFile.name);
      if (idx !== -1) {
        dirFiles[idx] = {
          ...dirFiles[idx],
          content: editingFile.content,
          size: editingFile.content.length,
          modified: "Just now",
        };
        copy[activePath] = dirFiles;
      }
      return copy;
    });

    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  const handleDownloadFile = (file: VirtualFile) => {
    const content = file.content ?? `Content of ${file.name}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDeleteItem = (e: React.MouseEvent, fileName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete ${fileName}?`)) return;

    setFs((prev) => {
      const copy = { ...prev };
      if (copy[activePath]) {
        copy[activePath] = copy[activePath].filter((f) => f.name !== fileName);
      }
      const fullItemPath = activePath === "/" ? `/${fileName}` : `${activePath}/${fileName}`;
      delete copy[fullItemPath];
      return copy;
    });
  };

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;

    setFs((prev) => {
      const copy = { ...prev };
      const dirFiles = copy[activePath] ? [...copy[activePath]] : [];
      if (!dirFiles.some((f) => f.name === name)) {
        dirFiles.push({
          name,
          isDir: true,
          size: 4096,
          modified: "Just now",
          permissions: "drwxr-xr-x",
        });
        copy[activePath] = dirFiles;
        const newDirPath = activePath === "/" ? `/${name}` : `${activePath}/${name}`;
        copy[newDirPath] = [];
      }
      return copy;
    });

    setNewFolderName("");
    setNewFolderModal(false);
  };

  const handleSimulateUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = (event.target?.result as string) || "";
        setFs((prev) => {
          const copy = { ...prev };
          const dirFiles = copy[activePath] ? [...copy[activePath]] : [];
          dirFiles.push({
            name: file.name,
            isDir: false,
            size: file.size,
            modified: "Just now",
            permissions: "-rw-r--r--",
            content,
          });
          copy[activePath] = dirFiles;
          return copy;
        });
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#161922] border-r border-[#282d3f] select-none text-slate-200">
      {/* SFTP toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-[#282d3f] bg-[#12141c]">
        <div className="flex items-center space-x-1.5">
          <span className="text-xs font-semibold text-slate-300">SFTP Explorer</span>
          <span className="text-[10px] bg-primary/20 text-primary-light px-1.5 py-0.2 rounded font-mono">
            {currentFiles.length} items
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setNewFolderModal(true)}
            className="p-1 hover:bg-[#282d3f] rounded text-slate-400 hover:text-white"
            title="New Remote Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleSimulateUpload}
            className="p-1 hover:bg-[#282d3f] rounded text-slate-400 hover:text-white"
            title="Upload File"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => navigateTo(activePath)}
            className="p-1 hover:bg-[#282d3f] rounded text-slate-400 hover:text-white"
            title="Refresh Directory"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Path input */}
      <div className="flex items-center p-1.5 border-b border-[#282d3f] bg-[#0f1117]">
        <input
          type="text"
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") navigateTo(pathInput);
          }}
          className="flex-1 bg-transparent text-xs text-slate-200 px-2 py-0.5 focus:outline-none font-mono"
        />
        <button
          onClick={() => {
            const parts = activePath.split("/").filter(Boolean);
            parts.pop();
            const parent = parts.length > 0 ? `/${parts.join("/")}` : "/";
            navigateTo(parent);
          }}
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#282d3f]"
          title="Go to Parent Directory"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* File list table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#12141c] text-slate-500 text-[10px] uppercase sticky top-0 border-b border-[#282d3f]">
            <tr>
              <th className="py-1 px-2 font-medium">Name</th>
              <th className="py-1 px-2 font-medium text-right">Size</th>
              <th className="py-1 px-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2230]">
            {activePath !== "/" && (
              <tr
                onDoubleClick={() => {
                  const parts = activePath.split("/").filter(Boolean);
                  parts.pop();
                  navigateTo(parts.length > 0 ? `/${parts.join("/")}` : "/");
                }}
                className="hover:bg-[#252a3b] cursor-pointer text-slate-300 group transition-colors"
              >
                <td className="py-1.5 px-2 flex items-center space-x-2 truncate">
                  <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold text-amber-200">..</span>
                </td>
                <td className="py-1.5 px-2 text-right text-slate-500 text-[11px]">-</td>
                <td className="py-1.5 px-2 text-right text-slate-500 text-[11px]">Parent</td>
              </tr>
            )}

            {currentFiles.map((file) => (
              <tr
                key={file.name}
                onDoubleClick={() => handleRowDoubleClick(file)}
                className="hover:bg-[#252a3b] cursor-pointer text-slate-300 group transition-colors"
              >
                <td className="py-1.5 px-2 flex items-center space-x-2 truncate max-w-[140px]">
                  {getFileIcon(file)}
                  <span className="truncate">{file.name}</span>
                </td>
                <td className="py-1.5 px-2 text-right text-slate-500 text-[11px]">
                  {formatSize(file.size)}
                </td>
                <td className="py-1.5 px-2 text-right">
                  <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!file.isDir && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowDoubleClick(file);
                          }}
                          className="p-1 hover:bg-[#343a4e] rounded text-slate-400 hover:text-white"
                          title="Edit File"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadFile(file);
                          }}
                          className="p-1 hover:bg-[#343a4e] rounded text-slate-400 hover:text-white"
                          title="Download File"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => handleDeleteItem(e, file.name)}
                      className="p-1 hover:bg-rose-950/60 rounded text-slate-400 hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Folder Modal */}
      {newFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#181b26] border border-[#282d3f] rounded-lg shadow-2xl w-80 p-4 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-sm font-semibold text-slate-100 mb-2">Create New Directory</h4>
            <input
              type="text"
              placeholder="folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              className="w-full bg-[#0f1117] border border-[#282d3f] rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-primary mb-3 font-mono"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setNewFolderModal(false)}
                className="px-3 py-1 text-xs text-slate-400 hover:text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-3 py-1 text-xs bg-primary hover:bg-primary-hover text-white rounded font-medium"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remote File Editor Modal */}
      {editingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#12141c] border border-[#282d3f] rounded-lg shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#181b26] border-b border-[#282d3f]">
              <div className="flex items-center space-x-2 font-mono text-xs">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-slate-200">{editingFile.name}</span>
                <span className="text-slate-500">({editingFile.path})</span>
              </div>
              <div className="flex items-center space-x-2">
                {isSavedNotice && (
                  <span className="flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <Check className="w-3 h-3" />
                    <span>Saved!</span>
                  </span>
                )}
                <button
                  onClick={handleSaveFile}
                  className="flex items-center space-x-1 px-3 py-1 text-xs bg-primary hover:bg-primary-hover text-white rounded font-medium shadow transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
                <button
                  onClick={() => setEditingFile(null)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#282d3f]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Code Textarea */}
            <div className="flex-1 p-2 bg-[#0c0e14] overflow-hidden">
              <textarea
                value={editingFile.content}
                onChange={(e) =>
                  setEditingFile((prev) => (prev ? { ...prev, content: e.target.value } : null))
                }
                className="w-full h-full bg-transparent text-slate-200 font-mono text-xs p-2 focus:outline-none resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* Footer */}
            <div className="px-4 py-1.5 bg-[#181b26] border-t border-[#282d3f] flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Lines: {editingFile.content.split("\n").length}</span>
              <span>Characters: {editingFile.content.length}</span>
              <span>Encoding: UTF-8</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
