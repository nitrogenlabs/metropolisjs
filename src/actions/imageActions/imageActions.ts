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

import type { FluxFramework } from '@nlabs/arkhamjs';
import type { ImageType } from '../../adapters/imageAdapter/imageAdapter.js';
import type { ApiResultsType, ReaktorDbCollection } from '../../utils/api.js';

const DATA_TYPE: ReaktorDbCollection = 'images';

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
  add: (image: Partial<ImageType>, type?: string) => Promise<ImageType>;
  delete: (imageId: string, imageProps?: string[]) => Promise<ImageType>;
  update: (image: Partial<ImageType>, type?: string) => Promise<ImageType>;
  upload: (imageFiles: File[], itemId: string, itemType?: string) => Promise<ImageType[]>;
  countByItem: (itemId: string) => Promise<number>;
  listByItem: (itemId: string, from?: number, to?: number, imageProps?: string[]) => Promise<ImageType[]>;
  listByReactions: (reactions: string[], from?: number, to?: number, imageProps?: string[]) => Promise<ImageType[]>;
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
  let imageAdapterOptions: ImageAdapterOptions = options?.imageAdapterOptions || {};
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
    type: string = 'image'
  ): Promise<ImageType> => {
    try {
      const validatedImage = validateImage(image, imageAdapterOptions);
      const {base64, description, itemId} = validatedImage;
      const formatImage = {
        base64,
        description: description ? parseString(description, 500) : undefined,
        fileType: 'image/jpeg',
        itemId,
        itemType: type
      };

      const {image: newImage} = await uploadImage(flux, formatImage);
      await flux.dispatch({image: newImage, type: IMAGE_CONSTANTS.ADD_ITEM_SUCCESS});
      return newImage as ImageType;
    } catch(error) {
      flux.dispatch({error, type: IMAGE_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    }
  };

  const deleteImage = async (
    imageId: string,
    imageProps: string[] = []
  ): Promise<ImageType> => {
    try {
      const queryVariables = {
        imageId: {
          type: 'ID!',
          value: imageId
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const {deleteImage = {}} = data;
        return flux.dispatch({image: deleteImage, type: IMAGE_CONSTANTS.REMOVE_ITEM_SUCCESS});
      };

      return await appMutation<ImageType>(flux, 'deleteImage', DATA_TYPE, queryVariables, ['id', ...imageProps], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: IMAGE_CONSTANTS.REMOVE_ITEM_ERROR});
      throw error;
    }
  };

  const update = async (
    image: Partial<ImageType>,
    type: string = 'image'
  ): Promise<ImageType> => {
    try {
      const validatedImage = validateImage(image, imageAdapterOptions);
      const {base64, description, itemId} = validatedImage;
      const formatImage = {
        base64,
        description: description ? parseString(description, 500) : undefined,
        fileType: 'image/jpeg',
        itemId,
        itemType: type
      };

      const {image: newImage} = await uploadImage(flux, formatImage);
      await flux.dispatch({image: newImage, type: IMAGE_CONSTANTS.ADD_ITEM_SUCCESS});
      return newImage as ImageType;
    } catch(error) {
      flux.dispatch({error, type: IMAGE_CONSTANTS.ADD_ITEM_ERROR});
      throw error;
    }
  };

  const upload = async (
    imageFiles: File[],
    itemId: string,
    itemType: string = 'users'
  ): Promise<ImageType[]> => {
    try {
      const savedImages = await Promise.all(
        imageFiles.map(async (file: File) => {
          const config = getConfigFromFlux(flux);
          // Note: app.images.maxImageSize is not part of standard MetropolisEnvironmentConfiguration
          // Uses default value if not provided in config
          const maxImageSize = (config as any).app?.images?.maxImageSize || 5242880;
          const base64: string = await convertFileToBase64(file, maxImageSize);
          const {type: fileType} = file;
          return add({base64, fileType, itemId}, itemType);
        })
      );

      await flux.dispatch({images: savedImages, type: IMAGE_CONSTANTS.UPLOAD_ITEM_SUCCESS});
      return savedImages;
    } catch(error) {
      flux.dispatch({error, type: IMAGE_CONSTANTS.UPLOAD_ITEM_ERROR});
      throw error;
    }
  };

  const countByItem = async (itemId: string): Promise<number> => {
    try {
      const queryVariables = {
        itemId: {
          type: 'String!',
          value: itemId
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const {imageCount: count = 0} = data;
        return flux.dispatch({itemId, count, type: IMAGE_CONSTANTS.GET_COUNT_SUCCESS});
      };

      return await appQuery<number>(flux, 'imageCount', DATA_TYPE, queryVariables, ['count'], {onSuccess});
    } catch(error) {
      flux.dispatch({error, type: IMAGE_CONSTANTS.GET_COUNT_ERROR});
      throw error;
    }
  };

  const listByItem = async (
    itemId: string,
    from: number = 0,
    to: number = 10,
    imageProps: string[] = []
  ): Promise<ImageType[]> => {
    try {
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
        const {imagesByItem = []} = data as {imagesByItem: ImageType[]};
        return flux.dispatch({
          itemId,
          list: imagesByItem,
          type: IMAGE_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appQuery<ImageType[]>(
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
          'thumbUrl',
          'width',
          ...imageProps
        ],
        {onSuccess}
      );
    } catch(error) {
      flux.dispatch({error, type: IMAGE_CONSTANTS.GET_LIST_ERROR});
      throw error;
    }
  };

  const listByReactions = async (
    reactions: string[],
    from: number = 0,
    to: number = 10,
    imageProps: string[] = []
  ): Promise<ImageType[]> => {
    try {
      const queryVariables = {
        from: {
          type: 'Int',
          value: from
        },
        reactions: {
          type: 'ReactionInput!',
          value: reactions
        },
        to: {
          type: 'Int',
          value: to
        }
      };

      const onSuccess = (data: ApiResultsType = {}) => {
        const {imagesByReactions = []} = data as {imagesByReactions: ImageType[]};
        return flux.dispatch({
          list: imagesByReactions,
          type: IMAGE_CONSTANTS.GET_LIST_SUCCESS
        });
      };

      return await appQuery<ImageType[]>(
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
          'thumbUrl',
          'width',
          ...imageProps
        ],
        {onSuccess}
      );
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

