export interface TranscribeInput {
  sourceVideoPath: string;
  language?: string;
}

export interface TranscriptResult {
  text: string;
  segments: TranscriptSegment[];
}

export interface TranscriptSegment {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface RewriteScriptInput {
  transcript: string;
  productName: string;
  sellingPoints: string[];
}

export interface RewriteScriptResult {
  script: string;
  titleSuggestions: string[];
  coverTextSuggestions: string[];
}

export interface CloneVoiceInput {
  voiceSamplePath: string;
  projectId: string;
}

export interface CloneVoiceResult {
  voiceId: string;
  samplePath: string;
}

export interface SynthesizeSpeechInput {
  voiceId: string;
  script: string;
  projectId: string;
}

export interface SynthesizeSpeechResult {
  audioPath: string;
  durationSeconds: number;
}

export interface GenerateAvatarVideoInput {
  audioPath: string;
  avatarId: string;
  projectId: string;
}

export interface GenerateAvatarVideoResult {
  videoPath: string;
  durationSeconds: number;
}

export interface AiProvider {
  transcribe(input: TranscribeInput): Promise<TranscriptResult>;
  rewriteScript(input: RewriteScriptInput): Promise<RewriteScriptResult>;
  cloneVoice(input: CloneVoiceInput): Promise<CloneVoiceResult>;
  synthesizeSpeech(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult>;
  generateAvatarVideo(input: GenerateAvatarVideoInput): Promise<GenerateAvatarVideoResult>;
}

export interface MockAiProviderOptions {
  artifactRoot?: string;
}

export interface OpenAiCompatibleProviderOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
}
