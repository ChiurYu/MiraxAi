import { MediaRendererError } from "./artifactPaths.js";

/**
 * 构建从视频中提取音频的 FFmpeg 命令。
 *
 * 输入/输出路径为空时抛出 `MediaRendererError`，避免生成无法执行的命令。
 * 真实调用阶段仍由外部调度器负责，本函数只负责命令组装。
 */
export function buildExtractAudioCommand(inputPath: string, outputPath: string): string[] {
  if (!inputPath.trim()) {
    throw new MediaRendererError("missing-input", "音频提取输入路径不能为空", "transcribe");
  }

  if (!outputPath.trim()) {
    throw new MediaRendererError("missing-output", "音频提取输出路径不能为空", "transcribe");
  }

  return [
    "ffmpeg",
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-acodec",
    "pcm_s16le",
    "-ar",
    "16000",
    "-ac",
    "1",
    outputPath,
  ];
}

/**
 * 构建竖屏视频合成（含字幕烧录）的 FFmpeg 命令。
 *
 * 真实调用阶段仍由外部调度器负责，本函数只负责命令组装。
 */
export function buildVerticalComposeCommand(inputVideo: string, inputAudio: string, subtitleFile: string, outputPath: string): string[] {
  if (!inputVideo.trim()) {
    throw new MediaRendererError("missing-input", "视频合成输入视频不能为空", "compose");
  }

  if (!inputAudio.trim()) {
    throw new MediaRendererError("missing-input", "视频合成输入音频不能为空", "compose");
  }

  if (!subtitleFile.trim()) {
    throw new MediaRendererError("missing-input", "视频合成字幕文件不能为空", "compose");
  }

  if (!outputPath.trim()) {
    throw new MediaRendererError("missing-output", "视频合成输出路径不能为空", "compose");
  }

  return [
    "ffmpeg",
    "-y",
    "-i",
    inputVideo,
    "-i",
    inputAudio,
    "-vf",
    `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,subtitles=${subtitleFile}`,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "libx264",
    "-c:a",
    "aac",
    "-shortest",
    outputPath,
  ];
}

export function buildCoverFrameCommand(inputVideo: string, outputPath: string): string[] {
  if (!inputVideo.trim()) {
    throw new MediaRendererError("missing-input", "封面抽帧输入视频不能为空", "compose");
  }

  if (!outputPath.trim()) {
    throw new MediaRendererError("missing-output", "封面抽帧输出路径不能为空", "compose");
  }

  return ["ffmpeg", "-y", "-i", inputVideo, "-frames:v", "1", outputPath];
}
