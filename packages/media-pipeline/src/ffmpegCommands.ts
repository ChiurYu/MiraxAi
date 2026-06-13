export function buildExtractAudioCommand(inputPath: string, outputPath: string): string[] {
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

export function buildVerticalComposeCommand(inputVideo: string, subtitleFile: string, outputPath: string): string[] {
  return [
    "ffmpeg",
    "-y",
    "-i",
    inputVideo,
    "-vf",
    `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,subtitles=${subtitleFile}`,
    "-c:a",
    "copy",
    outputPath,
  ];
}
