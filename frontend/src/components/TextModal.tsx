import React, { useState } from 'react';
import { FileText, Copy, Check, X } from 'lucide-react';

interface TextModalProps {
  text: string | null;
  onClose: () => void;
}

export const TextModal: React.FC<TextModalProps> = ({ text, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!text) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-xl border border-[#343a44] bg-[#1c1f24] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-[#343a44] pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#f59e0b]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#eceff4]">
              Shared Text Snippet
            </h3>
          </div>
          <button onClick={onClose} className="text-[#8b95a5] hover:text-[#eceff4]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-[#343a44] bg-[#141619] p-4 font-mono text-xs text-[#eceff4] whitespace-pre-wrap">
          {text}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="font-mono text-[11px] text-[#8b95a5]">
            Length: {text.length} characters
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded bg-[#f59e0b] px-4 py-1.5 text-xs font-bold text-[#141619] hover:bg-[#fbbf24]"
            >
              {copied ? <Check className="h-4 w-4 text-[#10b981]" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied to Clipboard' : 'Copy All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
