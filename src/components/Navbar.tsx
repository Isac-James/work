import React from 'react';
import { Film, Sparkles, UploadCloud, Video } from 'lucide-react';

interface NavbarProps {
  onOpenUpload: () => void;
  onOpenSamples: () => void;
  hasActiveVideo: boolean;
  onReset: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenUpload,
  onOpenSamples,
  hasActiveVideo,
  onReset,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0b0f17]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="flex items-center gap-2.5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white group-hover:text-indigo-300 transition-colors whitespace-nowrap shrink-0">
                ClipForge AI
              </span>
              <span className="text-[11px] font-medium text-slate-400 tracking-wide uppercase">
                Viral Shorts Studio
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <button
            onClick={onOpenUpload}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            New Project
          </button>
          <button
            onClick={onOpenSamples}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Sample Library
          </button>
          <a
            href="#features"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Capabilities
          </a>
          <a
            href="#pipeline"
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            AI Engine
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {hasActiveVideo ? (
            <button
              onClick={onReset}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Start New Video
            </button>
          ) : (
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              Upload Long Video
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
