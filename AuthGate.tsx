

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
            <div className="w-screen h-screen bg-[#0d0c1c] flex items-center justify-center text-white">
                Loading...
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
