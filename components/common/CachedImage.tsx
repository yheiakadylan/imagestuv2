import React, { useState, useEffect } from 'react';
import { getImage, saveImage } from '../../services/cacheService';

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
            }
            if (isMounted) setImageSrc(null); // Reset on src change

            // 1. Check cache first
            try {
                const cachedDataUrl = await getImage(src);
                if (cachedDataUrl) {
                    if (isMounted) setImageSrc(cachedDataUrl);
                    return;
                }
            } catch (error) {
                console.warn('Failed to get image from cache:', error);
            }

            // 2. If not in cache, fetch from network via Image/Canvas to bypass CORS issues with fetch()
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                
                if (!ctx) {
                    console.error('Canvas context is not available. Falling back to direct URL.');
                    if (isMounted) setImageSrc(src);
                    return;
                }

                ctx.drawImage(img, 0, 0);
                
                try {
                    const dataUrl = canvas.toDataURL('image/png');
                    if (isMounted) setImageSrc(dataUrl);
                    // Save to cache in the background, don't block rendering
                    saveImage(src, dataUrl).catch(err => console.warn('Failed to cache image:', err));
                } catch (e) {
                    console.error('Canvas toDataURL failed, likely due to CORS tainting. Falling back to direct URL.', e);
                    if (isMounted) setImageSrc(src);
                }
            };
            img.onerror = (err) => {
                console.error(`Failed to load image for caching via Image object: ${src}`, err);
                // Fallback to using the src directly if the Image object fails to load
                if (isMounted) setImageSrc(src);
            };
            img.src = src;
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
