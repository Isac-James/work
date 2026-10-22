import React from 'react';
import { Sparkles, Loader2, CheckCircle2, Film, Brain, Scissors } from 'lucide-react';

interface ProcessingOverlayProps {
  currentStep: number;
  stepMessage: string;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  currentStep,
  stepMessage,
}) => {
  const steps = [
    { title: 'Video Ingestion', desc: 'Probing streams, codec & dimensions' },
    { title: 'Audio & Speech Extraction', desc: 'Generating precise timestamped transcript' },
    { title: 'AI Viral Analysis', desc: 'Evaluating retention hooks, emotion & score' },
    { title: 'Shorts Synthesis', desc: 'FFmpeg reframing & kinetic typography' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 mx-auto flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            Forging Viral Shorts
          </h3>
          <p className="text-xs text-slate-400">{stepMessage}</p>
        </div>

        {/* Steps List */}
        <div className="space-y-3 pt-2">
          {steps.map((s, idx) => {
            const isCompleted = currentStep > idx;
            const isCurrent = currentStep === idx;

            return (
              <div
                key={s.title}
                className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-indigo-950/40 border-indigo-500/50 text-white'
                    : isCompleted
                    ? 'bg-slate-950/40 border-slate-800/80 text-slate-300'
                    : 'bg-slate-950/20 border-slate-900 text-slate-600'
                }`}
              >
                <div className="mt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-700 text-[10px] flex items-center justify-center font-mono">
                      {idx + 1}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${isCurrent ? 'text-white' : isCompleted ? 'text-slate-200' : 'text-slate-500'}`}>
                    {s.title}
                  </p>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center pt-2">
          <p className="text-[11px] text-slate-500">
            Powered by Gemini AI intelligence and FFmpeg multi-stage video filters.
          </p>
        </div>
      </div>
    </div>
  );
};
