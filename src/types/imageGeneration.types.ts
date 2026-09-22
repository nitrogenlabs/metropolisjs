export interface ImageGenerationInput {
  aspectRatio?: string;
  batchSize?: number;
  enhancePrompt?: boolean;
  imageUrls?: string[];
  model?: string;
  presetId?: string;
  prompt: string;
  provider: 'gemini' | 'higgsfield' | 'openai';
  quality?: string;
  resolution?: string;
  seed?: number;
  size?: string;
  styleId?: string;
}

export interface ImageGenerationResult {
  cancelUrl?: string;
  imageBase64?: string;
  mimeType?: 'image/jpeg' | 'image/png';
  provider: 'gemini' | 'higgsfield' | 'openai';
  requestId: string;
  status: string;
  statusUrl?: string;
}
