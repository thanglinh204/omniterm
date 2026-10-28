import React, { useState } from "react";
import { X, FileUp, CheckCircle, AlertCircle, Server, Folder, Terminal, Monitor } from "lucide-react";
import { parseMobaXtermIni, MobaImportResult } from "../../services/mobaImporter";
import { SessionItem } from "../../types/session";

interface MobaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (sessions: SessionItem[]) => void;
}

export const MobaImportModal: React.FC<MobaImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [importResult, setImportResult] = useState<MobaImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage("");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = parseMobaXtermIni(text);
        if (result.sessions.length === 0) {
          setErrorMessage("No valid sessions found in this file. Please verify it is a MobaXterm.ini file.");
        } else {
          setImportResult(result);
        }
      } catch (err) {
        setErrorMessage(`Failed to parse file: ${(err as Error).message}`);
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage("Error reading file.");
      setIsProcessing(false);
    };

    reader.readAsText(file, "latin1");
  };

  const handleConfirmImport = () => {
    if (importResult && importResult.sessions.length > 0) {
      onImportComplete(importResult.sessions);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#181b26] border border-[#282d3f] rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#282d3f] bg-[#12141c]">
          <div className="flex items-center space-x-2">
            <FileUp className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Import Sessions from MobaXterm
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-[#282d3f] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-300">
            Easily migrate all your saved SSH, RDP, and SFTP bookmarks from MobaXterm into OmniTerm. Your folder structure and jump host configurations will be preserved 100%.
          </p>

          {!importResult ? (
            <div>
              <label
                htmlFor="moba-file-input"
                className="flex flex-col items-center justify-center border-2 border-dashed border-[#282d3f] hover:border-primary/60 hover:bg-[#1f2434] transition-colors rounded-lg p-6 cursor-pointer text-center group"
              >
                <FileUp className="w-8 h-8 text-slate-400 group-hover:text-primary mb-2 transition-colors" />
                <span className="text-xs font-medium text-slate-200">
                  Select your <span className="text-amber-400">MobaXterm.ini</span> file
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Usually located at %APPDATA%\MobaXterm\MobaXterm.ini or in MobaXterm root folder
                </span>
                <input
                  id="moba-file-input"
                  type="file"
                  accept=".ini,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {isProcessing && (
                <div className="text-center text-xs text-primary mt-2">
                  Parsing MobaXterm configurations...
                </div>
              )}

              {errorMessage && (
                <div className="flex items-center space-x-2 text-xs text-red-400 bg-red-950/30 p-2.5 rounded border border-red-900/50 mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/30 p-2.5 rounded border border-emerald-900/50">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>
                  Successfully parsed <strong>{importResult.stats.totalSessions}</strong> sessions across <strong>{importResult.stats.folderCount}</strong> folders!
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#12141c] p-2.5 rounded border border-[#282d3f]">
                  <div className="flex items-center justify-center space-x-1 text-emerald-400 mb-1">
                    <Terminal className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">SSH</span>
                  </div>
                  <div className="text-lg font-bold text-white">{importResult.stats.sshCount}</div>
                </div>

                <div className="bg-[#12141c] p-2.5 rounded border border-[#282d3f]">
                  <div className="flex items-center justify-center space-x-1 text-blue-400 mb-1">
                    <Monitor className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">RDP</span>
                  </div>
                  <div className="text-lg font-bold text-white">{importResult.stats.rdpCount}</div>
                </div>

                <div className="bg-[#12141c] p-2.5 rounded border border-[#282d3f]">
                  <div className="flex items-center justify-center space-x-1 text-amber-400 mb-1">
                    <Folder className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Folders</span>
                  </div>
                  <div className="text-lg font-bold text-white">{importResult.stats.folderCount}</div>
                </div>
              </div>

              {/* Sample Folders list */}
              <div className="bg-[#12141c] p-2 rounded border border-[#282d3f] max-h-32 overflow-y-auto text-[11px] font-mono text-slate-400">
                <div className="font-semibold text-slate-300 mb-1 font-sans">
                  Sample groups identified:
                </div>
                {importResult.folders.slice(0, 8).map((f) => (
                  <div key={f} className="truncate">
                    📁 {f}
                  </div>
                ))}
                {importResult.folders.length > 8 && (
                  <div className="text-slate-500 italic">
                    ...and {importResult.folders.length - 8} more folders
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 px-4 py-3 bg-[#12141c] border-t border-[#282d3f]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-[#282d3f] rounded transition-colors"
          >
            Cancel
          </button>
          {importResult && (
            <button
              type="button"
              onClick={handleConfirmImport}
              className="px-4 py-1.5 text-xs bg-primary hover:bg-primary-hover text-white font-medium rounded shadow transition-colors flex items-center space-x-1.5"
            >
              <span>Import {importResult.stats.totalSessions} Sessions</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
