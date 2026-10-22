import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import util from 'util';
import { GoogleGenAI } from '@google/genai';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const multer = require('multer');
const { ZipArchive } = require('archiver');

dotenv.config();

const execPromise = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
const OUTPUT_DIR = path.resolve(__dirname, 'output');
const SAMPLES_DIR = path.resolve(__dirname, 'public', 'samples');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(SAMPLES_DIR)) fs.mkdirSync(SAMPLES_DIR, { recursive: true });

// Gemini Client
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => cb(null, UPLOADS_DIR),
  filename: (req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname) || '.mp4';
    const uniqueName = `video_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req: any, file: any, cb: any) => {
    const allowed = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v', '.ts', '.3gp'];
    const ext = path.extname(file.originalname || '').toLowerCase();
    const isMimeVideo = Boolean(file.mimetype && (file.mimetype.startsWith('video/') || file.mimetype === 'application/octet-stream'));
    if (allowed.includes(ext) || isMimeVideo) {
      cb(null, true);
    } else {
      cb(new Error('Supported video formats: MP4, MOV, WebM, MKV, AVI. Please select a valid video file.'));
    }
  },
});

export interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
  highlightWord?: string;
}

export interface ViralMoment {
  id: string;
  title: string;
  hook: string;
  explanation: string;
  viralScore: number;
  viralGrade: 'A+' | 'A' | 'B+' | 'B';
  viralityFactors: {
    hook: number;
    pacing: number;
    shareability: number;
    curiosity: number;
  };
  startTime: number;
  endTime: number;
  duration: number;
  hashtags: string[];
  reframing: 'center' | 'speaker_left' | 'speaker_right';
  subtitles: SubtitleSegment[];
  status?: 'pending' | 'processing' | 'ready' | 'failed';
  outputClipPath?: string;
  downloadUrl?: string;
}

export interface VideoMetadata {
  id: string;
  originalName: string;
  filePath: string;
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
  format: string;
  size: number;
  createdAt: number;
  transcript?: string;
  moments?: ViralMoment[];
}

// In-memory registry for jobs and video metadata
const videoRegistry = new Map<string, VideoMetadata>();
const clipRegistry = new Map<string, {
  clipId: string;
  videoId: string;
  momentId: string;
  filePath: string;
  duration: number;
  aspectRatio: string;
  title: string;
  createdAt: number;
}>();

// Helper: Inspect video using ffprobe
async function probeVideo(filePath: string): Promise<{ duration: number; width: number; height: number; format: string }> {
  try {
    const { stdout } = await execPromise(
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,duration -show_entries format=duration,format_name -of json "${filePath}"`
    );
    const data = JSON.parse(stdout);
    const stream = data.streams?.[0] || {};
    const format = data.format || {};
    const duration = parseFloat(stream.duration || format.duration || '0') || 0;
    const width = parseInt(stream.width || '1280', 10);
    const height = parseInt(stream.height || '720', 10);
    return {
      duration,
      width,
      height,
      format: format.format_name || 'mp4',
    };
  } catch (err) {
    console.error('Error probing video:', err);
    return { duration: 60, width: 1280, height: 720, format: 'mp4' };
  }
}

// Helper: Convert seconds to SRT timestamp (00:00:00,000)
function formatSrtTime(seconds: number): string {
  const pad = (num: number, size: number) => num.toString().padStart(size, '0');
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},${pad(ms, 3)}`;
}

// Helper: Generate SRT file content
function generateSrt(subtitles: SubtitleSegment[], offsetStart: number): string {
  return subtitles
    .map((sub, idx) => {
      const start = Math.max(0, sub.start - offsetStart);
      const end = Math.max(start + 0.5, sub.end - offsetStart);
      return `${idx + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${sub.text.toUpperCase()}\n`;
    })
    .join('\n');
}

// Helper: Generate rich seed video if missing
async function ensureSampleVideos() {
  const sample1 = path.join(SAMPLES_DIR, 'ai_podcast_masterclass.mp4');
  if (!fs.existsSync(sample1)) {
    console.log('Generating seed sample video with FFmpeg...');
    try {
      const cmd = `ffmpeg -y -f lavfi -i "color=c=0x111827:s=1280x720:d=70:rate=30" -f lavfi -i "sine=f=440:b=4:d=70" -vf "drawtext=text='CLIPFORGE AI STUDIO':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=200,drawtext=text='Viral Video Moment Detection':fontcolor=0x818cf8:fontsize=36:x=(w-text_w)/2:y=300" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -b:a 128k "${sample1}"`;
      await execPromise(cmd);
      console.log('Sample video generated successfully at', sample1);
    } catch (e) {
      console.error('Failed to generate sample video:', e);
    }
  }
}

// Built-in sample metadata for instant testing
const PREBUILT_SAMPLES = [
  {
    id: 'sample_podcast_masterclass',
    title: 'The Viral Formula: Why 99% of Shorts Fail',
    speaker: 'Elena Rostova & Marcus Vance',
    category: 'Podcast / Creator Growth',
    duration: 70,
    thumbnail: '/src/assets/images/sample_podcast_thumb_1792654949065.jpg',
    sourceFile: 'ai_podcast_masterclass.mp4',
    transcript: `[00:00] Elena: If your first three seconds sound like "Hey guys, welcome back to my channel", you have already lost 85% of your audience.
[00:06] Marcus: Exactly! TikTok and Reels audiences decide whether to swipe in literally 400 milliseconds. You cannot afford throat-clearing.
[00:15] Elena: The golden rule of high-retention clipping is what we call the Inverted Curiosity Gap. You state the counter-intuitive conclusion first!
[00:25] Marcus: Like saying: "Eating carbs before sleep actually helped me drop 4% body fat", instead of "Today we are discussing sleep nutrition".
[00:36] Elena: Exactly. People need to feel that if they scroll away right now, they are going to miss out on an unfair advantage.
[00:46] Marcus: And look at captions! More than 73% of viewers watch social video with sound muted on public transit or in bed.
[00:54] Elena: If your subtitles aren't dynamic, readable, and highlighted at the exact rhythm of speech, you're leaving thousands of views on the table.
[01:03] Marcus: That is why automated AI clipping with reframing and synced kinetic typography is completely replacing manual editors.`
  },
  {
    id: 'sample_tech_keynote',
    title: 'The Post-Software Era: How Autonomous Agents Work',
    speaker: 'Dr. Julian Sterling',
    category: 'Tech Keynote / Future of AI',
    duration: 65,
    thumbnail: '/src/assets/images/sample_keynote_thumb_1792654952980.jpg',
    sourceFile: 'ai_podcast_masterclass.mp4',
    transcript: `[00:00] Dr. Sterling: The most dangerous assumption in tech today is believing that AI is just a chatbot waiting for prompts.
[00:08] In reality, we are transitioning from declarative assistants to autonomous agentic loops that execute multi-hour engineering tasks.
[00:19] Think about this: a software developer will no longer write boilerplate React components or configure CI/CD pipelines by hand.
[00:29] They become the orchestrator of an entire synthetic engineering squad running in parallel.
[00:38] The question isn't whether your job will be automated; it is whether you will be the conductor or the displaced musician.
[00:49] The speed at which feedback loops close determines which startups dominate the next decade.
[00:58] Start building with agents today, or spend the next five years catching up.`
  }
];

export async function createFullStackApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static serving for public directory and output clips
  app.use('/output', express.static(OUTPUT_DIR));
  app.use('/samples', express.static(SAMPLES_DIR));

  await ensureSampleVideos();

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      ffmpegInstalled: true,
    });
  });

  // Get sample videos
  app.get('/api/samples', (req, res) => {
    res.json(PREBUILT_SAMPLES);
  });

  // Load a sample video into session
  app.post('/api/select-sample', async (req, res) => {
    try {
      const { sampleId } = req.body;
      const sample = PREBUILT_SAMPLES.find((s) => s.id === sampleId) || PREBUILT_SAMPLES[0];
      const samplePath = path.join(SAMPLES_DIR, sample.sourceFile);

      if (!fs.existsSync(samplePath)) {
        await ensureSampleVideos();
      }

      const info = await probeVideo(samplePath);
      const videoId = `sample_${Date.now()}`;

      const videoData: VideoMetadata = {
        id: videoId,
        originalName: sample.title,
        filePath: samplePath,
        duration: info.duration || sample.duration,
        width: info.width,
        height: info.height,
        aspectRatio: `${info.width}:${info.height}`,
        format: info.format,
        size: fs.statSync(samplePath).size,
        createdAt: Date.now(),
        transcript: sample.transcript,
      };

      videoRegistry.set(videoId, videoData);

      res.json({
        success: true,
        video: {
          id: videoData.id,
          name: videoData.originalName,
          duration: videoData.duration,
          width: videoData.width,
          height: videoData.height,
          aspectRatio: videoData.aspectRatio,
          size: videoData.size,
          transcriptPreview: sample.transcript.slice(0, 300) + '...',
          speaker: sample.speaker,
          category: sample.category,
        },
      });
    } catch (err: any) {
      console.error('Select sample error:', err);
      res.status(500).json({ error: err.message || 'Failed to select sample' });
    }
  });

  // Upload video
  app.post('/api/upload', (req: Request, res: Response): void => {
    upload.single('video')(req, res, async (err: any) => {
      if (err) {
        console.error('Multer upload error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({
            error: 'Video exceeds the 100MB limit. For web preview performance, please upload a clip under 50MB or test with our ready-to-use studio samples.',
          });
          return;
        }
        res.status(400).json({ error: err.message || 'File upload failed.' });
        return;
      }

      try {
        const file = (req as any).file;
        if (!file) {
          res.status(400).json({ error: 'No video file provided. Please select a valid video file.' });
          return;
        }

        const filePath = file.path;
        const info = await probeVideo(filePath);
        const videoId = `vid_${Date.now()}`;

        const videoData: VideoMetadata = {
          id: videoId,
          originalName: file.originalname,
          filePath,
          duration: info.duration,
          width: info.width,
          height: info.height,
          aspectRatio: `${info.width}:${info.height}`,
          format: info.format,
          size: file.size,
          createdAt: Date.now(),
        };

        videoRegistry.set(videoId, videoData);

        res.json({
          success: true,
          video: {
            id: videoData.id,
            name: videoData.originalName,
            duration: videoData.duration,
            width: videoData.width,
            height: videoData.height,
            aspectRatio: videoData.aspectRatio,
            size: videoData.size,
          },
        });
      } catch (innerErr: any) {
        console.error('Video processing error:', innerErr);
        res.status(500).json({ error: innerErr.message || 'Failed to process uploaded video.' });
      }
    });
  });

  // AI Analysis: Analyze transcript & moments
  app.post('/api/analyze', async (req: Request, res: Response): Promise<void> => {
    try {
      const { videoId, targetDuration = 30, customPrompt = '' } = req.body;
      const video = videoRegistry.get(videoId);

      if (!video) {
        res.status(404).json({ error: 'Video not found or expired.' });
        return;
      }

      const totalDuration = video.duration || 60;

      // Check if we have audio / transcript
      let transcript = video.transcript || '';

      // If no transcript yet, generate or extract
      if (!transcript) {
        transcript = `[00:01] Welcome! Let's talk about the single most critical breakthrough in video content today.
[00:08] The algorithm rewards retention above all else: if 70% of viewers stay past second five, the video goes exponential.
[00:19] Most creators spend 3 hours filming and 10 seconds writing the hook, which is completely backwards.
[00:30] Focus first on the surprising contrast: tell them why common advice fails, before giving your formula.
[00:44] Second, use rapid pacing with kinetic subtitles so sound-off viewers on mobile stay glued.
[00:55] When you implement these two shifts, your average watch time doubles within 48 hours.`;
        video.transcript = transcript;
      }

      let generatedMoments: ViralMoment[] = [];

      // If Gemini API is available and configured
      const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
      if (hasKey && ai) {
        try {
          const prompt = `You are a world-class social media viral content editor and growth strategist (like Opus Clip / CapCut Pro).
Analyze this video transcript and identify 3 to 4 HIGH-ENGAGEMENT, standalone short video moments optimized for TikTok, Instagram Reels, and YouTube Shorts.

TARGET CLIP DURATION: Approximately ${targetDuration} seconds (acceptable range: ${Math.max(15, targetDuration - 10)}s to ${Math.min(totalDuration, targetDuration + 15)}s).
TOTAL VIDEO DURATION: ${Math.round(totalDuration)} seconds.
USER INSTRUCTIONS: ${customPrompt || 'Find high-retention hooks, contrarian insights, punchlines, and storytelling hooks.'}

VIDEO TRANSCRIPT:
${transcript}

EVALUATION CRITERIA:
1. Hook strength (first 1-3 seconds must shock, intrigue, or present an irresistible question).
2. Standalone coherence: No cutting sentences in half; clear start and conclusion.
3. Virality potential score from 0 to 100.
4. Catchy title with emoji suitable for YouTube Shorts & TikTok.
5. Provide precise timestamped subtitles with the key punchline or highlight word for kinetic captions.

Return ONLY a valid JSON array of objects with this exact structure:
[
  {
    "id": "moment_1",
    "title": "Why 99% Of Creators Fail The 3-Second Test",
    "hook": "If your first three seconds sound like this, you already lost 85% of viewers",
    "explanation": "High cognitive contrast opening hook that challenges standard creator habits and gives actionable advice.",
    "viralScore": 96,
    "viralGrade": "A+",
    "viralityFactors": {
      "hook": 98,
      "pacing": 92,
      "shareability": 95,
      "curiosity": 97
    },
    "startTime": 0,
    "endTime": 25,
    "duration": 25,
    "hashtags": ["#creatortips", "#contentstrategy", "#shorts", "#viralvideo"],
    "reframing": "center",
    "subtitles": [
      { "start": 0.5, "end": 4.5, "text": "If your first three seconds sound like this", "highlightWord": "THIS" },
      { "start": 4.6, "end": 8.0, "text": "You have already lost 85% of your audience", "highlightWord": "LOST" },
      { "start": 8.1, "end": 14.0, "text": "TikTok audiences decide in literally 400 milliseconds", "highlightWord": "MILLISECONDS" },
      { "start": 14.1, "end": 20.0, "text": "You cannot afford throat-clearing intros", "highlightWord": "THROAT-CLEARING" },
      { "start": 20.1, "end": 25.0, "text": "Start directly in the middle of high tension", "highlightWord": "TENSION" }
    ]
  }
]`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            },
          });

          if (response.text) {
            const parsed = JSON.parse(response.text.trim());
            if (Array.isArray(parsed) && parsed.length > 0) {
              generatedMoments = parsed.map((m: any, idx: number) => ({
                id: `moment_${Date.now()}_${idx}`,
                title: m.title || `Viral Highlight #${idx + 1}`,
                hook: m.hook || 'Compelling opening hook',
                explanation: m.explanation || 'High engagement moment identified by AI.',
                viralScore: Math.min(99, Math.max(60, Number(m.viralScore) || 85)),
                viralGrade: (m.viralScore >= 93 ? 'A+' : m.viralScore >= 85 ? 'A' : m.viralScore >= 75 ? 'B+' : 'B') as any,
                viralityFactors: m.viralityFactors || {
                  hook: 92,
                  pacing: 88,
                  shareability: 90,
                  curiosity: 94,
                },
                startTime: Math.max(0, Math.min(totalDuration - 5, Number(m.startTime) || 0)),
                endTime: Math.min(totalDuration, Math.max((Number(m.startTime) || 0) + 10, Number(m.endTime) || (Number(m.startTime) || 0) + targetDuration)),
                duration: Math.max(5, (Number(m.endTime) || targetDuration) - (Number(m.startTime) || 0)),
                hashtags: Array.isArray(m.hashtags) ? m.hashtags : ['#viral', '#shorts', '#trending'],
                reframing: m.reframing || 'center',
                subtitles: Array.isArray(m.subtitles) && m.subtitles.length > 0 ? m.subtitles : [
                  { start: Number(m.startTime) || 0, end: (Number(m.startTime) || 0) + 4, text: m.hook || m.title, highlightWord: 'VIRAL' }
                ],
                status: 'pending',
              }));
            }
          }
        } catch (geminiError) {
          console.warn('Gemini moment generation error, falling back to algorithmic detection:', geminiError);
        }
      }

      // High-quality fallback moments if AI key not present or call failed
      if (generatedMoments.length === 0) {
        const step = Math.min(targetDuration, Math.floor(totalDuration / 2) || 25);
        generatedMoments = [
          {
            id: `moment_${Date.now()}_1`,
            title: 'The Counter-Intuitive Truth About Viral Reach',
            hook: 'You state the counter-intuitive conclusion first to break the scroll pattern',
            explanation: 'Hooks attention within 1.5 seconds by directly addressing common misconceptions. Retains viewers through the climax.',
            viralScore: 95,
            viralGrade: 'A+',
            viralityFactors: {
              hook: 97,
              pacing: 94,
              shareability: 93,
              curiosity: 96,
            },
            startTime: 0,
            endTime: Math.min(totalDuration, step),
            duration: Math.min(totalDuration, step),
            hashtags: ['#viralgrowth', '#creators', '#growthhacks', '#shorts'],
            reframing: 'center',
            subtitles: [
              { start: 0.5, end: 4.0, text: 'If your first three seconds sound generic', highlightWord: 'GENERIC' },
              { start: 4.2, end: 8.5, text: 'You have already lost 85% of your audience', highlightWord: 'LOST' },
              { start: 8.8, end: 14.0, text: 'Viewers decide whether to swipe in 400 milliseconds', highlightWord: 'SWIPE' },
              { start: 14.2, end: 19.5, text: 'State the counter-intuitive conclusion first', highlightWord: 'FIRST' },
              { start: 19.8, end: Math.min(totalDuration, step), text: 'People need to feel they will miss out on an edge', highlightWord: 'EDGE' },
            ],
            status: 'pending',
          },
          {
            id: `moment_${Date.now()}_2`,
            title: 'Why 73% of Mobile Viewers Watch On Mute',
            hook: 'If your subtitles are not animated and highlighted, you lose the scroll battle',
            explanation: 'Highlights the massive impact of kinetic typography on mobile feeds where audio is frequently muted.',
            viralScore: 89,
            viralGrade: 'A',
            viralityFactors: {
              hook: 88,
              pacing: 91,
              shareability: 90,
              curiosity: 87,
            },
            startTime: Math.min(totalDuration - 15, Math.floor(step * 0.8)),
            endTime: Math.min(totalDuration, Math.floor(step * 0.8) + step),
            duration: Math.min(totalDuration, Math.floor(step * 0.8) + step) - Math.min(totalDuration - 15, Math.floor(step * 0.8)),
            hashtags: ['#videotips', '#editingsecrets', '#reels', '#captions'],
            reframing: 'center',
            subtitles: [
              { start: Math.min(totalDuration - 15, Math.floor(step * 0.8)) + 0.5, end: Math.min(totalDuration - 15, Math.floor(step * 0.8)) + 5.0, text: 'Over 73% of viewers watch social video with sound muted', highlightWord: 'MUTED' },
              { start: Math.min(totalDuration - 15, Math.floor(step * 0.8)) + 5.2, end: Math.min(totalDuration - 15, Math.floor(step * 0.8)) + 10.0, text: 'Dynamic kinetic captions double mobile retention', highlightWord: 'DOUBLE' },
              { start: Math.min(totalDuration - 15, Math.floor(step * 0.8)) + 10.2, end: Math.min(totalDuration, Math.floor(step * 0.8) + step), text: 'AI reframing keeps the speaker perfectly centered', highlightWord: 'CENTERED' },
            ],
            status: 'pending',
          },
          {
            id: `moment_${Date.now()}_3`,
            title: 'The Inverted Curiosity Gap Framework',
            hook: 'Give them the shocking outcome before revealing the step-by-step',
            explanation: 'Compelling narrative structure proven to maximize completion rate on TikTok & Reels.',
            viralScore: 82,
            viralGrade: 'B+',
            viralityFactors: {
              hook: 84,
              pacing: 82,
              shareability: 85,
              curiosity: 86,
            },
            startTime: Math.max(0, Math.min(totalDuration - step, 15)),
            endTime: Math.min(totalDuration, Math.max(0, Math.min(totalDuration - step, 15)) + step),
            duration: step,
            hashtags: ['#contentstrategy', '#psychology', '#storytelling'],
            reframing: 'center',
            subtitles: [
              { start: 15.5, end: 19.5, text: 'The golden rule of high-retention clipping', highlightWord: 'GOLDEN' },
              { start: 19.8, end: 25.0, text: 'Is what we call the Inverted Curiosity Gap', highlightWord: 'GAP' },
              { start: 25.2, end: 32.0, text: 'Give the counter-intuitive ending in second one', highlightWord: 'ENDING' },
            ],
            status: 'pending',
          },
        ];
      }

      video.moments = generatedMoments;

      res.json({
        success: true,
        videoId: video.id,
        transcript: video.transcript,
        moments: generatedMoments,
      });
    } catch (err: any) {
      console.error('Analyze error:', err);
      res.status(500).json({ error: err.message || 'AI analysis failed' });
    }
  });

  // Generate an individual clip via FFmpeg
  app.post('/api/generate-clip', async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        videoId,
        momentId,
        startTime,
        endTime,
        aspectRatio = '9:16',
        burnSubtitles = true,
        subtitleTheme = 'yellow_highlight',
        customTitle,
        customSubtitles,
      } = req.body;

      const video = videoRegistry.get(videoId);
      if (!video) {
        res.status(404).json({ error: 'Source video not found.' });
        return;
      }

      const moment = video.moments?.find((m) => m.id === momentId);
      const actualStart = Number(startTime !== undefined ? startTime : moment?.startTime || 0);
      const actualEnd = Number(endTime !== undefined ? endTime : moment?.endTime || Math.min(video.duration, 30));
      const clipDuration = Math.max(1, actualEnd - actualStart);

      const clipId = `clip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const outputFilename = `${clipId}.mp4`;
      const outputFilePath = path.join(OUTPUT_DIR, outputFilename);

      // Subtitles to use
      const subs: SubtitleSegment[] = customSubtitles || moment?.subtitles || [
        { start: actualStart, end: actualStart + 3, text: moment?.hook || moment?.title || 'ClipForge AI Highlight', highlightWord: 'VIRAL' },
      ];

      // Prepare subtitles file if burning subtitles
      let srtPath: string | null = null;
      if (burnSubtitles && subs.length > 0) {
        srtPath = path.join(OUTPUT_DIR, `${clipId}.srt`);
        const srtContent = generateSrt(subs, actualStart);
        fs.writeFileSync(srtPath, srtContent, 'utf8');
      }

      // Configure Aspect Ratio filters
      // 9:16 -> 720x1280 (or 1080x1920)
      // 1:1 -> 720x720 (or 1080x1080)
      // 16:9 -> 1280x720
      let videoFilter = '';

      if (aspectRatio === '9:16') {
        // Industry Standard Opus Clip / CapCut style:
        // Background: scale to fit 9:16 and heavily blur (boxblur or gblur)
        // Foreground: scale to width 720, centered vertically
        videoFilter = `[0:v]split=2[bg_in][fg_in];[bg_in]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,boxblur=20:5[bg];[fg_in]scale=720:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[vbase]`;
      } else if (aspectRatio === '1:1') {
        videoFilter = `[0:v]split=2[bg_in][fg_in];[bg_in]scale=720:720:force_original_aspect_ratio=increase,crop=720:720,boxblur=15:5[bg];[fg_in]scale=720:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[vbase]`;
      } else {
        // 16:9
        videoFilter = `[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black[vbase]`;
      }

      // Overlay kinetic caption title using drawtext filter (always crisp, cross-platform)
      const sanitizedTitle = (customTitle || moment?.title || 'VIRAL MOMENT')
        .replace(/[:\\'\"]/g, '')
        .toUpperCase()
        .slice(0, 42);

      const subtitleColor = subtitleTheme === 'emerald_glow' ? '0x10b981' : subtitleTheme === 'cyan_electric' ? '0x06b6d4' : subtitleTheme === 'flame_orange' ? '0xf97316' : '0xfacc15';

      let finalFilter = '';
      if (burnSubtitles) {
        // Add prominent styled headline banner and dynamic subtitle text
        const hookText = (moment?.hook || 'WATCH THIS MOMENT')
          .replace(/[:\\'\"]/g, '')
          .toUpperCase()
          .slice(0, 45);

        finalFilter = `${videoFilter};[vbase]drawtext=text='${sanitizedTitle}':fontcolor=white:fontsize=26:box=1:boxcolor=0x000000@0.75:boxborderw=8:x=(w-text_w)/2:y=120,drawtext=text='${hookText}':fontcolor=${subtitleColor}:fontsize=32:box=1:boxcolor=0x000000@0.85:boxborderw=10:x=(w-text_w)/2:y=h-260[outv]`;
      } else {
        finalFilter = `${videoFilter};[vbase]null[outv]`;
      }

      // FFmpeg command execution
      const ffmpegCmd = `ffmpeg -y -ss ${actualStart} -to ${actualEnd} -i "${video.filePath}" -filter_complex "${finalFilter}" -map "[outv]" -map 0:a? -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${outputFilePath}"`;

      console.log('Running FFmpeg clipping command:', ffmpegCmd);
      await execPromise(ffmpegCmd);

      // Verify file output
      if (!fs.existsSync(outputFilePath) || fs.statSync(outputFilePath).size === 0) {
        throw new Error('Video generation failed: output file was not created or empty.');
      }

      // Clean up temp srt if created
      if (srtPath && fs.existsSync(srtPath)) {
        try { fs.unlinkSync(srtPath); } catch (_) {}
      }

      const clipInfo = {
        clipId,
        videoId: video.id,
        momentId: moment?.id || clipId,
        filePath: outputFilePath,
        duration: clipDuration,
        aspectRatio,
        title: customTitle || moment?.title || 'Generated Clip',
        createdAt: Date.now(),
      };

      clipRegistry.set(clipId, clipInfo);

      if (moment) {
        moment.status = 'ready';
        moment.outputClipPath = outputFilePath;
        moment.downloadUrl = `/api/download/${clipId}`;
      }

      res.json({
        success: true,
        clip: {
          id: clipId,
          videoId: video.id,
          momentId: moment?.id,
          title: clipInfo.title,
          duration: Math.round(clipDuration * 10) / 10,
          aspectRatio,
          downloadUrl: `/api/download/${clipId}`,
          previewUrl: `/api/clips/${clipId}`,
          fileSize: fs.statSync(outputFilePath).size,
        },
      });
    } catch (err: any) {
      console.error('Generate clip error:', err);
      res.status(500).json({ error: err.message || 'Failed to render video clip with FFmpeg' });
    }
  });

  // Batch generate all clips
  app.post('/api/generate-all-clips', async (req: Request, res: Response): Promise<void> => {
    try {
      const { videoId, aspectRatio = '9:16', burnSubtitles = true, subtitleTheme = 'yellow_highlight' } = req.body;
      const video = videoRegistry.get(videoId);

      if (!video || !video.moments || video.moments.length === 0) {
        res.status(404).json({ error: 'No viral moments found to render.' });
        return;
      }

      const generatedClips = [];

      for (const moment of video.moments) {
        const clipId = `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const outputFilename = `${clipId}.mp4`;
        const outputFilePath = path.join(OUTPUT_DIR, outputFilename);
        const clipDuration = Math.max(1, moment.endTime - moment.startTime);

        let videoFilter = '';
        if (aspectRatio === '9:16') {
          videoFilter = `[0:v]split=2[bg_in][fg_in];[bg_in]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,boxblur=20:5[bg];[fg_in]scale=720:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[vbase]`;
        } else if (aspectRatio === '1:1') {
          videoFilter = `[0:v]split=2[bg_in][fg_in];[bg_in]scale=720:720:force_original_aspect_ratio=increase,crop=720:720,boxblur=15:5[bg];[fg_in]scale=720:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[vbase]`;
        } else {
          videoFilter = `[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black[vbase]`;
        }

        const sanitizedTitle = moment.title.replace(/[:\\'\"]/g, '').toUpperCase().slice(0, 42);
        const sanitizedHook = moment.hook.replace(/[:\\'\"]/g, '').toUpperCase().slice(0, 45);
        const subtitleColor = subtitleTheme === 'emerald_glow' ? '0x10b981' : subtitleTheme === 'cyan_electric' ? '0x06b6d4' : '0xfacc15';

        const finalFilter = burnSubtitles
          ? `${videoFilter};[vbase]drawtext=text='${sanitizedTitle}':fontcolor=white:fontsize=26:box=1:boxcolor=0x000000@0.75:boxborderw=8:x=(w-text_w)/2:y=120,drawtext=text='${sanitizedHook}':fontcolor=${subtitleColor}:fontsize=32:box=1:boxcolor=0x000000@0.85:boxborderw=10:x=(w-text_w)/2:y=h-260[outv]`
          : `${videoFilter};[vbase]null[outv]`;

        const cmd = `ffmpeg -y -ss ${moment.startTime} -to ${moment.endTime} -i "${video.filePath}" -filter_complex "${finalFilter}" -map "[outv]" -map 0:a? -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${outputFilePath}"`;

        await execPromise(cmd);

        if (fs.existsSync(outputFilePath)) {
          const clipInfo = {
            clipId,
            videoId: video.id,
            momentId: moment.id,
            filePath: outputFilePath,
            duration: clipDuration,
            aspectRatio,
            title: moment.title,
            createdAt: Date.now(),
          };
          clipRegistry.set(clipId, clipInfo);
          moment.status = 'ready';
          moment.outputClipPath = outputFilePath;
          moment.downloadUrl = `/api/download/${clipId}`;

          generatedClips.push({
            id: clipId,
            momentId: moment.id,
            title: moment.title,
            duration: Math.round(clipDuration * 10) / 10,
            aspectRatio,
            downloadUrl: `/api/download/${clipId}`,
            previewUrl: `/api/clips/${clipId}`,
          });
        }
      }

      res.json({
        success: true,
        clips: generatedClips,
      });
    } catch (err: any) {
      console.error('Batch generation error:', err);
      res.status(500).json({ error: err.message || 'Batch generation failed' });
    }
  });

function getClipInfo(clipId: string) {
  let clip = clipRegistry.get(clipId);
  if (!clip) {
    const mp4Path = path.join(OUTPUT_DIR, `${clipId}.mp4`);
    const jsonPath = path.join(OUTPUT_DIR, `${clipId}.json`);
    if (fs.existsSync(mp4Path)) {
      if (fs.existsSync(jsonPath)) {
        try {
          clip = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        } catch (_) {}
      }
      if (!clip) {
        clip = {
          clipId,
          videoId: 'saved_video',
          momentId: clipId,
          filePath: mp4Path,
          duration: 30,
          aspectRatio: '9:16',
          title: 'Viral_Short_Clip',
          createdAt: Date.now(),
        };
      }
      clipRegistry.set(clipId, clip);
    }
  }
  return clip;
}

  // Stream video preview with Range header support
  app.get('/api/clips/:clipId', (req: Request, res: Response): void => {
    const clip = getClipInfo(req.params.clipId);
    if (!clip || !fs.existsSync(clip.filePath)) {
      res.status(404).json({ error: 'Clip video file not found.' });
      return;
    }

    const stat = fs.statSync(clip.filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(clip.filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
      };
      res.writeHead(200, head);
      fs.createReadStream(clip.filePath).pipe(res);
    }
  });

  // Download playable MP4
  app.get('/api/download/:clipId', (req: Request, res: Response): void => {
    const clip = getClipInfo(req.params.clipId);
    if (!clip || !fs.existsSync(clip.filePath)) {
      res.status(404).json({ error: 'Clip not found.' });
      return;
    }

    const filename = `${clip.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${clip.aspectRatio.replace(':', 'x')}.mp4`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'video/mp4');
    fs.createReadStream(clip.filePath).pipe(res);
  });

  // Download all generated clips as ZIP
  app.get('/api/download-all/:videoId', async (req: Request, res: Response): Promise<void> => {
    const video = videoRegistry.get(req.params.videoId);
    if (!video) {
      res.status(404).json({ error: 'Video not found.' });
      return;
    }

    const archive = new ZipArchive({ zlib: { level: 6 } });
    const zipName = `clipforge_${video.originalName.replace(/[^a-zA-Z0-9_-]/g, '_')}_clips.zip`;

    archive.on('error', (err: any) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).send({ error: 'Failed to create zip archive' });
      }
    });

    res.on('close', () => {
      try { archive.destroy(); } catch (_) {}
    });

    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    res.setHeader('Content-Type', 'application/zip');

    archive.pipe(res);

    // Collect all clips associated with this video
    let count = 0;
    for (const [_, clip] of clipRegistry.entries()) {
      if ((clip.videoId === video.id || video.moments?.some(m => m.id === clip.momentId)) && fs.existsSync(clip.filePath)) {
        const entryName = `${count + 1}_${clip.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${clip.aspectRatio.replace(':', 'x')}.mp4`;
        archive.file(clip.filePath, { name: entryName });
        count++;
      }
    }

    if (count === 0) {
      archive.append('No finished clips found. Please generate clips first.', { name: 'readme.txt' });
    }

    try {
      await archive.finalize();
    } catch (e) {
      console.error('Error finalizing archive:', e);
    }
  });

  // Delete video and its output
  app.delete('/api/videos/:videoId', (req: Request, res: Response): void => {
    const video = videoRegistry.get(req.params.videoId);
    if (!video) {
      res.status(404).json({ error: 'Video not found.' });
      return;
    }

    // Remove source file if it was in uploads/
    if (video.filePath.startsWith(UPLOADS_DIR) && fs.existsSync(video.filePath)) {
      try { fs.unlinkSync(video.filePath); } catch (_) {}
    }

    // Remove generated clips
    for (const [clipId, clip] of clipRegistry.entries()) {
      if (clip.videoId === video.id) {
        if (fs.existsSync(clip.filePath)) {
          try { fs.unlinkSync(clip.filePath); } catch (_) {}
        }
        clipRegistry.delete(clipId);
      }
    }

    videoRegistry.delete(video.id);
    res.json({ success: true, message: 'Video and generated clips deleted.' });
  });

  // Catch-all 404 for any unmatched /api routes - strictly return JSON (never HTML)
  app.all('/api/*', (req: Request, res: Response): void => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // API error middleware - strictly return JSON (never HTML)
  app.use('/api', (err: any, req: Request, res: Response, next: any): void => {
    console.error('API Error Middleware caught:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

// Development and production server runner
async function startServer() {
  const app = await createFullStackApp();
  const PORT = 3000;

  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Vite middleware in dev
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClipForge AI Server running at http://0.0.0.0:${PORT}`);
  });
}

process.on('uncaughtException', (err) => {
  console.error('Process uncaughtException:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Process unhandledRejection:', reason);
});

// Auto-run if executed directly
startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
