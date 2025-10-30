import React, { useState, useContext, useMemo } from 'react';
import Button from './common/Button';
import UserManagementPanel from './UserManagementPanel';
import ApiKeyPanel from './settings/ApiKeyPanel';
import PromptTemplatePanel from './settings/PromptTemplatePanel';
import ImageTemplatePanel from './settings/ImageTemplatePanel';
import CutTemplatePanel from './settings/CutTemplatePanel';
import AnnouncementPanel from './settings/AnnouncementPanel';
import { ArtRef, CutTemplate, Sample, Template } from '../types';
import { AuthContext } from '../contexts/AuthContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'api' | 'prompts' | 'samples' | 'refs' | 'cuts' | 'users' | 'announcement';

const ALL_TABS: { id: Tab, label: string, adminOnly: boolean, managerOrAdmin: boolean }[] = [
    { id: 'announcement', label: 'Announcement', adminOnly: true, managerOrAdmin: false },
    { id: 'api', label: 'API Keys', adminOnly: true, managerOrAdmin: false },
    { id: 'users', label: 'User Management', adminOnly: true, managerOrAdmin: false },
    { id: 'prompts', label: 'Mockup Prompts', adminOnly: false, managerOrAdmin: true },
    { id: 'samples', label: 'Product Samples', adminOnly: false, managerOrAdmin: true },
    { id: 'refs', label: 'Art References', adminOnly: false, managerOrAdmin: true },
    { id: 'cuts', label: 'Cut Templates', adminOnly: false, managerOrAdmin: true },
];

const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);


const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const auth = useContext(AuthContext);

    const availableTabs = useMemo(() => {
        if (auth.user?.role === 'admin') return ALL_TABS;
        if (auth.user?.role === 'manager') return ALL_TABS.filter(t => t.managerOrAdmin);
        return [];
    }, [auth.user?.role]);
    
    const [activeTab, setActiveTab] = useState<Tab>(availableTabs[0]?.id || 'api');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Effect to reset tab if it becomes unavailable
    React.useEffect(() => {
        if (isOpen && !availableTabs.find(t => t.id === activeTab)) {
            setActiveTab(availableTabs[0]?.id);
        }
    }, [isOpen, availableTabs, activeTab]);

    if (!isOpen) return null;

    const renderContent = () => {
        switch (activeTab) {
            case 'announcement': return auth.user?.role === 'admin' ? <AnnouncementPanel /> : null;
            case 'api': return auth.user?.role === 'admin' ? <ApiKeyPanel /> : null;
            case 'users': return auth.user?.role === 'admin' ? <UserManagementPanel /> : null;
            case 'prompts': return <PromptTemplatePanel />;
            case 'samples': return <ImageTemplatePanel<Sample> storageKey="SAMPLE_TEMPLATES" title="Product Samples" />;
            case 'refs': return <ImageTemplatePanel<ArtRef> storageKey="ARTREF_TEMPLATES" title="Artwork References" />;
            case 'cuts': return <CutTemplatePanel />;
            default: return null;
        }
    }
    
    const activeTabLabel = availableTabs.find(t => t.id === activeTab)?.label || 'Settings';

    return (
        <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-lg animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-gray-900/80 border border-white/20 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-2xl font-bold">Settings</h2>
                    <Button variant="ghost" onClick={onClose} className="!px-3 !py-1">✕</Button>
                </header>

                {/* --- DESKTOP LAYOUT --- */}
                <div className="hidden md:flex flex-1 min-h-0">
                    <aside className="w-1/4 p-4 border-r border-white/10 flex flex-col gap-2">
                        {availableTabs.map(tab => (
                             <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full text-left p-3 rounded-lg transition-colors text-sm ${
                                    activeTab === tab.id ? 'bg-blue-500/30 text-white' : 'hover:bg-white/10 text-gray-300'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </aside>
                    <main className="w-3/4 overflow-y-auto p-6">
                        {renderContent()}
                    </main>
                </div>

                {/* --- MOBILE LAYOUT --- */}
                <div className="flex flex-col md:hidden flex-1 min-h-0 p-4 gap-4">
                     {/* Mobile Tab Selector Dropdown */}
                    <div className="relative flex-shrink-0">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="w-full flex items-center justify-between p-3 rounded-lg bg-white/10 border border-white/20 text-white"
                            aria-haspopup="true"
                            aria-expanded={isMobileMenuOpen}
                        >
                            <span>{activeTabLabel}</span>
                            <ChevronDownIcon />
                        </button>
                        {isMobileMenuOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-white/20 rounded-lg z-10 p-2 shadow-2xl">
                                {availableTabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`w-full text-left p-2 rounded-md transition-colors ${activeTab === tab.id ? 'bg-blue-500/30 font-semibold' : 'hover:bg-white/10'}`}
                                        role="menuitem"
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Mobile Content Area */}
                    <main className="flex-1 overflow-y-auto">
                        {renderContent()}
                    </main>
                </div>

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

export default SettingsModal;