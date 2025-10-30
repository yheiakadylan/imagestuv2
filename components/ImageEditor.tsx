import React, { useState, useCallback, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useApiKeys } from '../hooks/useApiKeys';
import * as geminiService from '../services/geminiService';
import { fileToBase64, readImagesFromClipboard, getImageAspectRatio, downloadDataUrl } from '../utils/fileUtils';
import { Status, User } from '../types';

import Button from './common/Button';
import TextArea from './common/TextArea';
import Spinner from './common/Spinner';

// SVG icon for the empty upload state
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

// SVG icon for the empty output state
const MagicWandIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.25278C12 6.25278 14.8868 3.52702 17.5 5.50002C20.1132 7.47302 18.25 11.5 18.25 11.5C18.25 11.5 22 13.25 20.5 15.5C19 17.75 15.5 16 15.5 16C15.5 16 13.5 19.5 11 19.5C8.5 19.5 6.5 16 6.5 16C6.5 16 3 17.75 4.5 15.5C6 13.25 9.75 11.5 9.75 11.5C9.75 11.5 7.88675 7.47302 10.5 5.50002C11.3857 4.80932 12 6.25278 12 6.25278Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 13.5L6 11" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 11L20.5 13.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 4L9.5 2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 2L16 4" />
    </svg>
);

interface ImageEditorProps {
    isOpen: boolean;
    onClose: () => void;
    showStatus: (message: string, type: Status['type'], duration?: number) => void;
    user: User | null;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ isOpen, onClose, showStatus, user }) => {
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [outputImage, setOutputImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [brushSize, setBrushSize] = useState(40);
    const [maskHistory, setMaskHistory] = useState<ImageData[]>([]);
    const [activeMobileTab, setActiveMobileTab] = useState<'source' | 'result'>('source');

    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawing = useRef(false);

    const auth = useContext(AuthContext);
    const { apiKeys } = useApiKeys(auth.user);
    const userApiKey = apiKeys.find(k => k.id === auth.user?.apiKeyId)?.key;

    const resetState = useCallback(() => {
        setSourceImage(null);
        setOutputImage(null);
        setPrompt('');
        setIsLoading(false);
        setIsDragging(false);
        setMaskHistory([]);
        setActiveMobileTab('source');
    }, []);

    const handleClose = () => {
        resetState();
        onClose();
    };
    
    // Setup canvas when source image changes
    useEffect(() => {
        const canvas = canvasRef.current;
        const image = imageRef.current;
        if (!canvas || !image || !sourceImage) return;

        let animationFrameId: number;

        const resizeCanvas = () => {
            if (!imageRef.current) return;
            const { clientWidth, clientHeight, naturalWidth, naturalHeight } = imageRef.current;
            if (naturalWidth > 0) {
                canvas.width = naturalWidth;
                canvas.height = naturalHeight;
                canvas.style.width = `${clientWidth}px`;
                canvas.style.height = `${clientHeight}px`;
                const ctx = canvas.getContext('2d');
                ctx?.clearRect(0, 0, canvas.width, canvas.height);
                setMaskHistory([]);
            }
        };

        const debouncedResize = () => {
             cancelAnimationFrame(animationFrameId);
             animationFrameId = requestAnimationFrame(resizeCanvas);
        };

        const observer = new ResizeObserver(debouncedResize);
        observer.observe(image);

        if (image.complete) {
            resizeCanvas();
        } else {
            image.onload = resizeCanvas;
        }

        return () => {
            observer.disconnect();
            cancelAnimationFrame(animationFrameId);
        };
    }, [sourceImage]);


    const getCoords = (e: React.MouseEvent<HTMLCanvasElement>): {x: number, y: number} | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        
        const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
        setMaskHistory(prev => [...prev, imageData]);

        isDrawing.current = true;
        const coords = getCoords(e);
        if(!coords) return;
        
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing.current) return;
        const ctx = canvasRef.current?.getContext('2d');
        const coords = getCoords(e);
        if (!ctx || !coords) return;

        ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`;
        ctx.fillStyle = `rgba(255, 255, 255, 0.8)`;
        ctx.lineWidth = brushSize * (canvasRef.current!.width / canvasRef.current!.clientWidth);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
    };
    
    const stopDrawing = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) ctx.beginPath(); // Reset the path
        isDrawing.current = false;
    };

    const handleUndo = () => {
        if (maskHistory.length === 0) return;
        const lastState = maskHistory[maskHistory.length - 1];
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.putImageData(lastState, 0, 0);
        }
        setMaskHistory(prev => prev.slice(0, -1));
    };

    const handleClearMask = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx && maskHistory.length > 0) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            setMaskHistory(prev => [...prev, imageData]);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };


    const handleImageUpload = (dataUrl: string) => {
        setSourceImage(dataUrl);
        setOutputImage(null); // Clear previous output when new source is set
        setActiveMobileTab('source');
    };

    const handleAddFromFile = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const dataUrl = await fileToBase64(file);
                handleImageUpload(dataUrl);
            }
        };
        input.click();
    };

    const handleRemoveImage = () => {
        setSourceImage(null);
        setOutputImage(null);
    };

    const handlePaste = async () => {
        try {
            const dataUrls = await readImagesFromClipboard();
            if (dataUrls.length > 0) {
                handleImageUpload(dataUrls[0]);
                showStatus('Image pasted successfully!', 'ok');
            } else {
                showStatus('No image found on clipboard.', 'warn');
            }
        } catch (error: any) {
            showStatus(error.message, 'err');
        }
    };

    const handleDragEvent = (e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(isEntering);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files[0] && files[0].type.startsWith('image/')) {
            const dataUrl = await fileToBase64(files[0]);
            handleImageUpload(dataUrl);
        }
    };
    
    const handleGenerate = async () => {
        if (!sourceImage || !prompt.trim()) {
            showStatus('Please provide an image and a prompt.', 'warn');
            return;
        }
        if (!userApiKey) {
            showStatus('Your account does not have an API key assigned.', 'err');
            return;
        }

        setIsLoading(true);
        setOutputImage(null);
        
        const drawingCanvas = canvasRef.current;
        const hasMask = drawingCanvas && maskHistory.length > 0;

        try {
            const aspectRatio = await getImageAspectRatio(sourceImage);
            
            if (hasMask) {
                // Inpainting logic
                const maskCanvas = document.createElement('canvas');
                maskCanvas.width = drawingCanvas.width;
                maskCanvas.height = drawingCanvas.height;
                const maskCtx = maskCanvas.getContext('2d');
                if (!maskCtx) throw new Error("Could not create mask canvas context.");
                
                // Black background
                maskCtx.fillStyle = 'black';
                maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
                
                // Draw the user's mask in white
                maskCtx.globalCompositeOperation = 'source-over';
                maskCtx.drawImage(drawingCanvas, 0, 0);
                maskCtx.globalCompositeOperation = 'source-in';
                maskCtx.fillStyle = 'white';
                maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

                const maskDataUrl = maskCanvas.toDataURL('image/png');

                const [resultUrl] = await geminiService.generateArtwork(prompt, aspectRatio, [sourceImage], 1, userApiKey, maskDataUrl);
                setOutputImage(resultUrl);

            } else {
                // Whole image editing logic
                const finalPrompt = `Dựa trên hình ảnh được cung cấp, hãy thực hiện chỉnh sửa sau: "${prompt}". Điều cực kỳ quan trọng là phải duy trì phong cách của hình ảnh gốc, bao gồm phông chữ, màu sắc, chất liệu, và bố cục tổng thể. Các thay đổi phải liền mạch và trông tự nhiên.`;
                const [resultUrl] = await geminiService.generateArtwork(finalPrompt, aspectRatio, [sourceImage], 1, userApiKey);
                setOutputImage(resultUrl);
            }
            showStatus('Image edited successfully!', 'ok');
            setActiveMobileTab('result'); // Switch to result tab on mobile
        } catch (error: any)
            {
            console.error('Image editing failed:', error);
            showStatus(error.message || 'Image editing failed.', 'err');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadOutput = () => {
        if (outputImage) {
            downloadDataUrl(outputImage, `edited-image-${Date.now()}.png`);
        }
    };

    if (!isOpen) return null;

    const SourcePanel = (
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-3 h-full overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-200 flex-shrink-0">1. Source Image</h3>
            
            <div 
                onDragEnter={(e) => handleDragEvent(e, true)}
                onDragOver={(e) => handleDragEvent(e, true)}
                onDragLeave={(e) => handleDragEvent(e, false)}
                onDrop={handleDrop}
                className={`relative group flex-1 min-h-[180px] md:min-h-[300px] border-2 border-dashed rounded-xl flex items-center justify-center transition-all duration-300 ${isDragging ? 'border-blue-500 bg-blue-500/10 scale-105' : 'border-white/20'}`}
            >
                {sourceImage ? (
                    <>
                        <img ref={imageRef} src={sourceImage} alt="Source" className="max-w-full max-h-full object-contain rounded-md p-1" />
                         <canvas 
                            ref={canvasRef}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            className="absolute top-0 left-0 cursor-crosshair opacity-70"
                            style={{ touchAction: 'none' }}
                        />
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                            <Button variant="ghost" className="!text-xs !px-2 !py-1" onClick={handleAddFromFile}>Change</Button>
                            <Button variant="warn" className="!text-xs !px-2 !py-1" onClick={handleRemoveImage}>Remove</Button>
                        </div>
                    </>
                ) : (
                    <div className="text-center text-gray-400 p-4 flex flex-col items-center">
                        <UploadIcon />
                        <p className="font-bold text-lg text-gray-300">{isDragging ? 'Drop to Upload!' : 'Upload an Image'}</p>
                        <p className="text-sm">Drag & drop, paste, or browse your files.</p>
                        <div className="flex items-center gap-3 mt-4">
                            <Button variant="ghost" onClick={handleAddFromFile}>Browse</Button>
                            <Button variant="ghost" onClick={handlePaste}>Paste</Button>
                        </div>
                    </div>
                )}
            </div>
            
            {sourceImage && (
                <div className="flex-shrink-0 flex items-center gap-4 p-2 bg-black/20 rounded-lg">
                    <label className="text-sm text-gray-400">Brush:</label>
                    <input 
                        type="range" min="10" max="150" value={brushSize}
                        onChange={e => setBrushSize(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer" 
                        disabled={isLoading}
                    />
                    <Button variant="ghost" onClick={handleUndo} disabled={isLoading || maskHistory.length === 0} className="!text-xs !px-2 !py-1">Undo</Button>
                    <Button variant="ghost" onClick={handleClearMask} disabled={isLoading || maskHistory.length === 0} className="!text-xs !px-2 !py-1">Clear</Button>
                </div>
            )}

            <div className="flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-200 mb-2">2. Edit Instruction</h3>
                <TextArea
                    placeholder={maskHistory.length > 0 ? "Describe what to draw in the masked area..." : "e.g., Change the date to 'Dec 25, 2024'"}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="h-24"
                    disabled={!sourceImage || isLoading}
                />
            </div>

            <div className="mt-auto flex-shrink-0 hidden md:block">
                <Button 
                    onClick={handleGenerate} 
                    disabled={isLoading || !sourceImage || !prompt.trim()}
                    className="w-full text-base py-3"
                >
                    {isLoading ? <><Spinner className="mr-2" /> Generating...</> : '✨ Generate Edit'}
                </Button>
            </div>
        </div>
    );

    const ResultPanel = (
         <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center h-full">
            <div className="relative group w-full h-full rounded-lg bg-[repeating-conic-gradient(#1a1a2e_0%_25%,#2a2a44_0%_50%)] bg-[0_0/20px_20px] flex items-center justify-center overflow-hidden">
               {isLoading ? (
                   <div className="text-center text-gray-300 flex flex-col items-center animate-fade-in">
                       <Spinner className="w-10 h-10" />
                       <p className="mt-4 text-lg font-semibold">The AI is working its magic...</p>
                       <p className="text-sm text-gray-400">This may take a moment.</p>
                   </div>
               ) : outputImage ? (
                    <>
                        <img src={outputImage} alt="Output" className="max-w-full max-h-full object-contain rounded-md animate-fade-in" />
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                            <Button variant="primary" onClick={handleDownloadOutput}>Download</Button>
                        </div>
                    </>
               ) : (
                    <div className="text-center text-gray-400 flex flex-col items-center">
                        <MagicWandIcon />
                        <p className="font-bold text-lg text-gray-300">Edited Image</p>
                        <p className="text-sm">Your result will appear here.</p>
                    </div>
               )}
            </div>
        </div>
    );

    return (
        <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-lg animate-fade-in"
            onClick={handleClose}
        >
            <div
                className="bg-[#0d0c1c]/90 border border-white/20 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl shadow-black/50"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                    <h2 className="text-2xl font-bold">Image Editor</h2>
                    <Button variant="ghost" onClick={handleClose} className="!px-3 !py-1 text-xl">✕</Button>
                </header>

                {/* ===== DESKTOP LAYOUT ===== */}
                <main className="hidden md:grid flex-1 md:grid-cols-2 gap-6 p-6 min-h-0">
                    {SourcePanel}
                    {ResultPanel}
                </main>

                {/* ===== MOBILE LAYOUT ===== */}
                <main className="flex md:hidden flex-col flex-1 p-4 gap-4 min-h-0">
                    {/* Mobile Tabs */}
                    <div className="flex-shrink-0 flex items-center gap-2 p-1 bg-black/20 rounded-lg">
                        <button 
                            onClick={() => setActiveMobileTab('source')}
                            className={`flex-1 p-2 rounded-md text-sm font-bold transition-colors ${activeMobileTab === 'source' ? 'bg-blue-500/30 text-white' : 'text-gray-400'}`}
                        >
                            Source
                        </button>
                        <button 
                            onClick={() => setActiveMobileTab('result')}
                            className={`flex-1 p-2 rounded-md text-sm font-bold transition-colors ${activeMobileTab === 'result' ? 'bg-blue-500/30 text-white' : 'text-gray-400'}`}
                        >
                            Result
                        </button>
                    </div>

                    {/* Mobile Content */}
                    <div className="flex-1 min-h-0 pb-16">
                         {activeMobileTab === 'source' && SourcePanel}
                         {activeMobileTab === 'result' && ResultPanel}
                    </div>
                </main>

                 {/* ===== MOBILE FOOTER ACTIONS ===== */}
                <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0d0c1c]/90 border-t border-white/10 backdrop-blur-sm p-3 z-10">
                     {activeMobileTab === 'source' ? (
                        <Button 
                            onClick={handleGenerate} 
                            disabled={isLoading || !sourceImage || !prompt.trim()}
                            className="w-full text-base py-3"
                        >
                            {isLoading ? <><Spinner className="mr-2" /> Generating...</> : '✨ Generate Edit'}
                        </Button>
                     ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="ghost" onClick={() => setActiveMobileTab('source')}>New Edit</Button>
                            <Button variant="primary" onClick={handleDownloadOutput} disabled={!outputImage}>Download</Button>
                        </div>
                     )}
                </footer>
            </div>
            <style>
                {`
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in { animation: fade-in 0.3s ease-out; }
                `}
            </style>
        </div>
    );
};

export default ImageEditor;