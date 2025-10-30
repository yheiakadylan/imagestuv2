import React, { createContext, ReactNode } from 'react';
import { useAppSettings } from '../hooks/useAppSettings';
import { AppSettings } from '../types';

interface AppSettingsContextType {
    settings: AppSettings | null;
    isLoading: boolean;
    updateAppSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
}

export const AppSettingsContext = createContext<AppSettingsContextType>({
    settings: null,
    isLoading: true,
    updateAppSettings: async () => {},
});

export const AppSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { settings, isLoading, updateAppSettings } = useAppSettings();
    
    const value = { settings, isLoading, updateAppSettings };

    return (
        <AppSettingsContext.Provider value={value}>
            {children}
        </AppSettingsContext.Provider>
    );
};
