import React, { useState, useEffect } from 'react';
import {
  UploadSection,
} from './components/UploadSection';
import { Navbar } from './components/Navbar';
import { ProcessingOverlay } from './components/ProcessingOverlay';
import { ClipCard } from './components/ClipCard';
import { ManualEditorModal } from './components/ManualEditorModal';
import { SamplesModal } from './components/SamplesModal';
import {
  VideoMetadata,
  ViralMoment,
  GenerationSettings,
  PrebuiltSample,
  AspectRatioType,
  SubtitleSegment,
} from './types';
import {
  Sparkles,
  Download,
  Film,
  Layers,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Zap,
  Share2,
  FileText,
  Sliders,
  Play,
  ArrowRight,
} from 'lucide-react';

export default function App() {
  const [video, setVideo] = useState<VideoMetadata | null>(null);
  const [moments, setMoments] = useState<ViralMoment[]>([]);
  const [samples, setSamples] = useState<PrebuiltSample[]>([]);
  const [showSamplesModal, setShowSamplesModal] = useState<boolean>(false);
  const [editingMoment, setEditingMoment] = useState<ViralMoment | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
  const [isModalRendering, setIsModalRendering] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'top_viral'>('all');
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<GenerationSettings>({
    targetDuration: 30,
    aspectRatio: '9:16',
    burnSubtitles: true,
    subtitleTheme: 'yellow_highlight',
    customPrompt: '',
  });

  // Safe API caller helper to ensure no HTML response ever triggers a JSON parse SyntaxError
  const safeFetchJson = async <T = any>(
    url: string,
    options?: RequestInit,
    defaultErrMsg = 'Operation failed'
  ): Promise<T> => {
    let res: Response;
    try {
      res = await fetch(url, options);
    } catch (netErr: any) {
      throw new Error(`Network connection error: ${netErr.message || 'Unable to reach the video server.'}`);
    }

    const rawText = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(rawText);
    } catch (_) {
      // Body is not JSON
    }

    if (data !== null) {
      if (!res.ok) {
        throw new Error(data.error || data.message || defaultErrMsg);
      }
      return data as T;
    }

    // Handle non-JSON responses gracefully (e.g., proxy HTML 413, 502, 504)
    if (res.status === 413 || rawText.includes('Too Large') || rawText.includes('413')) {
      throw new Error(
        'Video file exceeds the upload limit for this web sandbox (max 50MB). Please select a shorter video clip, or use our ready-to-test studio samples below!'
      );
    }

    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new Error('Video processing gateway timeout. Please try again or choose a shorter video segment.');
    }

    if (rawText.includes('<!DOCTYPE') || rawText.includes('<html') || rawText.includes('<head')) {
      throw new Error('The video server is busy or initializing. Please retry in a few seconds, or try our ready-to-test studio samples below.');
    }

    if (!res.ok) {
      throw new Error(`${defaultErrMsg} (Server returned status ${res.status})`);
    }

    throw new Error('Video server response could not be read. Please try again.');
  };

  // Fetch samples on initial load
  useEffect(() => {
    safeFetchJson<PrebuiltSample[]>('/api/samples', undefined, 'Failed to load sample videos')
      .then((data) => {
        if (Array.isArray(data)) setSamples(data);
      })
      .catch((err) => console.error('Failed to load sample videos:', err));
  }, []);

  // Handle local video upload
  const handleVideoUpload = async (file: File) => {
    setError(null);

    // Client-side validation: check file size (50MB recommended limit for web sandbox)
    if (file.size > 50 * 1024 * 1024) {
      setError(
        `File "${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)}MB. To prevent browser upload timeouts in this web preview, please select a clip under 50MB or test with our ready-to-use studio samples!`
      );
      return;
    }

    setIsUploading(true);
    setIsProcessing(true);
    setProcessingStep(0);
    setProcessingMessage(`Uploading and probing ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append('video', file);

      const uploadData = await safeFetchJson<{ success: boolean; video: VideoMetadata }>(
        '/api/upload',
        { method: 'POST', body: formData },
        'Video upload failed'
      );

      setVideo(uploadData.video);

      // Next step: analyze
      await runAnalysis(uploadData.video.id);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to process uploaded video.');
      setIsProcessing(false);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle prebuilt sample selection
  const handleSelectSample = async (sample: PrebuiltSample) => {
    setError(null);
    setIsProcessing(true);
    setProcessingStep(0);
    setProcessingMessage(`Loading sample: ${sample.title}...`);

    try {
      const data = await safeFetchJson<{ success: boolean; video: VideoMetadata }>(
        '/api/select-sample',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sampleId: sample.id }),
        },
        'Failed to load sample video'
      );

      setVideo(data.video);

      // Run analysis
      await runAnalysis(data.video.id);
    } catch (err: any) {
      console.error('Select sample error:', err);
      setError(err.message || 'Failed to load sample video.');
      setIsProcessing(false);
    }
  };

  // Run AI Moment Analysis
  const runAnalysis = async (videoId: string) => {
    setProcessingStep(1);
    setProcessingMessage('Extracting audio & generating timestamped transcript...');
    await new Promise((r) => setTimeout(r, 600));

    setProcessingStep(2);
    setProcessingMessage('Gemini AI analyzing retention hooks & virality ranking...');

    try {
      const analyzeData = await safeFetchJson<{ success: boolean; moments: ViralMoment[] }>(
        '/api/analyze',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            targetDuration: settings.targetDuration,
            customPrompt: settings.customPrompt,
          }),
        },
        'AI moment analysis failed'
      );

      const loadedMoments: ViralMoment[] = analyzeData.moments || [];
      setMoments(loadedMoments);

      setProcessingStep(3);
      setProcessingMessage('Synthesizing initial viral clip preview...');

      // Auto-render the highest viral score clip first so user has immediate preview
      if (loadedMoments.length > 0) {
        const topMoment = loadedMoments[0];
        try {
          const genData = await safeFetchJson<{ success: boolean; clip: any }>(
            '/api/generate-clip',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                videoId,
                momentId: topMoment.id,
                startTime: topMoment.startTime,
                endTime: topMoment.endTime,
                aspectRatio: settings.aspectRatio,
                burnSubtitles: settings.burnSubtitles,
                subtitleTheme: settings.subtitleTheme,
                customTitle: topMoment.title,
              }),
            },
            'Initial preview render failed'
          );

          if (genData.clip) {
            topMoment.status = 'ready';
            topMoment.downloadUrl = genData.clip.downloadUrl;
            topMoment.previewUrl = genData.clip.previewUrl;
            setMoments([...loadedMoments]);
          }
        } catch (genErr) {
          console.warn('Initial clip generation notice:', genErr);
        }
      }
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'AI moment analysis failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render a specific clip
  const handleGenerateClip = async (moment: ViralMoment) => {
    if (!video) return;
    setError(null);
    moment.status = 'processing';
    setMoments([...moments]);

    try {
      const data = await safeFetchJson<{ success: boolean; clip: any }>(
        '/api/generate-clip',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: video.id,
            momentId: moment.id,
            startTime: moment.startTime,
            endTime: moment.endTime,
            aspectRatio: settings.aspectRatio,
            burnSubtitles: settings.burnSubtitles,
            subtitleTheme: settings.subtitleTheme,
            customTitle: moment.title,
            customSubtitles: moment.subtitles,
          }),
        },
        'Failed to render clip'
      );

      moment.status = 'ready';
      moment.downloadUrl = data.clip.downloadUrl;
      moment.previewUrl = data.clip.previewUrl;
      setMoments([...moments]);
    } catch (err: any) {
      console.error('Generate clip error:', err);
      moment.status = 'failed';
      setMoments([...moments]);
      setError(err.message || 'Video rendering failed.');
    }
  };

  // Render all clips
  const handleGenerateAll = async () => {
    if (!video || moments.length === 0) return;
    setIsBatchGenerating(true);
    setError(null);

    try {
      const data = await safeFetchJson<{ success: boolean; clips: any[] }>(
        '/api/generate-all-clips',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: video.id,
            aspectRatio: settings.aspectRatio,
            burnSubtitles: settings.burnSubtitles,
            subtitleTheme: settings.subtitleTheme,
          }),
        },
        'Batch video generation failed'
      );

      const updatedClips = data.clips || [];

      setMoments((prev) =>
        prev.map((m) => {
          const match = updatedClips.find((c: any) => c.momentId === m.id);
          if (match) {
            return {
              ...m,
              status: 'ready',
              downloadUrl: match.downloadUrl,
              previewUrl: match.previewUrl,
            };
          }
          return m;
        })
      );
    } catch (err: any) {
      console.error('Batch error:', err);
      setError(err.message || 'Batch video generation failed.');
    } finally {
      setIsBatchGenerating(false);
    }
  };

  // Save manual edit and re-render
  const handleSaveManualEdit = async (updated: {
    momentId: string;
    startTime: number;
    endTime: number;
    aspectRatio: AspectRatioType;
    burnSubtitles: boolean;
    subtitleTheme: any;
    customTitle: string;
    customSubtitles: SubtitleSegment[];
  }) => {
    if (!video) return;
    setIsModalRendering(true);

    try {
      const data = await safeFetchJson<{ success: boolean; clip: any }>(
        '/api/generate-clip',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: video.id,
            momentId: updated.momentId,
            startTime: updated.startTime,
            endTime: updated.endTime,
            aspectRatio: updated.aspectRatio,
            burnSubtitles: updated.burnSubtitles,
            subtitleTheme: updated.subtitleTheme,
            customTitle: updated.customTitle,
            customSubtitles: updated.customSubtitles,
          }),
        },
        'Failed to re-render clip'
      );

      setMoments((prev) =>
        prev.map((m) => {
          if (m.id === updated.momentId) {
            return {
              ...m,
              title: updated.customTitle,
              startTime: updated.startTime,
              endTime: updated.endTime,
              duration: updated.endTime - updated.startTime,
              subtitles: updated.customSubtitles,
              status: 'ready',
              downloadUrl: data.clip.downloadUrl,
              previewUrl: data.clip.previewUrl,
            };
          }
          return m;
        })
      );

      setEditingMoment(null);
    } catch (err: any) {
      console.error('Manual edit error:', err);
      setError(err.message || 'Failed to render clip.');
    } finally {
      setIsModalRendering(false);
    }
  };

  // Reset to upload screen
  const handleReset = () => {
    if (video) {
      fetch(`/api/videos/${video.id}`, { method: 'DELETE' }).catch(() => {});
    }
    setVideo(null);
    setMoments([]);
    setError(null);
  };

  const filteredMoments =
    activeFilter === 'top_viral'
      ? moments.filter((m) => m.viralScore >= 90)
      : moments;

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <Navbar
        onOpenUpload={() => handleReset()}
        onOpenSamples={() => setShowSamplesModal(true)}
        hasActiveVideo={Boolean(video)}
        onReset={handleReset}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error Banner */}
        {error && (
          <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-xl flex items-center justify-between text-xs text-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-white ml-4 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* View Mode: Upload / Configuration vs Results Dashboard */}
        {!video ? (
          <UploadSection
            onVideoSelected={handleVideoUpload}
            onSampleSelected={handleSelectSample}
            samples={samples}
            settings={settings}
            onSettingsChange={setSettings}
            isUploading={isUploading}
          />
        ) : (
          /* Results Dashboard */
          <div className="space-y-8">
            {/* Top Video Header Stats Bar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Film className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Source Video</span>
                  <span>·</span>
                  <span className="font-mono tabular-nums">{Math.round(video.duration)}s</span>
                  <span>·</span>
                  <span className="font-mono tabular-nums">{video.width}×{video.height}</span>
                  <span>·</span>
                  <span>{(video.size / (1024 * 1024)).toFixed(1)} MB</span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight truncate">
                  {video.name}
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  onClick={handleGenerateAll}
                  disabled={isBatchGenerating}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <Zap className={`w-3.5 h-3.5 ${isBatchGenerating ? 'animate-spin' : ''}`} />
                  {isBatchGenerating ? 'Rendering All Clips...' : 'Batch Render All (1-Click)'}
                </button>

                <a
                  href={`/api/download-all/${video.id}`}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-300" />
                  Download ZIP
                </a>

                <button
                  onClick={handleReset}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-lg border border-slate-800 transition-colors"
                  title="Remove video and start over"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dashboard Sub-header / Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Generated Viral Moments
                </h3>
                <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/70 border border-indigo-900 px-2 py-0.5 rounded-full tabular-nums">
                  {moments.length} clips discovered
                </span>
              </div>

              {/* Segmented Filter Control */}
              <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Clips ({moments.length})
                </button>
                <button
                  onClick={() => setActiveFilter('top_viral')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeFilter === 'top_viral'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Top Viral A+ ({moments.filter((m) => m.viralScore >= 90).length})
                </button>
              </div>
            </div>

            {/* Clips Grid */}
            {filteredMoments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMoments.map((moment) => (
                  <ClipCard
                    key={moment.id}
                    moment={moment}
                    aspectRatio={settings.aspectRatio}
                    onEdit={(m) => setEditingMoment(m)}
                    onRegenerate={(m) => handleGenerateClip(m)}
                    isGenerating={moment.status === 'processing'}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl p-8 space-y-3">
                <Film className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-base font-bold text-white">No clips match this filter</h4>
                <p className="text-xs text-slate-400">Switch filter back to "All Clips" to see every generated moment.</p>
                <button
                  onClick={() => setActiveFilter('all')}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg"
                >
                  Show All Clips
                </button>
              </div>
            )}

            {/* Video Transcript Viewer */}
            {video.transcriptPreview && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    AI Speech Transcript Preview
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">Timestamped Dialogue</span>
                </div>
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 max-h-48 overflow-y-auto text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                  {video.transcriptPreview}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feature Highlights Section */}
        <section id="features" className="pt-12 border-t border-slate-800/80 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Enterprise AI Video Clipping Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Automate the entire short-form content workflow from long-form raw footage to ready-to-publish MP4 files.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                01
              </div>
              <h4 className="text-base font-semibold text-white">Inverted Curiosity Gap</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gemini identifies high-cognitive-contrast moments where speakers present counter-intuitive insights or shocking takeaways in the first 3 seconds.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold">
                02
              </div>
              <h4 className="text-base font-semibold text-white">Opus-Style 9:16 Reframing</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Dual-layer FFmpeg filter chain stacks a Gaussian-blurred backdrop behind your main video track, avoiding letterboxing and keeping mobile viewers immersed.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                03
              </div>
              <h4 className="text-base font-semibold text-white">Kinetic Subtitle Burn-In</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                73% of viewers browse social feeds on mute. ClipForge burns bold dynamic captions with punchline word highlights directly into the exported MP4.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/70 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 ClipForge AI Studio. Automated viral video clipping & shorts generator.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>H.264 / AAC High-Profile MP4</span>
            <span>·</span>
            <span>Gemini 3.8 Flash Analysis</span>
            <span>·</span>
            <span>FFmpeg 4.4 Engine</span>
          </div>
        </div>
      </footer>

      {/* Processing Progress Modal */}
      {isProcessing && (
        <ProcessingOverlay
          currentStep={processingStep}
          stepMessage={processingMessage}
        />
      )}

      {/* Manual Clip Editor Modal */}
      {editingMoment && (
        <ManualEditorModal
          moment={editingMoment}
          videoDuration={video?.duration || 60}
          onClose={() => setEditingMoment(null)}
          onSaveAndRender={handleSaveManualEdit}
          isRendering={isModalRendering}
        />
      )}

      {/* Sample Videos Drawer/Modal */}
      {showSamplesModal && (
        <SamplesModal
          samples={samples}
          onSelect={handleSelectSample}
          onClose={() => setShowSamplesModal(false)}
        />
      )}
    </div>
  );
}
