import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileVideo,
  Sparkles,
  Sliders,
  PlayCircle,
  Clock,
  Layers,
  Subtitles,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { AspectRatioType, GenerationSettings, PrebuiltSample, SubtitleThemeType } from '../types';

interface UploadSectionProps {
  onVideoSelected: (file: File) => void;
  onSampleSelected: (sample: PrebuiltSample) => void;
  samples: PrebuiltSample[];
  settings: GenerationSettings;
  onSettingsChange: (settings: GenerationSettings) => void;
  isUploading: boolean;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onVideoSelected,
  onSampleSelected,
  samples,
  settings,
  onSettingsChange,
  isUploading,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [customDurationInput, setCustomDurationInput] = useState<number>(settings.targetDuration);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/i.test(file.name)) {
        onVideoSelected(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onVideoSelected(e.target.files[0]);
    }
  };

  const durationPresets = [
    { label: '30s', value: 30, desc: 'Shorts & Reels' },
    { label: '50s', value: 50, desc: 'TikTok Pacing' },
    { label: '60s', value: 60, desc: 'Complete Story' },
    { label: 'Custom', value: -1, desc: 'User Defined' },
  ];

  const aspectRatios: { id: AspectRatioType; label: string; desc: string; icon: string }[] = [
    { id: '9:16', label: '9:16 Vertical', desc: 'TikTok · Shorts · Reels', icon: '📱' },
    { id: '1:1', label: '1:1 Square', desc: 'Instagram · X · LinkedIn', icon: '⏹️' },
    { id: '16:9', label: '16:9 Wide', desc: 'YouTube · Standard Player', icon: '🖥️' },
  ];

  const subtitleThemes: { id: SubtitleThemeType; label: string; previewClass: string }[] = [
    { id: 'yellow_highlight', label: 'TikTok Yellow', previewClass: 'text-amber-400 font-extrabold' },
    { id: 'cyan_electric', label: 'Cyber Cyan', previewClass: 'text-cyan-400 font-extrabold' },
    { id: 'emerald_glow', label: 'Emerald Glow', previewClass: 'text-emerald-400 font-extrabold' },
    { id: 'flame_orange', label: 'Flame Punch', previewClass: 'text-orange-400 font-extrabold' },
  ];

  return (
    <div className="w-full space-y-8">
      {/* Hero Intro */}
      <div className="text-center max-w-3xl mx-auto space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-indigo-300 bg-indigo-950/60 border border-indigo-800/60 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Automated AI Viral Moment Detection & Video Reframing</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white text-balance leading-tight">
          Turn long videos into <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-amber-300">viral shorts</span> in seconds.
        </h1>
        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto text-balance leading-relaxed">
          Upload any podcast, interview, keynote, or webinar. Gemini AI discovers peak emotional hooks and exports ready-to-post MP4 shorts with dynamic captions.
        </p>
      </div>

      {/* Main Upload Dropzone Container */}
      <div className="max-w-4xl mx-auto bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-0" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none -z-0" />

        <div className="relative z-10 space-y-8">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-4 ${
              isDragOver
                ? 'border-indigo-400 bg-indigo-950/40 scale-[1.01]'
                : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/50 hover:bg-slate-950/70'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv"
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-white">
                Drag and drop your long video here
              </p>
              <p className="text-sm text-slate-400">
                or <span className="text-indigo-400 hover:text-indigo-300 underline font-medium">browse local files</span> from your device
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 font-mono pt-2">
              <span>MP4</span>
              <span>·</span>
              <span>MOV</span>
              <span>·</span>
              <span>WebM</span>
              <span>·</span>
              <span>MKV</span>
              <span>·</span>
              <span>Recommended up to 50MB</span>
            </div>
          </div>

          {/* Quick Demo Video Picker */}
          {samples.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <PlayCircle className="w-4 h-4 text-indigo-400" />
                  Or Try With Ready-To-Test Studio Samples
                </span>
                <span className="text-xs text-slate-500">1-click instant demo</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {samples.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => onSampleSelected(sample)}
                    disabled={isUploading}
                    className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-indigo-500/40 text-left transition-all group cursor-pointer disabled:opacity-50"
                  >
                    <div className="w-24 h-16 rounded-lg bg-slate-800 overflow-hidden shrink-0 relative border border-slate-700/60">
                      <img
                        src={sample.thumbnail}
                        alt={sample.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors" />
                      <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[10px] font-mono text-slate-300 tabular-nums">
                        {sample.duration}s
                      </div>
                    </div>
                    <div className="flex flex-col justify-between h-full min-w-0">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                          {sample.title}
                        </p>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {sample.speaker}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                        <span>{sample.category}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Configuration Settings Panel */}
          <div className="pt-4 border-t border-slate-800/80 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Clipping & Formatting Controls
              </h3>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-medium text-slate-400 hover:text-indigo-300 transition-colors"
              >
                {showAdvanced ? 'Hide advanced focus' : 'Customize AI prompt'}
              </button>
            </div>

            {/* Target Duration Selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Target Clip Duration
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {durationPresets.map((preset) => {
                  const isSelected =
                    preset.value === -1
                      ? ![30, 50, 60].includes(settings.targetDuration)
                      : settings.targetDuration === preset.value;

                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        if (preset.value === -1) {
                          onSettingsChange({ ...settings, targetDuration: customDurationInput || 45 });
                        } else {
                          onSettingsChange({ ...settings, targetDuration: preset.value });
                        }
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold text-white tabular-nums">{preset.label}</div>
                      <div className="text-[11px] text-slate-400">{preset.desc}</div>
                    </button>
                  );
                })}
              </div>

              {![30, 50, 60].includes(settings.targetDuration) && (
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="range"
                    min="15"
                    max="90"
                    step="5"
                    value={settings.targetDuration}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCustomDurationInput(val);
                      onSettingsChange({ ...settings, targetDuration: val });
                    }}
                    className="flex-1 accent-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-indigo-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 tabular-nums">
                    {settings.targetDuration} seconds
                  </span>
                </div>
              )}
            </div>

            {/* Target Aspect Ratio */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Target Video Framing & Aspect Ratio
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {aspectRatios.map((ar) => {
                  const isSelected = settings.aspectRatio === ar.id;
                  return (
                    <button
                      key={ar.id}
                      type="button"
                      onClick={() => onSettingsChange({ ...settings, aspectRatio: ar.id })}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-lg">{ar.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white">{ar.label}</div>
                        <div className="text-[11px] text-slate-400 truncate">{ar.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subtitle Styling */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Subtitles className="w-3.5 h-3.5 text-indigo-400" />
                  Animated Subtitle Burn-In
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.burnSubtitles}
                    onChange={(e) => onSettingsChange({ ...settings, burnSubtitles: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 relative"></div>
                  <span className="text-xs text-slate-400 font-medium">
                    {settings.burnSubtitles ? 'Burn captions into MP4' : 'Captions disabled'}
                  </span>
                </label>
              </div>

              {settings.burnSubtitles && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {subtitleThemes.map((theme) => {
                    const isSelected = settings.subtitleTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => onSettingsChange({ ...settings, subtitleTheme: theme.id })}
                        className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800 border-indigo-500'
                            : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className={`text-xs ${theme.previewClass}`}>VIRAL HOOK</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{theme.label}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Advanced Prompt Focus */}
            {showAdvanced && (
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Custom AI Moment Focus (Optional)
                </label>
                <input
                  type="text"
                  value={settings.customPrompt || ''}
                  onChange={(e) => onSettingsChange({ ...settings, customPrompt: e.target.value })}
                  placeholder="e.g. Prioritize funny reactions, actionable career tips, or surprising statistical revelations..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
