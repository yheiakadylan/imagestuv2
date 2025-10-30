import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import AuthGate from './AuthGate';
import { AppSettingsProvider } from './contexts/AppSettingsContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <AppSettingsProvider>
        <AuthGate />
      </AppSettingsProvider>
    </AuthProvider>
  </React.StrictMode>
);