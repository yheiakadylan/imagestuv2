import React, { useState, useMemo, useEffect } from 'react';
import { Job } from '../types';
import Button from './common/Button';
import Spinner from './common/Spinner';
import CachedImage from './common/CachedImage';
import ProgressBar from './common/ProgressBar';
import { downloadDataUrl, upscale2xDataURL } from '../utils/fileUtils';

interface QueueManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    jobs: Job[];
    onCancelJob: (jobId: string) => void;
    onClearCompleted: () => void;
    isUpscaled: boolean;
}

const statusStyles: { [key in Job['status']]: { text: string; color: string } } = {
    queued: { text: 'Queued', color: 'text-gray-400' },
    running: { text: 'Running...', color: 'text-blue-400' },
    completed: { text: 'Completed', color: 'text-green-400' },
    cancelled: { text: 'Cancelled', color: 'text-yellow-500' },
    error: { text: 'Error', color: 'text-red-500' },
};

const JobItem: React.FC<{ job: Job; onCancel: () => void; isCancelling: boolean }> = ({ job, onCancel, isCancelling }) => {
    const status = statusStyles[job.status];
    const progressPercentage = job.progress.total > 0 ? (job.progress.done / job.progress.total) * 100 : 0;
    const isRunning = job.status === 'running';

    return (
        <div className={`bg-black/20 p-3 rounded-lg flex items-center gap-4 transition-all duration-300 ${isRunning ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20' : ''}`}>
            <div className="w-16 h-16 flex-shrink-0 rounded-md bg-black/30 overflow-hidden">
                <CachedImage src={job.artworkUrl} alt={`Artwork for ${job.sku}`} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{job.sku || 'Untitled Job'}</p>
                {isRunning ? (
                    <div className="space-y-1">
                         <p className={`text-sm font-semibold ${status.color}`}>
                            Running: {job.progress.done} / {job.progress.total} images
                         </p>
                         <ProgressBar value={progressPercentage} />
                    </div>
                ) : (
                     <div>
                        <p className={`text-sm font-semibold ${status.color}`}>{status.text}</p>
                        <p className="text-xs text-gray-400">{job.progress.total} images in queue</p>
                     </div>
                )}
            </div>
            {(job.status === 'queued' || job.status === 'running') && (
                <Button variant="warn" onClick={onCancel} className="!text-xs !px-2 !py-1 w-[70px] flex justify-center" disabled={isCancelling}>
                    {isCancelling ? <Spinner className="w-4 h-4" /> : 'Cancel'}
                </Button>
            )}
        </div>
    );
};

const CompletedJobItem: React.FC<{ job: Job; isUpscaled: boolean }> = ({ job, isUpscaled }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleDownloadAll = async () => {
        const validResults = job.results.filter(r => r.dataUrl);
        if (validResults.length === 0 && !job.artworkUrl) return;

        // 1. Download the artwork
        if (job.artworkUrl) {
            const artworkToSave = isUpscaled ? await upscale2xDataURL(job.artworkUrl) : job.artworkUrl;
            const artworkFilename = `${job.sku || 'job'}-artwork.png`;
            downloadDataUrl(artworkToSave, artworkFilename);
            await new Promise(res => setTimeout(res, 100)); // Stagger downloads
        }

        // 2. Download the generated mockups
        for (let i = 0; i < validResults.length; i++) {
            const result = validResults[i];
            const dataToSave = isUpscaled ? await upscale2xDataURL(result.dataUrl) : result.dataUrl;
            const mockupFilename = `${job.sku || 'job'}-mockup-${i + 1}.png`;
            downloadDataUrl(dataToSave, mockupFilename);
            await new Promise(res => setTimeout(res, 100));
        }
    };

    const validMockups = job.results.filter(r => r.dataUrl);
    const downloadCount = validMockups.length + (job.artworkUrl ? 1 : 0);
    
    return (
         <div className="bg-black/20 rounded-lg">
             <div className="p-3 flex items-center gap-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <div className="w-16 h-16 flex-shrink-0 rounded-md bg-black/30 overflow-hidden">
                    <CachedImage src={job.artworkUrl} alt={`Artwork for ${job.sku}`} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{job.sku || 'Untitled Job'}</p>
                    <p className={`text-sm font-semibold ${statusStyles[job.status].color}`}>{statusStyles[job.status].text}</p>
                    <p className="text-xs text-gray-400">{job.results.length} mockup(s) generated</p>
                </div>
                <div className="text-gray-400 transition-transform" style={{transform: isExpanded ? 'rotate(180deg)' : 'none'}}>
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </div>
             </div>
             {isExpanded && (
                <div className="border-t border-white/10 p-3">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-64 overflow-y-auto">
                        {job.results.map(result => (
                            <div key={result.id} className="aspect-square rounded-md bg-black/30 overflow-hidden">
                                {result.dataUrl ? (
                                    <CachedImage src={result.dataUrl} alt={result.prompt} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center p-1 text-center text-red-500 text-xs">{result.error || 'Failed'}</div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 text-right">
                        <Button onClick={handleDownloadAll} disabled={downloadCount === 0}>
                            Download All ({downloadCount})
                        </Button>
                    </div>
                </div>
             )}
         </div>
    );
};


const QueueManagerModal: React.FC<QueueManagerModalProps> = ({ isOpen, onClose, jobs, onCancelJob, onClearCompleted, isUpscaled }) => {
    const [activeTab, setActiveTab] = useState<'queue' | 'completed'>('queue');
    const [cancellingJobId, setCancellingJobId] = useState<string | null>(null);
    const [isClearing, setIsClearing] = useState(false);
    
    useEffect(() => {
        // Reset cancelling spinner if the job status changes to a non-cancellable state
        if (cancellingJobId) {
            const job = jobs.find(j => j.id === cancellingJobId);
            if (!job || (job.status !== 'queued' && job.status !== 'running')) {
                setCancellingJobId(null);
            }
        }
    }, [jobs, cancellingJobId]);
    
    const { queuedAndRunningJobs, completedJobs } = useMemo(() => {
        const queuedAndRunningJobs = jobs.filter(j => j.status === 'queued' || j.status === 'running').sort((a,b) => a.createdAt - b.createdAt);
        const completedJobs = jobs.filter(j => j.status !== 'queued' && j.status !== 'running').sort((a,b) => b.createdAt - a.createdAt);
        return { queuedAndRunningJobs, completedJobs };
    }, [jobs]);

    if (!isOpen) return null;

    const handleCancelWrapper = (jobId: string) => {
        setCancellingJobId(jobId);
        onCancelJob(jobId);
    };

    const handleClearClick = () => {
        if (window.confirm(`Are you sure you want to clear all ${completedJobs.length} completed jobs from the list? This cannot be undone.`)) {
            setIsClearing(true);
            // Use a timeout to ensure the user sees the loading state before the (fast) clear operation happens.
            setTimeout(() => {
                try {
                    onClearCompleted();
                } finally {
                    // Another timeout to give a feeling of operation before removing the spinner
                    setTimeout(() => setIsClearing(false), 500);
                }
            }, 50);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-lg animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-gray-900/80 border border-white/20 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-2xl font-bold">Queue Manager</h2>
                    <Button variant="ghost" onClick={onClose} className="!px-3 !py-1">✕</Button>
                </header>

                <div className="flex-shrink-0 border-b border-white/10 p-2 flex items-center justify-between">
                    <div className="flex gap-2">
                        <Button variant={activeTab === 'queue' ? 'primary' : 'ghost'} onClick={() => setActiveTab('queue')}>
                            In Progress & Queued ({queuedAndRunningJobs.length})
                        </Button>
                        <Button variant={activeTab === 'completed' ? 'primary' : 'ghost'} onClick={() => setActiveTab('completed')}>
                            Completed ({completedJobs.length})
                        </Button>
                    </div>
                    {activeTab === 'completed' && completedJobs.length > 0 && (
                        <Button 
                            variant="warn" 
                            onClick={handleClearClick} 
                            className="!text-xs !px-2 !py-1 w-[140px] flex justify-center"
                            disabled={isClearing}
                        >
                            {isClearing ? <Spinner className="mr-2"/> : 'Clear All Completed'}
                        </Button>
                    )}
                </div>

                <main className="flex-1 overflow-y-auto p-4">
                    {activeTab === 'queue' && (
                        <div className="space-y-3">
                             {queuedAndRunningJobs.length > 0 ? (
                                queuedAndRunningJobs.map(job => <JobItem 
                                    key={job.id} 
                                    job={job} 
                                    onCancel={() => handleCancelWrapper(job.id)}
                                    isCancelling={cancellingJobId === job.id}
                                />)
                             ) : (
                                <p className="text-center text-gray-400 py-8">The queue is empty.</p>
                             )}
                        </div>
                    )}
                    {activeTab === 'completed' && (
                         <div className="space-y-3">
                             {completedJobs.length > 0 ? (
                                completedJobs.map(job => <CompletedJobItem key={job.id} job={job} isUpscaled={isUpscaled} />)
                             ) : (
                                <p className="text-center text-gray-400 py-8">No jobs have been completed yet.</p>
                             )}
                        </div>
                    )}
                </main>
            </div>
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

export default QueueManagerModal;