import {describe, expect, it} from 'vitest';

import {parseVideo, validateVideoInput, VideoValidationError} from './videoAdapter.js';

describe('videoAdapter', () => {
  it('validates and parses video input', () => {
    const video = validateVideoInput({
      _key: 'video-1',
      base64: 'base64',
      description: 'Description',
      duration: 10,
      externalId: 'external',
      externalUrl: 'https://example.com/external',
      fileName: 'video.mp4',
      fileSize: 100,
      fileType: 'video/mp4',
      format: 'mp4',
      height: 720,
      hlsUrl: 'https://example.com/hls.m3u8',
      itemId: 'posts/post-1',
      itemType: 'posts',
      mediaConvertJobId: 'job-1',
      mimeType: 'video/mp4',
      name: 'Video',
      playbackFileType: 'hls',
      playbackUrl: 'https://example.com/play',
      privacy: 'public',
      provider: 'aws',
      processingError: 'none',
      processingStatus: 'done',
      size: 100,
      sourceKey: 'source',
      streamType: 'hls',
      thumbBase64: 'thumb',
      thumbFileType: 'image/jpeg',
      thumbUrl: 'https://example.com/thumb.jpg',
      uploadId: 'upload-1',
      uploadKey: 'upload-key',
      uploadStatus: 'complete',
      url: 'https://example.com/video.mp4',
      userId: 'user-1',
      videoId: 'video-1',
      width: 1280
    });
    const parsed = parseVideo(video);

    expect(parsed.videoId).toBe('video1');
    expect(parsed.id).toBe('videos/video1');
    expect(parsed.width).toBe(1280);
    expect(() => validateVideoInput({duration: 'long'})).toThrow(VideoValidationError);
    expect(parseVideo({videoId: '../bad'} as any).videoId).toBe('bad');
  });

  it('wraps unexpected parse errors', () => {
    expect(() => parseVideo(null as any)).toThrow(VideoValidationError);
  });
});
