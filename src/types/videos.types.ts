/**
 * Copyright (c) 2024-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import type {BaseDocument, ExtensibleFields} from './common.types.js';

export interface VideoType extends BaseDocument, ExtensibleFields {
  readonly base64?: string;
  readonly description?: string;
  readonly duration?: number;
  readonly externalId?: string;
  readonly externalUrl?: string;
  readonly fileType?: string;
  readonly fileName?: string;
  readonly fileSize?: number;
  readonly format?: string;
  readonly height?: number;
  readonly itemId?: string;
  readonly itemType?: string;
  readonly mimeType?: string;
  readonly name?: string;
  readonly hlsUrl?: string;
  readonly mediaConvertJobId?: string;
  readonly playbackFileType?: string;
  readonly playbackUrl?: string;
  readonly privacy?: string;
  readonly provider?: string;
  readonly processingError?: string;
  readonly processingStatus?: string;
  readonly size?: number;
  readonly sourceKey?: string;
  readonly streamType?: string;
  readonly thumbBase64?: string;
  readonly thumbFileType?: string;
  readonly thumbUrl?: string;
  readonly type?: string;
  readonly url?: string;
  readonly userId?: string;
  readonly uploadId?: string;
  readonly uploadKey?: string;
  readonly uploadStatus?: string;
  readonly videoId?: string;
  readonly width?: number;
}

export interface VideoUploadPartInput {
  readonly etag: string;
  readonly partNumber: number;
}

export interface VideoUploadPartUrl {
  readonly partNumber: number;
  readonly url: string;
}

export interface VideoMultipartUploadType {
  readonly bucket?: string;
  readonly key: string;
  readonly partSize: number;
  readonly partUrls: VideoUploadPartUrl[];
  readonly uploadId: string;
  readonly video?: VideoType;
  readonly videoId: string;
}
