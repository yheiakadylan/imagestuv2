import { useState, useEffect, useCallback } from 'react';
import { LogEntry, User } from '../types';
import { db } from '../services/firebase'; 
import {
    collection,
    query,
    orderBy,
    getDocs,
    Timestamp,
    doc,
    setDoc,
    writeBatch,
    where,
} from 'firebase/firestore';
import { uploadDataUrlToStorage, deleteFromCloudinary } from '../utils/fileUtils';
import { saveImage } from '../services/cacheService';


const COLLECTION_NAME = 'generation_log';

export function useImageLog(user: User | null) {
    const [log, setLog] = useState<LogEntry[]>([]);

    useEffect(() => {
        async function loadLog() {
            if (!user) {
                setLog([]);
                return;
            }
            try {
                let q;
                if (user.role === 'admin') {
                    q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
                } else {
                    q = query(
                        collection(db, COLLECTION_NAME),
                        where('ownerUid', '==', user.id),
                        orderBy('createdAt', 'desc')
                    );
                }

                const querySnapshot = await getDocs(q);
                const storedLog = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    const createdAt = data.createdAt instanceof Timestamp
                        ? data.createdAt.toMillis()
                        : data.createdAt;
                    return { ...data, id: doc.id, createdAt } as LogEntry;
                });
                setLog(storedLog);
            } catch (e) {
                console.error("Failed to load image log from Firestore", e);
                setLog([]);
            }
        }
        loadLog();
    }, [user]);

    const addResultToLog = useCallback(async (result: Omit<LogEntry, 'ownerUid' | 'publicId'>) => {
        if (!user) {
            console.error("Cannot add log entry without a logged-in user.");
            return;
        }

        try {
            const storagePath = `generation_log/${result.id}.png`;
            const { downloadUrl, publicId } = await uploadDataUrlToStorage(result.dataUrl, storagePath);
            
            // Prime the cache in the background
            saveImage(downloadUrl, result.dataUrl).catch(err => console.warn('Failed to prime log image cache:', err));

            const resultForFirestore: LogEntry = {
                ...result,
                dataUrl: downloadUrl,
                publicId: publicId,
                ownerUid: user.id
            };

            await setDoc(doc(db, COLLECTION_NAME, result.id), resultForFirestore);
            setLog(prevLog => [resultForFirestore, ...prevLog].sort((a, b) => b.createdAt - a.createdAt));
        } catch (error) {
            console.error("Failed to add item to Firestore log", error);
        }
    }, [user]);

    const deleteResultsFromLog = useCallback(async (idsToDelete: string[]) => {
        if (idsToDelete.length === 0) return;

        const entriesToDelete = log.filter(entry => idsToDelete.includes(entry.id));
        const publicIdsToDelete = entriesToDelete.map(e => e.publicId).filter(Boolean) as string[];

        const cloudinaryDeletions = await Promise.allSettled(
            publicIdsToDelete.map(pid => deleteFromCloudinary(pid))
        );
        
        cloudinaryDeletions.forEach(result => {
            if (result.status === 'rejected') {
                console.error("Failed to delete an image from Cloudinary:", result.reason);
            }
        });

        try {
            const batch = writeBatch(db);
            idsToDelete.forEach(id => {
                const docRef = doc(db, COLLECTION_NAME, id);
                batch.delete(docRef);
            });
            await batch.commit();

            setLog(prevLog => prevLog.filter(result => !idsToDelete.includes(result.id)));
        } catch (error) {
            console.error("Failed to delete items from Firestore log:", error);
            throw error;
        }
    }, [log]);

    return { log, addResultToLog, deleteResultsFromLog };

}
