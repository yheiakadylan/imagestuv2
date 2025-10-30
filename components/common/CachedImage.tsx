import React, { useState, useEffect } from 'react';
import { getImage, saveImage } from '../../services/cacheService';
import { blobToDataURL } from '../../utils/fileUtils';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: string;
}

const CachedImage: React.FC<CachedImageProps> = ({ src, ...props }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        
        const loadImage = async () => {
            if (!src) {
                if (isMounted) setImageSrc(null);
                return;
            };

            // Reset on src change
            if (isMounted) setImageSrc(null);

            try {
                const cachedDataUrl = await getImage(src);
                if (cachedDataUrl) {
                    if (isMounted) setImageSrc(cachedDataUrl);
                    return;
                }
            } catch (error) {
                console.warn('Failed to get image from cache:', error);
            }

            try {
                const response = await fetch(src);
                if (!response.ok) {
                    throw new Error(`Failed to fetch image: ${response.statusText}`);
                }
                const blob = await response.blob();
                const dataUrl = await blobToDataURL(blob);
                
                if (isMounted) setImageSrc(dataUrl);

                // Don't await save, let it happen in the background
                saveImage(src, dataUrl).catch(err => console.warn('Failed to cache image:', err));

            } catch (error) {
                console.error(`Failed to load image from network: ${src}`, error);
                if (isMounted) setImageSrc(src); // Fallback to src if fetch fails
            }
        };

        loadImage();
        
        return () => { isMounted = false; };
    }, [src]);

    if (!imageSrc) {
        // Placeholder while loading
        return (
            <div className="w-full h-full bg-black/20 animate-pulse rounded-md flex items-center justify-center">
            </div>
        );
    }

    return <img src={imageSrc} {...props} />;
};

export default CachedImage;
