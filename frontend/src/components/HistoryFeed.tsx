import React, { useState, useEffect } from 'react';
import { Download, Copy, Check, Eye, Clock, File } from 'lucide-react';
import type { SharedItem, SharedFileMeta } from '../types';
import { socketService } from '../services/socket';

interface HistoryFeedProps {
  history: SharedItem[];
  currentPeerName?: string;
  currentPeerId?: string;
  onDownloadFile: (fileMeta: SharedFileMeta, senderId: string) => void;
  onViewText: (text: string) => void;
}

export const HistoryFeed: React.FC<HistoryFeedProps> = ({
  history,
  currentPeerName,
  onDownloadFile,
  onViewText,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Mark items seen when displayed
  useEffect(() => {
    history.forEach((item) => {
      if (currentPeerName && !item.seen_by.includes(currentPeerName)) {
        socketService.markSeen(item.id);
      }
    });
  }, [history, currentPeerName]);

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="rounded-lg border border-[#343a44] bg-[#1c1f24] p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8b95a5]">
          Room History Stream ({history.length})
        </h2>
        <span className="font-mono text-[11px] text-[#8b95a5]">ROLLING HISTORY (~50 ITEMS)</span>
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-[#8b95a5]">
          <Clock className="mb-2 h-8 w-8 text-[#343a44]" />
          <p className="text-xs font-medium">No activity yet in this room session.</p>
          <p className="font-mono text-[10px] mt-0.5">Drop a file or text snippet above to start.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
          {history.map((item) => {
            const isText = item.type === 'text';
            const fileMeta = !isText ? (item.content as SharedFileMeta) : null;
            const textContent = isText ? (item.content as string) : '';
            const isDirect = !!item.target_peer_id;

            return (
              <div
                key={item.id}
                className={`rounded-lg border p-3.5 transition-colors ${
                  isDirect
                    ? 'border-[#f59e0b]/40 bg-[#f59e0b]/5'
                    : 'border-[#343a44] bg-[#141619] hover:border-[#4a515e]'
                }`}
              >
                {/* Item Top Metadata Bar */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.sender_color || '#f59e0b' }}
                    />
                    <span className="text-xs font-semibold text-[#eceff4]">
                      {item.sender_name}
                    </span>
                    {isDirect && (
                      <span className="rounded bg-[#f59e0b]/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#f59e0b]">
                        DIRECT 1:1
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-[#8b95a5]">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </div>

                {/* Content Render */}
                {isText ? (
                  <div className="space-y-2">
                    <pre
                      onClick={() => onViewText(textContent)}
                      className="max-h-32 overflow-hidden whitespace-pre-wrap font-mono text-xs text-[#eceff4] cursor-pointer hover:text-[#fbbf24]"
                    >
                      {textContent}
                    </pre>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleCopyText(item.id, textContent)}
                        className="flex items-center gap-1 rounded border border-[#343a44] bg-[#252930] px-2 py-1 text-[11px] font-medium text-[#eceff4] hover:border-[#f59e0b]"
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="h-3 w-3 text-[#10b981]" />
                            <span className="text-[#10b981]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 text-[#8b95a5]" />
                            Copy Text
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* File Card Render */
                  fileMeta && (
                    <div className="flex items-center justify-between rounded-md border border-[#343a44] bg-[#252930] p-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <File className="h-5 w-5 shrink-0 text-[#f59e0b]" />
                        <div className="truncate">
                          <div className="truncate text-xs font-semibold text-[#eceff4]">
                            {fileMeta.name}
                          </div>
                          <div className="font-mono text-[10px] text-[#8b95a5]">
                            {formatFileSize(fileMeta.size)}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onDownloadFile(fileMeta, item.sender_id)}
                        className="flex items-center gap-1.5 rounded bg-[#f59e0b] px-3 py-1.5 text-xs font-semibold text-[#141619] transition-all hover:bg-[#fbbf24]"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    </div>
                  )
                )}

                {/* Read Receipts Indicator */}
                <div className="mt-2.5 flex items-center gap-1.5 pt-2 border-t border-[#343a44]/40 font-mono text-[10px] text-[#8b95a5]">
                  <Eye className="h-3 w-3 text-[#8b95a5]" />
                  <span>
                    Seen by:{' '}
                    <strong className="text-[#eceff4]">
                      {item.seen_by.length > 0 ? item.seen_by.join(', ') : 'None yet'}
                    </strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
