import React, { useState } from 'react';
import { Lock, ShieldAlert, KeyRound } from 'lucide-react';
import { socketService } from '../services/socket';

interface PinGateScreenProps {
  roomName: string;
  onSuccess: (pin: string) => void;
}

export const PinGateScreen: React.FC<PinGateScreenProps> = ({ roomName, onSuccess }) => {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setError('Please enter the room PIN');
      return;
    }

    const socket = socketService.getSocket();
    socket.once('pin_result', (data: { success: boolean; error?: string }) => {
      if (data.success) {
        onSuccess(pinInput.trim());
      } else {
        setError(data.error || 'Invalid PIN code');
      }
    });

    socketService.verifyPin(pinInput.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#141619] p-4">
      <div className="w-full max-w-md rounded-xl border border-[#343a44] bg-[#1c1f24] p-8 shadow-2xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-[#343a44] bg-[#141619] text-[#f59e0b]">
          <Lock className="h-7 w-7" />
        </div>

        <h2 className="text-lg font-bold text-[#eceff4]">{roomName} is PIN Protected</h2>
        <p className="mt-1 font-mono text-xs text-[#8b95a5]">
          Enter the room security PIN to view active peers and shared history.
        </p>

        {error && (
          <div className="mt-4 flex items-center justify-center gap-2 rounded bg-red-500/10 p-2.5 text-xs text-red-400 border border-red-500/30">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Enter PIN"
              className="w-full text-center tracking-widest font-mono text-lg rounded border border-[#343a44] bg-[#141619] px-4 py-2.5 text-[#eceff4] focus:border-[#f59e0b] focus:outline-none"
              maxLength={8}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded bg-[#f59e0b] px-4 py-2.5 text-sm font-bold text-[#141619] hover:bg-[#fbbf24] transition-all"
          >
            <KeyRound className="h-4 w-4" />
            Unlock Room Access
          </button>
        </form>
      </div>
    </div>
  );
};
