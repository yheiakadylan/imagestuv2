import React, { useState, useEffect, useRef } from 'react';
import { getImage, saveImage } from '../../services/cacheService';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: string;
}

const CachedImage: React.FC<CachedImageProps> = ({ src, ...props }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isInView, setIsInView] = useState(false);
    const placeholderRef = useRef<HTMLDivElement>(null);

    // This effect sets up the IntersectionObserver to watch the placeholder element.
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // If the placeholder is intersecting the viewport, set isInView to true.
                if (entry.isIntersecting) {
                    setIsInView(true);
                    // Once in view, we don't need to observe it anymore.
                    if (placeholderRef.current) {
                        observer.unobserve(placeholderRef.current);
                    }
                }
            },
            {
                // `rootMargin` allows us to start loading images before they enter the viewport.
                // 200px means we start loading when the image is 200px away from being visible.
                rootMargin: '200px 0px',
            }
        );

        if (placeholderRef.current) {
            observer.observe(placeholderRef.current);
        }

        return () => {
            if (placeholderRef.current) {
                // Clean up the observer when the component unmounts.
                // eslint-disable-next-line react-hooks/exhaustive-deps
                observer.unobserve(placeholderRef.current);
            }
        };
    }, []); // The empty dependency array ensures this effect runs only once when the component mounts.

    // This effect handles the actual image loading logic.
    // It runs when the component comes into view (`isInView` becomes true) or when the `src` prop changes.
    useEffect(() => {
        if (!isInView || !src) {
            return; // Don't load if not in view or no src is provided.
        }

        let isMounted = true;
        
        const loadImage = async () => {
            // 1. Check IndexedDB cache first.
            try {
                const cachedDataUrl = await getImage(src);
                if (cachedDataUrl) {
                    if (isMounted) setImageSrc(cachedDataUrl);
                    return;
                }
            } catch (error) {
                console.warn('Failed to get image from cache:', error);
            }

            // 2. If not in cache, fetch from network using an Image object to handle CORS.
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                
                if (!ctx) {
                    console.error('Canvas context not available. Falling back to direct URL.');
                    if (isMounted) setImageSrc(src);
                    return;
                }

                ctx.drawImage(img, 0, 0);
                
                try {
                    const dataUrl = canvas.toDataURL('image/png');
                    if (isMounted) setImageSrc(dataUrl);
                    // Save to cache for next time.
                    saveImage(src, dataUrl).catch(err => console.warn('Failed to cache image:', err));
                } catch (e) {
                    console.error('Canvas toDataURL failed, likely due to CORS tainting. Falling back to direct URL.', e);
                    if (isMounted) setImageSrc(src);
                }
            };
            img.onerror = (err) => {
                console.error(`Failed to load image for caching: ${src}`, err);
                if (isMounted) setImageSrc(src); // Fallback to direct src on error.
            };
            img.src = src;
        };

        loadImage();
        
        return () => { isMounted = false; }; // Cleanup function to prevent state updates on unmounted components.
    }, [src, isInView]);

    // If we have the image data, render the image.
    if (imageSrc) {
        return <img src={imageSrc} {...props} />;
    }

    // Otherwise, render the placeholder. The ref is attached here.
    return (
        <div 
            ref={placeholderRef} 
            className="w-full h-full bg-black/20 animate-pulse rounded-md"
        />
    );
};

export default CachedImage;
