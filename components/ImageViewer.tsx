import React, { useState } from 'react';
import ContextMenu from './common/ContextMenu';
import Button from './common/Button';

// SVG Icons for toolbar
const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const ExpandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5" />
    </svg>
);

interface ImageViewerProps {
    isOpen: boolean;
    imageUrl: string | null;
    onClose: () => void;
    onDownload?: () => void;
    onExpand?: (ratio: string) => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ isOpen, imageUrl, onClose, onDownload, onExpand }) => {
    const [contextMenu, setContextMenu] = useState<{ position: { x: number, y: number } } | null>(null);

    if (!isOpen || !imageUrl) return null;

    const handleExpandClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        // Position menu above the button
        const x = rect.left + rect.width / 2; 
        const y = rect.top;
        setContextMenu({ position: { x, y } });
    };

    return (
        <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-lg animate-fade-in"
            onClick={onClose}
        >
            <img 
                src={imageUrl} 
                alt="Full-size view"
                className="max-w-[94vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl shadow-black/50"
                onClick={(e) => e.stopPropagation()}
            />

            <div className="fixed bottom-0 left-0 right-0 p-3 bg-black/20 backdrop-blur-sm flex justify-center items-center gap-3 z-[101]">
                {onDownload && <Button variant="ghost" onClick={onDownload}><DownloadIcon/> Download</Button>}
                {onExpand && <Button variant="ghost" onClick={handleExpandClick}><ExpandIcon/> Expand</Button>}
                <Button variant="ghost" onClick={onClose}>Close</Button>
            </div>

            {contextMenu && onExpand && (
                <ContextMenu
                    position={contextMenu.position}
                    onClose={() => setContextMenu(null)}
                    onSelect={(ratio) => {
                        onExpand(ratio);
                        setContextMenu(null);
                    }}
                    origin="top-center"
                />
            )}
            
            <style>
                {`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in { animation: fade-in 0.2s ease-out; }
                `}
            </style>
        </div>
    );
};

export default ImageViewer;
