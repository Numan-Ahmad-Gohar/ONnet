import React, { useState } from 'react';
import { Lock, Unlock, X, ShieldAlert } from 'lucide-react';
import { socketService } from '../services/socket';

interface PinModalProps {
  isOpen: boolean;
  hasPin: boolean;
  onClose: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({ isOpen, hasPin, onClose }) => {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setError('Please enter a valid PIN.');
      return;
    }
    socketService.setRoomConfig(undefined, pinInput.trim());
    onClose();
  };

  const handleRemovePin = () => {
    socketService.setRoomConfig(undefined, null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-xl border border-[#343a44] bg-[#1c1f24] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-[#343a44] pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-[#f59e0b]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#eceff4]">
              {hasPin ? 'Modify Room PIN Protection' : 'Enable PIN Gated Access'}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#8b95a5] hover:text-[#eceff4]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-3 flex items-center gap-2 rounded bg-red-500/10 p-2.5 text-xs text-red-400 border border-red-500/30">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSetPin} className="space-y-4">
          <div>
            <label className="block font-mono text-xs text-[#8b95a5] mb-1">
              Enter 4 to 8 Digit Security PIN
            </label>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="e.g. 8492"
              className="w-full rounded border border-[#343a44] bg-[#141619] px-3 py-2 font-mono text-sm text-[#eceff4] focus:border-[#f59e0b] focus:outline-none"
              maxLength={8}
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {hasPin && (
              <button
                type="button"
                onClick={handleRemovePin}
                className="flex items-center gap-1.5 rounded border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10"
              >
                <Unlock className="h-3.5 w-3.5" /> Remove PIN
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-[#343a44] px-3 py-1.5 text-xs font-medium text-[#8b95a5] hover:text-[#eceff4]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-[#f59e0b] px-4 py-1.5 text-xs font-bold text-[#141619] hover:bg-[#fbbf24]"
              >
                {hasPin ? 'Update PIN' : 'Enable PIN'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
