import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  Download,
  Edit3,
  RefreshCw,
  Sparkles,
  Share2,
  Check,
  TrendingUp,
  Clock,
  Eye,
  CheckCircle,
} from 'lucide-react';
import { ViralMoment, AspectRatioType } from '../types';

interface ClipCardProps {
  moment: ViralMoment;
  aspectRatio: AspectRatioType;
  onEdit: (moment: ViralMoment) => void;
  onRegenerate: (moment: ViralMoment) => void;
  isGenerating?: boolean;
}

export const ClipCard: React.FC<ClipCardProps> = ({
  moment,
  aspectRatio,
  onEdit,
  onRegenerate,
  isGenerating = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showFactorDetails, setShowFactorDetails] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch((e) => console.log('Playback error:', e));
        setIsPlaying(true);
      }
    }
  };

  const handleCopyTags = () => {
    if (moment.hashtags && moment.hashtags.length > 0) {
      navigator.clipboard.writeText(moment.hashtags.join(' '));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Grade color
  const getScoreColor = (score: number) => {
    if (score >= 92) return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40';
    if (score >= 85) return 'text-indigo-400 bg-indigo-950/60 border-indigo-500/40';
    if (score >= 75) return 'text-amber-400 bg-amber-950/60 border-amber-500/40';
    return 'text-slate-400 bg-slate-900 border-slate-700';
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700/80 transition-all flex flex-col justify-between">
      <div>
        {/* Top Video Preview Player */}
        <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden group">
          {moment.downloadUrl ? (
            <video
              ref={videoRef}
              src={moment.downloadUrl}
              onEnded={() => setIsPlaying(false)}
              playsInline
              className={`h-full w-full object-contain ${
                aspectRatio === '9:16' ? 'max-w-[56.25%]' : 'max-w-full'
              }`}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-2 text-slate-500">
              <Clock className="w-8 h-8 text-slate-600 animate-pulse" />
              <p className="text-xs font-medium">Ready for rendering</p>
              <button
                onClick={() => onRegenerate(moment)}
                disabled={isGenerating}
                className="mt-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
              >
                {isGenerating ? 'Rendering MP4...' : 'Render Preview'}
              </button>
            </div>
          )}

          {/* Video Play/Pause Overlay */}
          {moment.downloadUrl && (
            <div
              onClick={togglePlay}
              className={`absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer transition-opacity ${
                isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </div>
            </div>
          )}

          {/* Score Badge */}
          <div className="absolute top-3 left-3 z-10">
            <div
              onClick={() => setShowFactorDetails(!showFactorDetails)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold font-mono cursor-pointer backdrop-blur-md shadow-md ${getScoreColor(
                moment.viralScore
              )}`}
              title="Click to view viral score breakdown"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="tabular-nums">{moment.viralScore}/100</span>
              <span className="text-[10px] opacity-80 uppercase">({moment.viralGrade})</span>
            </div>
          </div>

          {/* Duration Badge */}
          <div className="absolute bottom-3 right-3 z-10 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[11px] font-mono text-slate-300 tabular-nums">
            {formatTime(moment.startTime)} – {formatTime(moment.endTime)} ({Math.round(moment.duration)}s)
          </div>
        </div>

        {/* Viral Factors Popover/Breakdown */}
        {showFactorDetails && (
          <div className="p-3 bg-slate-950 border-b border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
              <span>Viral Factor Breakdown</span>
              <button
                onClick={() => setShowFactorDetails(false)}
                className="text-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <div className="flex justify-between text-slate-400">
                  <span>Hook Power</span>
                  <span className="font-mono text-indigo-300 tabular-nums">{moment.viralityFactors?.hook}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                  <div
                    className="bg-indigo-500 h-full rounded-full"
                    style={{ width: `${moment.viralityFactors?.hook || 90}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-400">
                  <span>Pacing</span>
                  <span className="font-mono text-emerald-300 tabular-nums">{moment.viralityFactors?.pacing}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${moment.viralityFactors?.pacing || 88}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-400">
                  <span>Shareability</span>
                  <span className="font-mono text-violet-300 tabular-nums">{moment.viralityFactors?.shareability}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                  <div
                    className="bg-violet-500 h-full rounded-full"
                    style={{ width: `${moment.viralityFactors?.shareability || 92}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-slate-400">
                  <span>Curiosity Gap</span>
                  <span className="font-mono text-amber-300 tabular-nums">{moment.viralityFactors?.curiosity}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-0.5">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{ width: `${moment.viralityFactors?.curiosity || 95}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card Content Details */}
        <div className="p-5 space-y-4">
          {/* Title & Hook */}
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug">
              {moment.title}
            </h4>
            <p className="text-xs text-indigo-300 italic line-clamp-2 bg-indigo-950/30 p-2 rounded-lg border border-indigo-900/40">
              "{moment.hook}"
            </p>
          </div>

          {/* AI Selection Explanation */}
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {moment.explanation}
          </p>

          {/* Hashtags */}
          {moment.hashtags && moment.hashtags.length > 0 && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span className="truncate max-w-[240px]">
                {moment.hashtags.join(' ')}
              </span>
              <button
                onClick={handleCopyTags}
                className="text-slate-400 hover:text-white flex items-center gap-1 shrink-0 ml-2"
                title="Copy hashtags"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span className="text-[10px]">{isCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onEdit(moment)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700/60 transition-colors cursor-pointer"
            title="Edit timestamps, subtitles, framing"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-400" />
            Edit
          </button>
          <button
            onClick={() => onRegenerate(moment)}
            disabled={isGenerating}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 rounded-lg border border-slate-700/40 transition-colors cursor-pointer disabled:opacity-50"
            title="Re-render with FFmpeg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {moment.downloadUrl ? (
          <a
            href={moment.downloadUrl}
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download MP4
          </a>
        ) : (
          <button
            onClick={() => onRegenerate(moment)}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate MP4
          </button>
        )}
      </div>
    </div>
  );
};
