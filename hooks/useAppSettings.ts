import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { AppSettings } from '../types';

const SETTINGS_COLLECTION = 'app_settings';
const ANNOUNCEMENT_DOC_ID = 'announcement';

const defaultSettings: AppSettings = {
    announcementText: '',
    announcementEnabled: false,
};

export function useAppSettings() {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const docRef = doc(db, SETTINGS_COLLECTION, ANNOUNCEMENT_DOC_ID);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setSettings(docSnap.data() as AppSettings);
            } else {
                setSettings(defaultSettings);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching app settings:", error);
            setSettings(defaultSettings);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const updateAppSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
        const docRef = doc(db, SETTINGS_COLLECTION, ANNOUNCEMENT_DOC_ID);
        try {
            // Using setDoc with merge: true will create the doc if it doesn't exist, or update it if it does.
            await setDoc(docRef, newSettings, { merge: true });
        } catch (error) {
            console.error("Error updating app settings:", error);
            throw error;
        }
    }, []);

    return { settings, isLoading, updateAppSettings };
}
