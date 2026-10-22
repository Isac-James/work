import React, { useState, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Sliders,
  Layers,
  Subtitles,
  Sparkles,
  Download,
  Check,
  RotateCcw,
  Clock,
} from 'lucide-react';
import {
  ViralMoment,
  AspectRatioType,
  SubtitleThemeType,
  SubtitleSegment,
} from '../types';

interface ManualEditorModalProps {
  moment: ViralMoment;
  videoDuration: number;
  onClose: () => void;
  onSaveAndRender: (updated: {
    momentId: string;
    startTime: number;
    endTime: number;
    aspectRatio: AspectRatioType;
    burnSubtitles: boolean;
    subtitleTheme: SubtitleThemeType;
    customTitle: string;
    customSubtitles: SubtitleSegment[];
  }) => Promise<void>;
  isRendering: boolean;
}

export const ManualEditorModal: React.FC<ManualEditorModalProps> = ({
  moment,
  videoDuration,
  onClose,
  onSaveAndRender,
  isRendering,
}) => {
  const [startTime, setStartTime] = useState<number>(moment.startTime);
  const [endTime, setEndTime] = useState<number>(moment.endTime);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('9:16');
  const [burnSubtitles, setBurnSubtitles] = useState<boolean>(true);
  const [subtitleTheme, setSubtitleTheme] = useState<SubtitleThemeType>('yellow_highlight');
  const [title, setTitle] = useState<string>(moment.title);
  const [subtitles, setSubtitles] = useState<SubtitleSegment[]>(
    moment.subtitles && moment.subtitles.length > 0
      ? [...moment.subtitles]
      : [{ start: moment.startTime, end: moment.endTime, text: moment.hook, highlightWord: 'VIRAL' }]
  );

  const duration = Math.max(1, Math.round((endTime - startTime) * 10) / 10);

  const handleUpdateSubtitle = (idx: number, field: 'text' | 'highlightWord', val: string) => {
    setSubtitles((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleAddSubtitle = () => {
    setSubtitles((prev) => [
      ...prev,
      { start: startTime, end: endTime, text: 'New caption text', highlightWord: 'KEY' },
    ]);
  };

  const handleRemoveSubtitle = (idx: number) => {
    setSubtitles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    await onSaveAndRender({
      momentId: moment.id,
      startTime,
      endTime,
      aspectRatio,
      burnSubtitles,
      subtitleTheme,
      customTitle: title,
      customSubtitles: subtitles,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Manual Video Editor</h3>
              <p className="text-xs text-slate-400">Trim timestamps, reframe aspect ratio, and tune captions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Title Editor */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Short Video Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Timeline & Timestamp Trimmer */}
          <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Precise Trim Window
              </span>
              <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2.5 py-0.5 rounded border border-indigo-900/60 tabular-nums">
                Duration: {duration}s
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Start Time (seconds)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max={Math.max(0, endTime - 1)}
                    step="0.5"
                    value={startTime}
                    onChange={(e) => setStartTime(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white font-mono tabular-nums"
                  />
                  <span className="text-xs text-slate-500">sec</span>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">End Time (seconds)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={startTime + 1}
                    max={Math.max(startTime + 1, videoDuration || 60)}
                    step="0.5"
                    value={endTime}
                    onChange={(e) => setEndTime(Math.min(videoDuration || 60, Math.max(startTime + 1, Number(e.target.value))))}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white font-mono tabular-nums"
                  />
                  <span className="text-xs text-slate-500">sec</span>
                </div>
              </div>
            </div>

            {/* Slider visual representation */}
            <div className="pt-2">
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
                <span>0.0s</span>
                <span>Active: {startTime}s - {endTime}s</span>
                <span>{videoDuration || 60}s</span>
              </div>
              <input
                type="range"
                min="0"
                max={videoDuration || 60}
                value={startTime}
                onChange={(e) => {
                  const s = Number(e.target.value);
                  setStartTime(s);
                  if (endTime <= s) setEndTime(Math.min(videoDuration || 60, s + 15));
                }}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Aspect Ratio Framing */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Social Platform Framing
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: '9:16', label: '9:16 Vertical', desc: 'Shorts · TikTok · Reels' },
                { id: '1:1', label: '1:1 Square', desc: 'Instagram · X Feed' },
                { id: '16:9', label: '16:9 Landscape', desc: 'Standard YouTube' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setAspectRatio(fmt.id as AspectRatioType)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    aspectRatio === fmt.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold text-white">{fmt.label}</p>
                  <p className="text-[11px] text-slate-400">{fmt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Subtitle Customizer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Subtitles className="w-3.5 h-3.5 text-indigo-400" />
                Kinetic Subtitle Words & Highlighting
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={burnSubtitles}
                  onChange={(e) => setBurnSubtitles(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 relative"></div>
                <span className="text-xs text-slate-400 font-medium">Burn into video</span>
              </label>
            </div>

            {burnSubtitles && (
              <div className="space-y-3 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800">
                {/* Theme picker */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'yellow_highlight', name: 'Yellow Pop', color: 'text-amber-400' },
                    { id: 'cyan_electric', name: 'Cyber Cyan', color: 'text-cyan-400' },
                    { id: 'emerald_glow', name: 'Emerald', color: 'text-emerald-400' },
                    { id: 'flame_orange', name: 'Flame', color: 'text-orange-400' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSubtitleTheme(t.id as SubtitleThemeType)}
                      className={`p-2 rounded-lg border text-center text-xs font-bold transition-all ${
                        subtitleTheme === t.id
                          ? 'border-indigo-500 bg-slate-800 text-white'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className={t.color}>{t.name}</span>
                    </button>
                  ))}
                </div>

                {/* Subtitle segment list */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {subtitles.map((sub, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 text-xs">
                      <span className="text-[10px] font-mono text-slate-500 w-4">{idx + 1}</span>
                      <input
                        type="text"
                        value={sub.text}
                        onChange={(e) => handleUpdateSubtitle(idx, 'text', e.target.value)}
                        placeholder="Subtitle phrase"
                        className="flex-1 bg-transparent border-none text-white focus:outline-none placeholder:text-slate-600"
                      />
                      <input
                        type="text"
                        value={sub.highlightWord || ''}
                        onChange={(e) => handleUpdateSubtitle(idx, 'highlightWord', e.target.value)}
                        placeholder="Highlight word"
                        className="w-28 bg-slate-950 border border-slate-700 px-2 py-0.5 rounded text-[11px] text-amber-300 font-bold focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtitle(idx)}
                        className="text-slate-500 hover:text-red-400 p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddSubtitle}
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  + Add another caption segment
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-6 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isRendering}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            {isRendering ? 'Rendering FFmpeg MP4...' : 'Apply & Re-render MP4'}
          </button>
        </div>
      </div>
    </div>
  );
};
