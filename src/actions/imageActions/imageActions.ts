/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */
import { parseString } from '@nlabs/utils';

import { validateImageInput } from '../../adapters/imageAdapter/imageAdapter.js';
import { getConfigFromFlux } from '../../utils/configUtils.js';
import { IMAGE_CONSTANTS } from '../../stores/imageStore.js';
import { appMutation, appQuery, uploadImage } from '../../utils/api.js';
import { convertFileToBase64 } from '../../utils/file.js';
import { clearCachedRequest, getCachedRequest, setCachedRequest } from '../../utils/requestCache.js';

import type { FluxFramework } from '@nlabs/arkhamjs';
import type { ImageType } from '../../adapters/imageAdapter/imageAdapter.js';
import type { ApiResultsType } from '../../utils/api.js';
import type { ActionRequestOptions } from '../../utils/requestCache.js';

const DATA_TYPE = 'images';

export interface ImageAdapterOptions {
  strict?: boolean;
  allowPartial?: boolean;
  environment?: 'development' | 'production' | 'test';
  customValidation?: (input: unknown) => unknown;
}

export interface ImageActionsOptions {
  imageAdapter?: (input: unknown, options?: ImageAdapterOptions) => any;
  imageAdapterOptions?: ImageAdapterOptions;
}

export type ImageApiResultsType = {
  addImage: ImageType;
  deleteImage: ImageType;
  image: ImageType;
  updateImage: ImageType;
  uploadFileImages: ImageType[];
  getImageCount: number;
  getImagesByItem: ImageType[];
  getImagesByReactions: ImageType[];
};

export interface ImageActions {
  add: (image: Partial<ImageType>, type?: string, requestOptions?: ActionRequestOptions) => Promise<ImageType>;
  delete: (imageId: string, imageProps?: string[], requestOptions?: ActionRequestOptions) => Promise<ImageType>;
  update: (image: Partial<ImageType>, type?: string, requestOptions?: ActionRequestOptions) => Promise<ImageType>;
  upload: (imageFiles: File[], itemId: string, itemType?: string, requestOptions?: ActionRequestOptions) => Promise<ImageType[]>;
  countByItem: (itemId: string, requestOptions?: ActionRequestOptions) => Promise<number>;
  listByItem: (itemId: string, from?: number, to?: number, imageProps?: string[], requestOptions?: ActionRequestOptions) => Promise<ImageType[]>;
  listByReactions: (reactions: string[], from?: number, to?: number, imageProps?: string[], requestOptions?: ActionRequestOptions) => Promise<ImageType[]>;
  updateImageAdapter: (adapter: (input: unknown, options?: ImageAdapterOptions) => any) => void;
  updateImageAdapterOptions: (options: ImageAdapterOptions) => void;
}

// Default validation function
const defaultImageValidator = (input: unknown, options?: ImageAdapterOptions) => validateImageInput(input);

// Enhanced validation function that merges custom logic with defaults
const createImageValidator = (
  customAdapter?: (input: unknown, options?: ImageAdapterOptions) => any,
  options?: ImageAdapterOptions
) => (input: unknown, validatorOptions?: ImageAdapterOptions) => {
  const mergedOptions = {...options, ...validatorOptions};

  // Start with default validation
  let validated = defaultImageValidator(input, mergedOptions);

  // Apply custom validation if provided
  if(customAdapter) {
    validated = customAdapter(validated, mergedOptions);
  }

  // Apply custom validation from options if provided
  if(mergedOptions?.customValidation) {
    validated = mergedOptions.customValidation(validated) as ImageType;
  }

  return validated;
};

/**
 * Factory function to create ImageActions with enhanced adapter injection capabilities.
 * Custom adapters are merged with default behavior, allowing partial overrides.
 *
 * @example
 * // Basic usage with default adapters
 * const imageActions = createImageActions(flux);
 *
 * @example
 * // Custom adapter that extends default behavior
 * const customImageAdapter = (input: unknown, options?: ImageAdapterOptions) => {
 *   // input is already validated by default adapter
 *   if (input.fileSize && input.fileSize > 5000000) {
 *     throw new Error('Image file too large');
 *   }
 *   return input;
 * };
 *
 * const imageActions = createImageActions(flux, {
 *   imageAdapter: customImageAdapter
 * });
 */
export const createImageActions = (
  flux: FluxFramework,
  options?: ImageActionsOptions
): ImageActions => {
  // Initialize adapter state
  let imageAdapterOptions = options?.imageAdapterOptions || {};
  let customImageAdapter = options?.imageAdapter;

  // Create validators that merge custom adapters with defaults
  let validateImage = createImageValidator(customImageAdapter, imageAdapterOptions);

  // Update functions that recreate validators
  const updateImageAdapter = (adapter: (input: unknown, options?: ImageAdapterOptions) => any): void => {
    customImageAdapter = adapter;
    validateImage = createImageValidator(customImageAdapter, imageAdapterOptions);
  };

  const updateImageAdapterOptions = (options: ImageAdapterOptions): void => {
    imageAdapterOptions = {...imageAdapterOptions, ...options};
    validateImage = createImageValidator(customImageAdapter, imageAdapterOptions);
  };

  // Action implementations
  const add = async (
    image: Partial<ImageType>,
    type: string = 'image',
    requestOptions: ActionRequestOptions = {}
  ): Promise<ImageType> => {
    try {
      const validatedImage = validateImage(image, imageAdapterOptions);
      const {base64, description, itemId, privacy} = validatedImage;
      const formatImage = {
        base64,
        description: description ? parseString(description, 500) : undefined,
        fileType: 'image/jpeg',
        itemId,
        itemType: type,
        ...(privacy ? {privacy} : {})
      };

      const {image: newImage} = await uploadImage(flux, formatImage);
      await flux.dispatch({image: newImage, type: IMAGE_CONSTANTS.ADD_ITEM_SUCCESS});
      return newImage as ImageType;
    } catch(error) {
      flux.dispatch({error, type: IMAGE_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `image.countByItem:${String(image?.itemId || '')}`);
      await clearCachedRequest(flux, `image.listByItem:${String(image?.itemId || '')}`);
      await clearCachedRequest(flux, 'image.listByReactions');
    }
  };

  const deleteImage = async (
    imageId: string,
    imageProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<ImageType> => {
    try {
      const queryVariables = {
        imageId: {
          type: 'ID!',
          value: imageId
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const deleteImage = data?.deleteImage || {};
        return flux.dispatch({image: deleteImage, type: IMAGE_CONSTANTS.REMOVE_ITEM_SUCCESS});
      };

      return await appMutation<ImageType>(flux, 'deleteImage', DATA_TYPE, queryVariables, ['id', ...imageProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: IMAGE_CONSTANTS.REMOVE_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, 'image.listByReactions');
    }
  };

  const update = async (
    image: Partial<ImageType>,
    type: string = 'image',
    requestOptions: ActionRequestOptions = {}
  ): Promise<ImageType> => {
    try {
      const validatedImage = validateImage(image, imageAdapterOptions);
      const {base64, description, itemId, privacy} = validatedImage;
      const formatImage = {
        base64,
        description: description ? parseString(description, 500) : undefined,
        fileType: 'image/jpeg',
        itemId,
        itemType: type,
        ...(privacy ? {privacy} : {})
      };

      const {image: newImage} = await uploadImage(flux, formatImage);
      await flux.dispatch({image: newImage, type: IMAGE_CONSTANTS.ADD_ITEM_SUCCESS});
      return newImage as ImageType;
    } catch(error) {
      flux.dispatch({error, type: IMAGE_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `image.countByItem:${String(image?.itemId || '')}`);
      await clearCachedRequest(flux, `image.listByItem:${String(image?.itemId || '')}`);
      await clearCachedRequest(flux, 'image.listByReactions');
    }
  };

  const upload = async (
    imageFiles: File[],
    itemId: string,
    itemType: string = 'users',
    requestOptions: ActionRequestOptions = {}
  ): Promise<ImageType[]> => {
    try {
      const savedImages = await Promise.all(
        imageFiles.map(async (file: File) => {
          const config = getConfigFromFlux(flux);
          const configuredMaxImageSize = Number(
            (config as any)?.app?.images?.maxImageSize
            || (config as any)?.maxImageSize
            || 1200
          );
          const configuredMaxImageUploadBytes = Number(
            (config as any)?.app?.images?.maxImageUploadBytes
            || (config as any)?.maxImageUploadBytes
            || 900 * 1024
          );
          const maxImageSize = Number.isFinite(configuredMaxImageSize) && configuredMaxImageSize > 0
            ? configuredMaxImageSize
            : 1200;
          const maxImageUploadBytes = Number.isFinite(configuredMaxImageUploadBytes) && configuredMaxImageUploadBytes > 0
            ? configuredMaxImageUploadBytes
            : 900 * 1024;
          const base64 = await convertFileToBase64(file, maxImageSize, maxImageUploadBytes);
          const {type: fileType} = file;
          return add({base64, fileType, itemId}, itemType, requestOptions);
        })
      );

      await flux.dispatch({images: savedImages, type: IMAGE_CONSTANTS.UPLOAD_ITEM_SUCCESS});
      return savedImages;
    } catch(error) {
      flux.dispatch({error, type: IMAGE_CONSTANTS.UPLOAD_ITEM_ERROR});
      throw error;
    } finally {
      await clearCachedRequest(flux, `image.countByItem:${itemId}`);
      await clearCachedRequest(flux, `image.listByItem:${itemId}`);
      await clearCachedRequest(flux, 'image.listByReactions');
    }
  };

  const countByItem = async (itemId: string, requestOptions: ActionRequestOptions = {}): Promise<number> => {
    try {
      const cachedResult = getCachedRequest<number>(flux, `image.countByItem:${itemId}`, {itemId}, requestOptions);

      if(cachedResult !== undefined) {
        return cachedResult;
      }

      const queryVariables = {
        itemId: {
          type: 'ID!',
          value: itemId
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const count = data?.imageCount ?? 0;
        return flux.dispatch({itemId, count, type: IMAGE_CONSTANTS.GET_COUNT_SUCCESS});
      };

      const result = await appQuery<number>(flux, 'imageCount', DATA_TYPE, queryVariables, ['count'], {onSuccess});
      return await setCachedRequest(flux, `image.countByItem:${itemId}`, {itemId}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: IMAGE_CONSTANTS.GET_COUNT_ERROR});
      throw error;
    }
  };

  const listByItem = async (
    itemId: string,
    from: number = 0,
    to: number = 10,
    imageProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<ImageType[]> => {
    try {
      const cachedResult = getCachedRequest<ImageType[]>(
        flux,
        `image.listByItem:${itemId}`,
        {from, imageProps, itemId, to},
        requestOptions
      );

      if(cachedResult) {
        return cachedResult;
      }

      const queryVariables = {
        from: {
          type: 'Int',
          value: from
        },
        itemId: {
          type: 'ID!',
          value: itemId
        },
        to: {
          type: 'Int',
          value: to
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const imagesByItem = Array.isArray((data as {imagesByItem?: ImageType[]})?.imagesByItem)
          ? (data as {imagesByItem?: ImageType[]}).imagesByItem || []
          : [];
        return flux.dispatch({
          itemId,
          list: imagesByItem,
          type: IMAGE_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      const result = await appQuery<ImageType[]>(
        flux,
        'imagesByItem',
        DATA_TYPE,
        queryVariables,
        [
          'color',
          'description',
          'height',
          'imageId',
          'imageUrl',
          'likeCount',
          'privacy',
          'thumbUrl',
          'width',
          ...imageProps
        ],
        {onSuccess}
      );

      return await setCachedRequest(flux, `image.listByItem:${itemId}`, {from, imageProps, itemId, to}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: IMAGE_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const listByReactions = async (
    reactions: string[],
    from: number = 0,
    to: number = 10,
    imageProps: string[] = [],
    requestOptions: ActionRequestOptions = {}
  ): Promise<ImageType[]> => {
    try {
      const cachedResult = getCachedRequest<ImageType[]>(flux, 'image.listByReactions', {from, imageProps, reactions, to}, requestOptions);

      if(cachedResult) {
        return cachedResult;
      }

      const queryVariables = {
        from: {
          type: 'Int',
          value: from
        },
        reactions: {
          type: '[String!]',
          value: reactions
        },
        to: {
          type: 'Int',
          value: to
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const imagesByReactions = Array.isArray((data as {imagesByReactions?: ImageType[]})?.imagesByReactions)
          ? (data as {imagesByReactions?: ImageType[]}).imagesByReactions || []
          : [];
        return flux.dispatch({
          list: imagesByReactions,
          type: IMAGE_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      const result = await appQuery<ImageType[]>(
        flux,
        'imagesByReactions',
        DATA_TYPE,
        queryVariables,
        [
          'color',
          'description',
          'height',
          'imageId',
          'imageUrl',
          'likeCount',
          'privacy',
          'thumbUrl',
          'width',
          ...imageProps
        ],
        {onSuccess}
      );

      return await setCachedRequest(flux, 'image.listByReactions', {from, imageProps, reactions, to}, result, requestOptions);
    } catch(error) {
      flux.dispatch({error, type: IMAGE_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  return {
    add,
    delete: deleteImage,
    update,
    upload,
    countByItem,
    listByItem,
    listByReactions,
    updateImageAdapter,
    updateImageAdapterOptions
  };
};
