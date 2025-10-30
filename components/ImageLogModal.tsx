import React, { useState, useMemo, useEffect, MouseEvent } from 'react';
import { LogEntry, Status, User } from '../types';
import Button from './common/Button';
import { downloadDataUrl } from '../utils/fileUtils';
import Select from './common/Select';
import CachedImage from './common/CachedImage';
import Spinner from './common/Spinner';

interface ImageLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    results: LogEntry[];
    onDelete: (ids: string[]) => void;
    showStatus: (message: string, type: Status['type'], duration?: number) => void;
    user: User | null;
    allUsers: User[];
}

const ImageLogModal: React.FC<ImageLogModalProps> = ({ isOpen, onClose, results, onDelete, showStatus, user, allUsers }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedUserId, setSelectedUserId] = useState('all');
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedIds(new Set());
            setLastSelectedId(null); 
        }
    }, [selectedUserId, isOpen]);

    const filteredResults = useMemo(() => {
        if (user?.role === 'admin' && selectedUserId !== 'all') {
            return results.filter(result => result.ownerUid === selectedUserId);
        }
        return results;
    }, [results, user, selectedUserId]);

    const allSelected = useMemo(() => 
        filteredResults.length > 0 && selectedIds.size === filteredResults.length,
        [selectedIds.size, filteredResults.length]
    );

    if (!isOpen) return null;

    const handleToggleSelect = (id: string, event: MouseEvent<HTMLDivElement>) => {
        const newSelectedIds = new Set(selectedIds);

        if (event.shiftKey && lastSelectedId) {
            const lastIndex = filteredResults.findIndex(r => r.id === lastSelectedId);
            const currentIndex = filteredResults.findIndex(r => r.id === id);

            if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex);
                const end = Math.max(lastIndex, currentIndex);
                for (let i = start; i <= end; i++) {
                    newSelectedIds.add(filteredResults[i].id);
                }
            } else {
                if (newSelectedIds.has(id)) newSelectedIds.delete(id);
                else newSelectedIds.add(id);
            }
        } else {
            if (newSelectedIds.has(id)) newSelectedIds.delete(id);
            else newSelectedIds.add(id);
        }
        
        setSelectedIds(newSelectedIds);
        setLastSelectedId(id);
    };

    const handleDeleteSelected = async () => {
        const count = selectedIds.size;
        if (count === 0) return;
        if (window.confirm(`Are you sure you want to delete ${count} image(s)? This will also delete them from storage and cannot be undone.`)) {
            setIsDeleting(true);
            try {
                await onDelete(Array.from(selectedIds));
                showStatus(`${count} image(s) deleted.`, 'ok');
                setSelectedIds(new Set());
            } catch (error: any) {
                showStatus(`Error deleting images: ${error.message}`, 'err', 5000);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const handleDownloadSelected = () => {
        if (selectedIds.size === 0) return;
        results.forEach(result => {
            if (selectedIds.has(result.id) && result.dataUrl) {
                downloadDataUrl(result.dataUrl, `${result.type}-${result.id}.png`);
            }
        });
    };

    const handleToggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredResults.map(r => r.id)));
        }
    };


    return (
        <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-lg animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-gray-900/80 border border-white/20 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-white/10 flex-wrap gap-y-2">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold">Image Log</h2>
                        {user?.role === 'admin' && (
                             <div className="items-center gap-2 hidden md:flex">
                                <label htmlFor="user-filter" className="text-sm text-gray-400 flex-shrink-0">Filter:</label>
                                <Select
                                    id="user-filter"
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    className="!py-1.5 !px-3 text-sm !w-auto"
                                >
                                    <option value="all">All Users</option>
                                    {allUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.username}</option>
                                    ))}
                                </Select>
                            </div>
                        )}
                    </div>
                     {/* --- DESKTOP ACTIONS --- */}
                    <div className="hidden md:flex items-center gap-3 flex-wrap">
                        <Button variant="ghost" onClick={handleToggleSelectAll} disabled={filteredResults.length === 0}>
                            {allSelected ? 'Deselect All' : 'Select All'}
                        </Button>
                        <Button variant="ghost" onClick={handleDownloadSelected} disabled={selectedIds.size === 0}>
                            Download ({selectedIds.size})
                        </Button>
                        <Button variant="warn" onClick={handleDeleteSelected} disabled={isDeleting || selectedIds.size === 0}>
                            {isDeleting ? <><Spinner className="mr-2"/> Deleting...</> : `Delete (${selectedIds.size})`}
                        </Button>
                        <Button variant="ghost" onClick={onClose} className="!px-3 !py-1">✕</Button>
                    </div>
                    {/* --- MOBILE ACTIONS --- */}
                     <div className="flex md:hidden items-center gap-3">
                        <Button variant="ghost" onClick={handleToggleSelectAll} disabled={filteredResults.length === 0}>
                            {allSelected ? 'Deselect All' : 'Select All'}
                        </Button>
                        <Button variant="ghost" onClick={onClose} className="!px-3 !py-1">✕</Button>
                    </div>
                </header>
                
                 {/* Admin Filter on Mobile */}
                {user?.role === 'admin' && (
                     <div className="flex md:hidden items-center gap-2 p-4 pt-2 border-b border-white/10">
                        <label htmlFor="user-filter-mobile" className="text-sm text-gray-400 flex-shrink-0">Filter:</label>
                        <Select
                            id="user-filter-mobile"
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="!py-1.5 !px-3 text-sm flex-1"
                        >
                            <option value="all">All Users</option>
                            {allUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.username}</option>
                            ))}
                        </Select>
                    </div>
                )}


                <main className="flex-1 overflow-y-auto p-4 md:pb-4 pb-24">
                    {filteredResults.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">No images have been generated for the selected filter.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                            {filteredResults.map(result => (
                                <div 
                                    key={result.id} 
                                    className={`relative aspect-square rounded-lg overflow-hidden bg-white/5 cursor-pointer group ${selectedIds.has(result.id) ? 'ring-4 ring-blue-500' : ''}`}
                                    onClick={(e) => handleToggleSelect(result.id, e)}
                                >
                                    {result.dataUrl ? (
                                        <CachedImage src={result.dataUrl} alt={result.prompt} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-center p-2 text-red-400 text-xs">
                                            <p>Error: {result.error}</p>
                                        </div>
                                    )}
                                    <div className="absolute top-2 left-2 text-xs font-bold px-1.5 py-0.5 rounded-md bg-black/60 capitalize">
                                        {result.type}
                                    </div>
                                    <div className="absolute top-2 right-2 w-5 h-5 rounded-md border-2 border-white bg-black/50 flex items-center justify-center">
                                        {selectedIds.has(result.id) && <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>

                {/* --- MOBILE FOOTER ACTIONS --- */}
                {selectedIds.size > 0 && (
                     <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0d0c1c]/90 border-t border-white/10 backdrop-blur-sm p-3 z-10 flex items-center justify-between animate-fade-in">
                        <span className="font-semibold">{selectedIds.size} selected</span>
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" onClick={handleDownloadSelected}>Download</Button>
                            <Button variant="warn" onClick={handleDeleteSelected} disabled={isDeleting}>
                                {isDeleting ? <Spinner /> : 'Delete'}
                            </Button>
                        </div>
                    </footer>
                )}
            </div>
             <style>
                {`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.2s ease-out; }
                `}
            </style>
        </div>
    );
};

export default ImageLogModal;