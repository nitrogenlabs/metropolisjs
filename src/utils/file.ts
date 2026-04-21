const getBase64ByteSize = (dataUrl: string): number => {
  const [, base64 = ''] = dataUrl.split(',');
  const paddingLength = base64.endsWith('==')
    ? 2
    : base64.endsWith('=')
      ? 1
      : 0;

  return Math.max(0, Math.floor((base64.length * 3) / 4) - paddingLength);
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
        let byteSize = getBase64ByteSize(dataUrl);

        while(byteSize > maxBytes && quality > 0.45) {
          quality = Math.max(0.45, Number((quality - 0.08).toFixed(2)));
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          byteSize = getBase64ByteSize(dataUrl);
        }

        while(byteSize > maxBytes && (currentWidth > 320 || currentHeight > 320)) {
          currentWidth = Math.max(320, Math.round(currentWidth * 0.85));
          currentHeight = Math.max(320, Math.round(currentHeight * 0.85));
          quality = 0.78;
          renderImage(currentWidth, currentHeight);
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          byteSize = getBase64ByteSize(dataUrl);

          while(byteSize > maxBytes && quality > 0.45) {
            quality = Math.max(0.45, Number((quality - 0.08).toFixed(2)));
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            byteSize = getBase64ByteSize(dataUrl);
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
