import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Send, X, HardDrive, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Peer, TransferProgress } from '../types';

interface DropZoneProps {
  selectedTarget: Peer | null;
  transfers: TransferProgress[];
  onSendText: (text: string) => void;
  onSendFile: (file: File) => void;
  onCancelTransfer: (fileId: string) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({
  selectedTarget,
  transfers,
  onSendText,
  onSendFile,
  onCancelTransfer,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [textInput, setTextInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      files.forEach((file) => onSendFile(file));
    } else {
      const text = e.dataTransfer.getData('text');
      if (text) {
        onSendText(text);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach((file) => onSendFile(file));
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      onSendText(textInput.trim());
      setTextInput('');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Target Audience Moniker Banner */}
      <div className="flex items-center justify-between rounded-lg border border-[#343a44] bg-[#1c1f24] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#8b95a5]">
            Target Stream:
          </span>
          <span className="inline-flex items-center gap-1.5 rounded bg-[#f59e0b]/15 px-2.5 py-0.5 font-mono text-xs font-medium text-[#f59e0b]">
            {selectedTarget ? `@ ${selectedTarget.name}` : 'EVERYONE IN ROOM'}
          </span>
        </div>

        {/* File vs Text Toggle */}
        <div className="flex items-center gap-1 rounded-md border border-[#343a44] bg-[#141619] p-1">
          <button
            onClick={() => setMode('file')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all ${
              mode === 'file'
                ? 'bg-[#252930] text-[#eceff4] shadow-sm'
                : 'text-[#8b95a5] hover:text-[#eceff4]'
            }`}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            File Drop
          </button>
          <button
            onClick={() => setMode('text')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all ${
              mode === 'text'
                ? 'bg-[#252930] text-[#eceff4] shadow-sm'
                : 'text-[#8b95a5] hover:text-[#eceff4]'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Text Snippet
          </button>
        </div>
      </div>

      {/* Main Station Drop Receiver */}
      {mode === 'file' ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
            isDragOver
              ? 'border-[#f59e0b] bg-[#f59e0b]/10 shadow-[0_0_24px_rgba(245,158,11,0.2)]'
              : 'border-[#343a44] bg-[#1c1f24] hover:border-[#f59e0b]/60 hover:bg-[#252930]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-[#343a44] bg-[#141619] text-[#f59e0b] transition-transform group-hover:scale-105">
            <UploadCloud className="h-7 w-7" />
          </div>

          <h3 className="text-sm font-semibold text-[#eceff4] sm:text-base">
            Drag and drop files here, or click to browse
          </h3>
          <p className="mt-1 font-mono text-xs text-[#8b95a5]">
            Direct WebRTC P2P Transfer • Zero Server File Storage
          </p>

          <div className="mt-4 flex items-center gap-3">
            <span className="rounded border border-[#343a44] bg-[#141619] px-2.5 py-1 font-mono text-[11px] text-[#8b95a5]">
              ANY FILE TYPE
            </span>
            <span className="rounded border border-[#343a44] bg-[#141619] px-2.5 py-1 font-mono text-[11px] text-[#8b95a5]">
              FAST P2P
            </span>
          </div>
        </div>
      ) : (
        /* Text Snippet Input Area */
        <form onSubmit={handleTextSubmit} className="space-y-3">
          <div className="relative rounded-xl border border-[#343a44] bg-[#1c1f24] p-3 focus-within:border-[#f59e0b]">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste text snippet, link, code block, or note..."
              rows={5}
              className="w-full resize-none bg-transparent font-mono text-xs text-[#eceff4] placeholder-[#8b95a5] focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleTextSubmit(e);
                }
              }}
            />
            <div className="flex items-center justify-between pt-2 border-t border-[#343a44]/50">
              <span className="font-mono text-[10px] text-[#8b95a5]">
                Press Ctrl + Enter to dispatch
              </span>
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="flex items-center gap-1.5 rounded bg-[#f59e0b] px-3 py-1.5 text-xs font-semibold text-[#141619] transition-all hover:bg-[#fbbf24] disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
                Broadcast Text
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Active WebRTC File Transfer Progress Meters */}
      {transfers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#8b95a5]">
              Active WebRTC Transfers ({transfers.length})
            </h4>
          </div>

          {transfers.map((t) => (
            <div
              key={t.file_id}
              className="rounded-lg border border-[#343a44] bg-[#1c1f24] p-3 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <HardDrive className="h-4 w-4 shrink-0 text-[#f59e0b]" />
                  <div className="truncate">
                    <div className="truncate text-xs font-semibold text-[#eceff4]">
                      {t.name}
                    </div>
                    <div className="font-mono text-[10px] text-[#8b95a5]">
                      {formatBytes(t.bytesTransferred)} / {formatBytes(t.size)}
                      {t.speed > 0 && ` @ ${(t.speed / (1024 * 1024)).toFixed(1)} MB/s`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {t.status === 'completed' ? (
                    <span className="flex items-center gap-1 font-mono text-xs font-semibold text-[#10b981]">
                      <CheckCircle2 className="h-4 w-4" /> DONE
                    </span>
                  ) : t.status === 'failed' ? (
                    <span className="flex items-center gap-1 font-mono text-xs font-semibold text-red-400">
                      <AlertCircle className="h-4 w-4" /> FAILED
                    </span>
                  ) : (
                    <button
                      onClick={() => onCancelTransfer(t.file_id)}
                      className="text-[#8b95a5] hover:text-red-400"
                      title="Cancel Transfer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Hardware Progress Bar */}
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-[#141619]">
                <div
                  className="h-full bg-[#f59e0b] transition-all duration-200"
                  style={{ width: `${t.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
