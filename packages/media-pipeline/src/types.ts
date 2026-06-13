export interface RenderInput {
  projectId: string;
  avatarVideoPath: string;
  audioPath: string;
  subtitleText: string;
  coverText: string;
}

export interface RenderResult {
  videoPath: string;
  coverPath: string;
  subtitlePath: string;
}

export interface MediaRenderer {
  render(input: RenderInput): Promise<RenderResult>;
}

export interface MockMediaRendererOptions {
  artifactRoot?: string;
}
