import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppSettingsContext } from '../contexts/AppSettingsContext';

const AnnouncementBanner: React.FC = () => {
    const { settings } = useContext(AppSettingsContext);
    const [isVisible, setIsVisible] = useState(false);
    const [isMarquee, setIsMarquee] = useState(false);
    const textRef = useRef<HTMLSpanElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Use a more specific key to avoid conflicts if the text changes
    const storageKey = `announcementDismissed-${settings?.announcementText}`;

    useEffect(() => {
        if (settings?.announcementEnabled && settings.announcementText?.trim()) {
            const isDismissed = sessionStorage.getItem(storageKey);
            if (isDismissed !== 'true') {
                setIsVisible(true);
            }
        } else {
            setIsVisible(false);
        }
    }, [settings, storageKey]);

    // This effect runs once when the banner becomes visible to check if marquee is needed.
    // It also adds a resize listener to re-check.
    useEffect(() => {
        const checkMarquee = () => {
            if (textRef.current && containerRef.current) {
                const needsMarquee = textRef.current.scrollWidth > containerRef.current.clientWidth;
                setIsMarquee(needsMarquee);
            }
        };

        if (isVisible) {
            // A short delay allows the DOM to render fully before we measure it.
            const timeoutId = setTimeout(checkMarquee, 50);
            window.addEventListener('resize', checkMarquee);
            return () => {
                clearTimeout(timeoutId);
                window.removeEventListener('resize', checkMarquee);
            };
        }
    }, [isVisible]);

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem(storageKey, 'true');
    };

    if (!isVisible) {
        return null;
    }
    
    // Determine animation duration based on text length to keep speed consistent
    const animationDuration = textRef.current ? `${textRef.current.scrollWidth / 50}s` : '20s';

    return (
        <div className="announcement-banner">
            <div ref={containerRef} className={`announcement-content ${isMarquee ? 'marquee' : ''}`}>
                <span ref={textRef} style={{ animationDuration: isMarquee ? animationDuration : undefined }}>
                    {settings?.announcementText}
                </span>
                {isMarquee && <span aria-hidden="true" style={{ animationDuration }}>{settings?.announcementText}</span>}
            </div>
            <button onClick={handleDismiss} className="announcement-close" aria-label="Dismiss announcement">&times;</button>
        </div>
    );
};

export default AnnouncementBanner;
