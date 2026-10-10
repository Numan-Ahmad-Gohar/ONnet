import React, { useState } from 'react';
import { Lock, Unlock, Edit3, User } from 'lucide-react';
import type { Peer, RoomState } from '../types';
import { socketService } from '../services/socket';

interface HeaderProps {
  isConnected: boolean;
  roomState: RoomState | null;
  currentPeer: Peer | null;
  onOpenPinModal: () => void;
  onOpenNameModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isConnected,
  roomState,
  currentPeer,
  onOpenPinModal,
  onOpenNameModal,
}) => {
  const [isEditingRoomName, setIsEditingRoomName] = useState(false);
  const [roomNameInput, setRoomNameInput] = useState('');

  const handleSaveRoomName = () => {
    if (roomNameInput.trim()) {
      socketService.setRoomConfig(roomNameInput.trim());
    }
    setIsEditingRoomName(false);
  };

  return (
    <header className="border-b border-[#343a44] bg-[#1c1f24] px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        
        {/* Left: Hardware Status Indicator & Room Identity */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 rounded-md border border-[#343a44] bg-[#141619] px-2.5 py-1">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                isConnected ? 'led-indicator-amber' : 'bg-red-500/50'
              }`}
              title={isConnected ? 'Connected to Office Network' : 'Disconnected'}
            />
            <span className="font-mono text-xs font-semibold tracking-wider text-[#8b95a5]">
              {roomState ? `NET::${roomState.subnet}` : 'CONNECTING...'}
            </span>
          </div>

          <div className="hidden sm:block h-4 w-px bg-[#343a44]" />

          {/* Editable Room Name */}
          <div className="flex items-center gap-2">
            {isEditingRoomName ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={roomNameInput}
                  onChange={(e) => setRoomNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRoomName()}
                  placeholder="Enter room name"
                  className="rounded border border-[#f59e0b] bg-[#141619] px-2 py-0.5 text-sm text-[#eceff4] focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveRoomName}
                  className="rounded bg-[#f59e0b] px-2 py-0.5 text-xs font-semibold text-[#141619] hover:bg-[#fbbf24]"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="group flex items-center gap-2">
                <h1 className="text-base font-semibold text-[#eceff4]">
                  {roomState?.room_name || 'Onnet'}
                </h1>
                <button
                  onClick={() => {
                    setRoomNameInput(roomState?.room_name || '');
                    setIsEditingRoomName(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[#8b95a5] hover:text-[#f59e0b]"
                  title="Rename Room"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Room PIN & User Moniker controls */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* PIN Protection Button */}
          <button
            onClick={onOpenPinModal}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              roomState?.has_pin
                ? 'border-[#f59e0b]/40 bg-[#f59e0b]/10 text-[#f59e0b]'
                : 'border-[#343a44] bg-[#252930] text-[#8b95a5] hover:border-[#4a515e] hover:text-[#eceff4]'
            }`}
            title={roomState?.has_pin ? 'Room is PIN Gated' : 'Set Room PIN'}
          >
            {roomState?.has_pin ? (
              <>
                <Lock className="h-3.5 w-3.5 text-[#f59e0b]" />
                <span className="font-mono text-[11px]">PIN LOCKED</span>
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">SET PIN</span>
              </>
            )}
          </button>

          {/* Current User Badge */}
          <button
            onClick={onOpenNameModal}
            className="flex items-center gap-2 rounded-md border border-[#343a44] bg-[#252930] px-3 py-1 text-xs font-medium text-[#eceff4] transition-colors hover:border-[#f59e0b]/50"
            title="Click to change your display name"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: currentPeer?.avatar_color || '#f59e0b' }}
            />
            <span className="max-w-[100px] truncate sm:max-w-[140px]">
              {currentPeer?.name || 'Anonymous Peer'}
            </span>
            <User className="h-3.5 w-3.5 text-[#8b95a5]" />
          </button>
        </div>

      </div>
    </header>
  );
};
