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
  previewUrl?: string;
}

export interface VideoMetadata {
  id: string;
  name: string;
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
  size: number;
  transcriptPreview?: string;
  speaker?: string;
  category?: string;
}

export interface PrebuiltSample {
  id: string;
  title: string;
  speaker: string;
  category: string;
  duration: number;
  thumbnail: string;
  sourceFile: string;
  transcript: string;
}

export type AspectRatioType = '9:16' | '1:1' | '16:9';

export type SubtitleThemeType = 'yellow_highlight' | 'cyan_electric' | 'emerald_glow' | 'flame_orange';

export interface GenerationSettings {
  targetDuration: number;
  aspectRatio: AspectRatioType;
  burnSubtitles: boolean;
  subtitleTheme: SubtitleThemeType;
  customPrompt?: string;
}
