import React, { useState } from 'react';
import { User, X } from 'lucide-react';
import { socketService } from '../services/socket';

interface NameModalProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
}

export const NameModal: React.FC<NameModalProps> = ({ isOpen, currentName, onClose }) => {
  const [nameInput, setNameInput] = useState(currentName);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      socketService.updatePeerName(nameInput.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-xl border border-[#343a44] bg-[#1c1f24] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-[#343a44] pb-3">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#f59e0b]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#eceff4]">
              Change Display Name
            </h3>
          </div>
          <button onClick={onClose} className="text-[#8b95a5] hover:text-[#eceff4]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs text-[#8b95a5] mb-1">
              Your Moniker / Name (Visible to Room)
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Alex (Design)"
              className="w-full rounded border border-[#343a44] bg-[#141619] px-3 py-2 text-sm text-[#eceff4] focus:border-[#f59e0b] focus:outline-none"
              maxLength={24}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
              Save Name
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
