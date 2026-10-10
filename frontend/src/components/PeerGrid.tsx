import React from 'react';
import { Users, Monitor, Smartphone, Check } from 'lucide-react';
import type { Peer } from '../types';

interface PeerGridProps {
  peers: Peer[];
  currentPeerId: string | null;
  selectedTargetId: string | null;
  onSelectTarget: (peerId: string | null) => void;
}

export const PeerGrid: React.FC<PeerGridProps> = ({
  peers,
  currentPeerId,
  selectedTargetId,
  onSelectTarget,
}) => {
  return (
    <div className="rounded-lg border border-[#343a44] bg-[#1c1f24] p-4">
      {/* Header Strip */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-[#f59e0b]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8b95a5]">
            Network Peers ({peers.length})
          </h2>
        </div>
        <span className="font-mono text-[11px] text-[#8b95a5]">
          {peers.length === 1 ? '1 ACTIVE PEER' : `${peers.length} ONLINE`}
        </span>
      </div>

      {/* Peer Grid Container */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
        {/* Broadcast Option (Everyone) */}
        <button
          onClick={() => onSelectTarget(null)}
          className={`flex items-center justify-between rounded-md border p-2.5 text-left transition-all ${
            selectedTargetId === null
              ? 'border-[#f59e0b] bg-[#252930] shadow-[0_0_12px_rgba(245,158,11,0.15)]'
              : 'border-[#343a44] bg-[#141619] text-[#8b95a5] hover:border-[#4a515e] hover:text-[#eceff4]'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#f59e0b]/20 text-[#f59e0b]">
              <Users className="h-4 w-4" />
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-[#eceff4]">Everyone in Room</div>
              <div className="font-mono text-[10px] text-[#8b95a5]">Broadcast Share</div>
            </div>
          </div>
          {selectedTargetId === null && (
            <Check className="h-4 w-4 shrink-0 text-[#f59e0b]" />
          )}
        </button>

        {/* Peer List */}
        {peers.map((peer) => {
          const isSelf = peer.id === currentPeerId;
          const isSelected = selectedTargetId === peer.id;

          return (
            <button
              key={peer.id}
              onClick={() => !isSelf && onSelectTarget(peer.id)}
              disabled={isSelf}
              className={`flex items-center justify-between rounded-md border p-2.5 text-left transition-all ${
                isSelf
                  ? 'cursor-default border-[#343a44]/50 bg-[#141619]/50 opacity-60'
                  : isSelected
                  ? 'border-[#f59e0b] bg-[#252930] shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                  : 'border-[#343a44] bg-[#141619] hover:border-[#4a515e]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded font-mono text-xs font-bold text-[#141619]"
                  style={{ backgroundColor: peer.avatar_color || '#f59e0b' }}
                >
                  {peer.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-semibold text-[#eceff4]">
                      {peer.name}
                    </span>
                    {isSelf && (
                      <span className="rounded bg-[#343a44] px-1 py-0.2 font-mono text-[9px] text-[#8b95a5]">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[10px] text-[#8b95a5]">
                    {peer.device === 'mobile' ? (
                      <Smartphone className="h-3 w-3" />
                    ) : (
                      <Monitor className="h-3 w-3" />
                    )}
                    <span className="capitalize">{peer.device}</span>
                  </div>
                </div>
              </div>

              {!isSelf && isSelected && (
                <Check className="h-4 w-4 shrink-0 text-[#f59e0b]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
