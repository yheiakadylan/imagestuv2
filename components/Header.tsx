import React, { useContext, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import Button from './common/Button';

interface HeaderProps {
    onSettingsClick: () => void;
    onImageLogClick: () => void;
    onImageEditorClick: () => void;
}

const HamburgerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
    </svg>
);

const Header: React.FC<HeaderProps> = ({ onSettingsClick, onImageLogClick, onImageEditorClick }) => {
    const auth = useContext(AuthContext);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleMenuClick = (action: () => void) => {
        action();
        setIsMenuOpen(false);
    };

    return (
        <header className="relative flex-shrink-0 flex items-center justify-between p-3 bg-black/10 border-b border-white/10 backdrop-blur-sm z-50">
            <div className="text-xl font-black bg-gradient-to-r from-pink-500 via-yellow-400 to-cyan-400 bg-clip-text text-transparent">
                AI Image Studio
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
                <span className="text-sm text-gray-300">Welcome, {auth.user?.username || 'User'}! </span>
                <Button variant="ghost" onClick={onImageEditorClick}>
                    Image Editor
                </Button>
                <Button variant="ghost" onClick={onImageLogClick}>
                    Image Log
                </Button>
                {(auth.user?.role === 'admin' || auth.user?.role === 'manager') && (
                    <Button variant="ghost" onClick={onSettingsClick}>
                        Settings
                    </Button>
                )}
                <Button variant="ghost" onClick={auth.logout}>
                    Logout
                </Button>
            </div>
            
            {/* Mobile Hamburger Button */}
            <div className="md:hidden">
                <Button variant="ghost" onClick={() => setIsMenuOpen(!isMenuOpen)} className="!p-2">
                    <HamburgerIcon />
                </Button>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMenuOpen && (
                <div 
                    className="absolute top-full right-3 mt-2 w-56 bg-gray-900/90 border border-white/20 rounded-xl backdrop-blur-lg shadow-2xl animate-fade-in-fast"
                >
                    <div className="p-2 flex flex-col gap-1">
                         <span className="px-2 py-1 text-sm text-center text-gray-400 border-b border-white/10 mb-1">
                            Welcome, {auth.user?.username || 'User'}!
                         </span>
                         <Button variant="ghost" onClick={() => handleMenuClick(onImageEditorClick)}>Image Editor</Button>
                         <Button variant="ghost" onClick={() => handleMenuClick(onImageLogClick)}>Image Log</Button>
                         {(auth.user?.role === 'admin' || auth.user?.role === 'manager') && (
                            <Button variant="ghost" onClick={() => handleMenuClick(onSettingsClick)}>Settings</Button>
                         )}
                         <Button variant="ghost" onClick={() => { auth.logout(); setIsMenuOpen(false); }}>Logout</Button>
                    </div>
                </div>
            )}
            <style>
                {`
                @keyframes fade-in-fast {
                    from { opacity: 0; transform: translateY(-10px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-fade-in-fast { animation: fade-in-fast 0.15s ease-out; }
                `}
            </style>
        </header>
    );
};

export default Header;
