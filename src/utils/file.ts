const getUploadPayloadByteSize = (dataUrl: string): number => dataUrl.length;

const getFileNameWithoutExtension = (name: string): string => (
  name.split('.').slice(0, -1).join('.') || name
);

const createImageCanvas = (file: File, maxSize: number): Promise<{
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  height: number;
  width: number;
}> => new Promise((resolve, reject) => {
  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  image.onload = () => {
    URL.revokeObjectURL(objectUrl);

    const canvas: HTMLCanvasElement = document.createElement('canvas');
    const {height, width} = image;
    let updatedHeight: number = height;
    let updatedWidth: number = width;

    if(width > height) {
      if(width > maxSize) {
        updatedHeight *= maxSize / width;
        updatedWidth = maxSize;
      }
    } else if(height > maxSize) {
      updatedWidth *= maxSize / height;
      updatedHeight = maxSize;
    }

    const context = canvas.getContext('2d');

    if(!context) {
      reject(new Error('Unable to prepare image upload.'));
      return;
    }

    resolve({
      canvas,
      context,
      height: Math.max(1, Math.round(updatedHeight)),
      width: Math.max(1, Math.round(updatedWidth))
    });
  };

  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('Unable to prepare image upload.'));
  };

  image.src = objectUrl;
});

const renderImageFile = (
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  width: number,
  height: number,
  quality: number,
  name: string
): Promise<File> => new Promise((resolve, reject) => {
  canvas.width = width;
  canvas.height = height;
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  canvas.toBlob((blob) => {
    if(!blob) {
      reject(new Error('Unable to prepare image upload.'));
      return;
    }

    resolve(new File([blob], `${getFileNameWithoutExtension(name)}.jpg`, {type: 'image/jpeg'}));
  }, 'image/jpeg', quality);
});

export const convertFileToUploadFile = async (
  file: File,
  maxSize: number,
  maxBytes: number = 900 * 1024
): Promise<File> => {
  if(!file.type.startsWith('image/') || typeof document === 'undefined') {
    return file;
  }

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Unable to prepare image upload.'));
      image.src = objectUrl;
    });

    const {canvas, context, height, width} = await createImageCanvas(file, maxSize);
    let currentWidth = width;
    let currentHeight = height;
    let quality = 0.82;
    let uploadFile = await renderImageFile(canvas, context, image, currentWidth, currentHeight, quality, file.name);

    while(uploadFile.size > maxBytes && quality > 0.45) {
      quality = Math.max(0.45, Number((quality - 0.08).toFixed(2)));
      uploadFile = await renderImageFile(canvas, context, image, currentWidth, currentHeight, quality, file.name);
    }

    while(uploadFile.size > maxBytes && (currentWidth > 320 || currentHeight > 320)) {
      currentWidth = Math.max(320, Math.round(currentWidth * 0.85));
      currentHeight = Math.max(320, Math.round(currentHeight * 0.85));
      quality = 0.78;
      uploadFile = await renderImageFile(canvas, context, image, currentWidth, currentHeight, quality, file.name);

      while(uploadFile.size > maxBytes && quality > 0.45) {
        quality = Math.max(0.45, Number((quality - 0.08).toFixed(2)));
        uploadFile = await renderImageFile(canvas, context, image, currentWidth, currentHeight, quality, file.name);
      }
    }

    return uploadFile;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const convertFileToBase64 = (
  file: File,
  maxSize: number,
  maxBytes: number = 900 * 1024
): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas: HTMLCanvasElement = document.createElement('canvas');
        const {height, width} = image;
        let updatedHeight: number = height;
        let updatedWidth: number = width;

        if(width > height) {
          if(width > maxSize) {
            updatedHeight *= maxSize / width;
            updatedWidth = maxSize;
          }
        } else if(height > maxSize) {
          updatedWidth *= maxSize / height;
          updatedHeight = maxSize;
        }

        const context = canvas.getContext('2d');

        if(!context) {
          reject(new Error('Unable to prepare image upload.'));
          return;
        }

        const renderImage = (width: number, height: number) => {
          canvas.width = width;
          canvas.height = height;
          context.clearRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);
        };

        let currentWidth = Math.max(1, Math.round(updatedWidth));
        let currentHeight = Math.max(1, Math.round(updatedHeight));
        let quality = 0.82;

        renderImage(currentWidth, currentHeight);

        let dataUrl: string = canvas.toDataURL('image/jpeg', quality);
        let byteSize = getUploadPayloadByteSize(dataUrl);

        while(byteSize > maxBytes && quality > 0.45) {
          quality = Math.max(0.45, Number((quality - 0.08).toFixed(2)));
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          byteSize = getUploadPayloadByteSize(dataUrl);
        }

        while(byteSize > maxBytes && (currentWidth > 320 || currentHeight > 320)) {
          currentWidth = Math.max(320, Math.round(currentWidth * 0.85));
          currentHeight = Math.max(320, Math.round(currentHeight * 0.85));
          quality = 0.78;
          renderImage(currentWidth, currentHeight);
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          byteSize = getUploadPayloadByteSize(dataUrl);

          while(byteSize > maxBytes && quality > 0.45) {
            quality = Math.max(0.45, Number((quality - 0.08).toFixed(2)));
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            byteSize = getUploadPayloadByteSize(dataUrl);
          }
        }

        resolve(dataUrl);
      };

      const originalBase64: string = reader.result as string;
      image.src = originalBase64;
    };
    reader.onerror = (event: ProgressEvent) => {
      reject(event);
    };
    reader.readAsDataURL(file);
  });
