/**
 * Copyright (c) 2026-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import {z} from 'zod';

export class HiggsfieldValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'HiggsfieldValidationError';
  }
}

const SoulImageInputSchema = z.object({
  aspectRatio: z.enum(['9:16', '16:9', '4:3', '3:4', '1:1', '2:3', '3:2']).optional(),
  batchSize: z.union([z.literal(1), z.literal(4)]).optional(),
  enhancePrompt: z.boolean().optional(),
  prompt: z.string().min(1),
  resolution: z.enum(['720p', '1080p']).optional(),
  seed: z.number().int().min(1).max(1_000_000).optional(),
  styleId: z.string().optional()
}).loose();

const SeedanceVideoInputSchema = z.object({
  duration: z.number().int().min(4).max(30).optional(),
  endImageUrl: z.string().url().optional(),
  generateAudio: z.boolean().optional(),
  imageUrl: z.string().url(),
  outputFormat: z.enum(['mp4', 'mov']).optional(),
  prompt: z.string().min(1).optional(),
  resolution: z.enum(['480p', '720p']).optional()
}).loose();

const SeedanceReferenceVideoInputSchema = z.object({
  aspectRatio: z.enum(['16:9', '4:3', '1:1', '3:4', '9:16', '21:9']),
  audioUrls: z.array(z.string().url()).min(1).max(10).optional(),
  duration: z.number().int().min(4).max(30).optional(),
  generateAudio: z.boolean().optional(),
  imageUrls: z.array(z.string().url()).min(1).max(30).optional(),
  outputFormat: z.enum(['mp4', 'mov']).optional(),
  prompt: z.string().min(1).optional(),
  resolution: z.enum(['480p', '720p']).optional(),
  videoUrls: z.array(z.string().url()).min(1).max(10).optional()
}).loose();

const MarketingStudioImageInputSchema = z.object({
  aspectRatio: z.enum(['auto', '1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16', '21:9']).optional(),
  enhancePrompt: z.boolean().optional(),
  imageUrls: z.array(z.string().url()).min(1).max(16).optional(),
  presetId: z.string().optional(),
  prompt: z.string().min(1).max(5000),
  quality: z.enum(['low', 'medium', 'high']).optional(),
  resolution: z.enum(['1k', '2k', '4k']).optional()
}).loose();

export type SoulImageInput = z.infer<typeof SoulImageInputSchema>;
export type SeedanceVideoInput = z.infer<typeof SeedanceVideoInputSchema>;
export type SeedanceReferenceVideoInput = z.infer<typeof SeedanceReferenceVideoInputSchema>;
export type MarketingStudioImageInput = z.infer<typeof MarketingStudioImageInputSchema>;

export interface HiggsfieldRequest {
  cancelUrl?: string;
  error?: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  requestId?: string;
  status?: string;
  statusUrl?: string;
}

const parseWith = <T>(schema: z.ZodType<T>, input: unknown): T => {
  try {
    return schema.parse(input);
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      throw new HiggsfieldValidationError(`Higgsfield input validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const validateSoulImageInput = (input: unknown): SoulImageInput => parseWith(SoulImageInputSchema, input);
export const validateSeedanceVideoInput = (input: unknown): SeedanceVideoInput =>
  parseWith(SeedanceVideoInputSchema, input);
export const validateSeedanceReferenceVideoInput = (input: unknown): SeedanceReferenceVideoInput =>
  parseWith(SeedanceReferenceVideoInputSchema, input);
export const validateMarketingStudioImageInput = (input: unknown): MarketingStudioImageInput =>
  parseWith(MarketingStudioImageInputSchema, input);
