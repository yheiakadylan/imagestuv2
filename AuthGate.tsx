

import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from './contexts/AuthContext';
import App from './App';
import LoginPage from './components/LoginPage';
import SignUpPage from './components/SignUpPage';

const AuthGate: React.FC = () => {
    const auth = useContext(AuthContext);
    const [showSignUp, setShowSignUp] = useState(false);

    useEffect(() => {
        // Lock scrolling when the user is not logged in (showing login/signup)
        if (!auth.user) {
            document.body.style.overflow = 'hidden';
        } else {
            // Restore scrolling when the user is logged in
            document.body.style.overflow = '';
        }

        // Cleanup on unmount to restore default scroll behavior
        return () => {
            document.body.style.overflow = '';
        };
    }, [auth.user]);

    if (auth.isLoading) {
        return (
            <div className="w-screen h-screen bg-[#0d0c1c] flex flex-col items-center justify-center text-white relative overflow-hidden">
                <div className="absolute inset-0 -z-10 pointer-events-none">
                    <div className="absolute inset-[-25%] bg-[conic-gradient(from_0deg,#ff3eec,#ffd23f,#00d4ff,#7cffcb,#ff3eec)] opacity-10 blur-[72px] saturate-150 animate-[spin_18s_linear_infinite]"></div>
                </div>

                <div className="w-24 h-24 rounded-full relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 animate-spin-slow"></div>
                    <div className="absolute inset-1.5 rounded-full bg-[#0d0c1c]"></div>
                </div>
                
                <div className="mt-6 text-xl font-bold tracking-widest text-gray-300 animate-fade-in-out">
                    LOADINGGG...
                </div>
                
                <style>
                {`
                    @keyframes spin-slow {
                        to { transform: rotate(360deg); }
                    }
                    .animate-spin-slow {
                        animation: spin-slow 2.5s linear infinite;
                    }
                    @keyframes fade-in-out {
                        0%, 100% { opacity: 0.5; letter-spacing: 0.25em; }
                        50% { opacity: 1; letter-spacing: 0.35em; }
                    }
                    .animate-fade-in-out {
                        animation: fade-in-out 2s ease-in-out infinite;
                    }
                `}
                </style>
            </div>
        );
    }
    
    if (auth.user) {
        return <App />;
    }

    return showSignUp ? (
        <SignUpPage onNavigateToLogin={() => setShowSignUp(false)} />
    ) : (
        <LoginPage onNavigateToSignUp={() => setShowSignUp(true)} />
    );
};

export default AuthGate;