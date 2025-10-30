import React, { useState, useMemo } from 'react';
import { Template, MockupPrompt, LogEntry, User } from '../types';
import Button from './common/Button';
import Select from './common/Select';
import TextArea from './common/TextArea';
import { MOCKUP_ASPECT_RATIOS } from '../constants';
import { useTemplates } from '../hooks/useTemplates';
import { downloadDataUrl, upscale2xDataURL } from '../utils/fileUtils';
import Spinner from './common/Spinner';
import ToggleSwitch from './common/ToggleSwitch';

interface MockupColumnProps {
    isLoading: boolean;
    progress: { done: number; total: number; label: string };
    results: LogEntry[];
    onGenerate: (prompts: MockupPrompt[], count: number, aspectRatio: string) => void;
    onCancel: () => void;
    onViewImage: (result: LogEntry, sourceEl: HTMLElement) => void;
    isUpscaled: boolean;
    onUpscaleChange: (enabled: boolean) => void;
    onSaveAllExpanded: () => void;
    user: User | null;
}

const MockupColumn: React.FC<MockupColumnProps> = ({
    isLoading, progress, results, onGenerate, onCancel, onViewImage,
    isUpscaled, onUpscaleChange, onSaveAllExpanded, user
}) => {
    const [prompts, setPrompts] = useState('');
    const [count, setCount] = useState(1);
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [sku, setSku] = useState('');
    const { templates: mockupTemplates } = useTemplates<Template>('TEMPLATES');
    
    const parsedPrompts = useMemo((): MockupPrompt[] =>
        prompts.split('\n').map(p => p.trim()).filter(Boolean).map(p => ({ id: `prompt-${Math.random()}`, prompt: p }))
    , [prompts]);

    const handleGenerateClick = () => {
        if (parsedPrompts.length > 0) {
            onGenerate(parsedPrompts, count, aspectRatio);
        } else {
            alert('Please enter at least one mockup prompt.');
        }
    };
    
    const handleSaveAll = async () => {
        if (!sku) {
            alert("Please enter a SKU first.");
            return;
        }
        const validResults = results.filter(r => r.dataUrl && r.type === 'mockup');
        if (validResults.length === 0) {
            alert("No mockups to save.");
            return;
        }
        for (let i = 0; i < validResults.length; i++) {
            const result = validResults[i];
            const dataToSave = isUpscaled ? await upscale2xDataURL(result.dataUrl) : result.dataUrl;
            downloadDataUrl(dataToSave, `${sku}-${i + 1}.png`);
            await new Promise(res => setTimeout(res, 100));
        }
    };
    
    const mockupResults = useMemo(() => {
        return [...results].filter(r => r.type === 'mockup').sort((a, b) => b.createdAt - a.createdAt);
    }, [results]);

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex flex-col min-h-0 backdrop-blur-lg h-full">
            {/* ===== CONTROLS PANEL ===== */}
            <div className="flex-shrink-0">
                <h2 className="text-lg font-bold mb-2">Generate Mockups</h2>
                <div className="grid grid-cols-3 gap-4 mb-2">
                    <Select onChange={(e) => setPrompts(e.target.value)}>
                        <option value="">— Use Template —</option>
                        {mockupTemplates.map(t => <option key={t.id} value={t.prompt}>{t.name}</option>)}
                    </Select>
                    <Select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}>
                        {MOCKUP_ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                    </Select>
                    <Select value={count} onChange={e => setCount(Number(e.target.value))}>
                        {[1, 2, 4, 8].map(n => <option key={n} value={n}>{n}</option>)}
                    </Select>
                </div>
                <TextArea placeholder="Describe background/placement... (1 line = 1 prompt)" value={prompts} onChange={e => setPrompts(e.target.value)} />
                <div className="mt-2">
                    <label className="text-sm text-gray-400 mb-1 block">SKU</label>
                    <input type="text" value={sku} onChange={e => setSku(e.target.value)} placeholder="ABC-001" className="w-full p-2.5 rounded-lg border border-white/20 bg-black/20 text-gray-200 outline-none"/>
                </div>
                
                <div className="mt-4">
                    {isLoading ? (
                        <div className="h-11 bg-black/20 rounded-xl flex items-center justify-between p-2 border border-white/10 relative overflow-hidden">
                            <div 
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500/30 to-cyan-400/30 transition-all duration-300" 
                                style={{ width: `${(progress.total > 0 ? progress.done / progress.total : 0) * 100}%` }}
                            ></div>
                            <div className="flex items-center gap-2 text-sm text-gray-300 z-10">
                                <Spinner />
                                <span>{progress.label} ({progress.done}/{progress.total})</span>
                            </div>
                            <Button variant="warn" onClick={onCancel} className="!py-1 !px-3 !text-sm z-10">Cancel</Button>
                        </div>
                    ) : (
                        <Button onClick={handleGenerateClick} disabled={parsedPrompts.length === 0} className="w-full text-base py-3">
                            Generate
                        </Button>
                    )}
                </div>
            </div>
            
            {/* ===== RESULTS TOOLBAR (Conditional) ===== */}
            {mockupResults.length > 0 && !isLoading && (
                <div className="flex-shrink-0 flex items-center gap-3 mt-4 p-2 bg-black/20 rounded-lg border border-white/10">
                    <ToggleSwitch enabled={isUpscaled} onChange={onUpscaleChange} label="Scale x2"/>
                    <div className="ml-auto flex items-center gap-2">
                        <Button variant="ghost" onClick={handleSaveAll} disabled={!sku} className="!text-sm !py-1.5">Save All</Button>
                        <Button variant="ghost" onClick={onSaveAllExpanded} className="!text-sm !py-1.5">Save All Expanded</Button>
                    </div>
                </div>
            )}


            <div className="flex-1 min-h-0 mt-4 overflow-hidden">
                <div className="h-full flex overflow-x-auto snap-x snap-mandatory gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:overflow-y-auto pr-1">
                    {mockupResults.map(result => (
                        <div 
                            key={result.id} 
                            id={`log-item-${result.id}`}
                            className="snap-center flex-shrink-0 w-[70%] sm:w-[45%] md:w-auto aspect-square rounded-xl bg-[repeating-conic-gradient(#1a1a2e_0%_25%,#2a2a44_0%_50%)] bg-[0_0/20px_20px] border border-white/20 flex items-center justify-center p-1 group relative cursor-zoom-in"
                            onClick={(e) => onViewImage(result, e.currentTarget)}
                        >
                            {result.error ? (
                                <p className="text-red-400 text-xs text-center p-2">{result.error}</p>
                            ) : (
                                <>
                                    <img
                                        src={result.dataUrl}
                                        alt="Generated mockup"
                                        className="max-w-full max-h-full object-contain rounded-lg pointer-events-none"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg pointer-events-none">
                                        <p className="font-bold">View Details</p>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MockupColumn;