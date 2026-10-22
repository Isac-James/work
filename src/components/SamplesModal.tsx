import React from 'react';
import { X, Play, Clock, Sparkles } from 'lucide-react';
import { PrebuiltSample } from '../types';

interface SamplesModalProps {
  samples: PrebuiltSample[];
  onSelect: (sample: PrebuiltSample) => void;
  onClose: () => void;
}

export const SamplesModal: React.FC<SamplesModalProps> = ({
  samples,
  onSelect,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Studio Sample Videos</h3>
            <p className="text-xs text-slate-400">Select a pre-configured video to test AI clipping immediately</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {samples.map((sample) => (
            <div
              key={sample.id}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-28 h-18 rounded-lg bg-slate-800 overflow-hidden shrink-0 relative border border-slate-700">
                  <img
                    src={sample.thumbnail}
                    alt={sample.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[10px] font-mono text-slate-300 tabular-nums">
                    {sample.duration}s
                  </div>
                </div>
                <div className="space-y-1 min-w-0">
                  <span className="text-[11px] font-mono text-indigo-400 uppercase tracking-wide">
                    {sample.category}
                  </span>
                  <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {sample.title}
                  </h4>
                  <p className="text-xs text-slate-400">Speaker: {sample.speaker}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  onSelect(sample);
                  onClose();
                }}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 cursor-pointer"
              >
                Load Video
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
