import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { db, auth, firebaseConfig } from '../services/firebase';
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
// FIX: Added getAuth to the import from firebase/auth
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User as FirebaseUser, getAuth } from 'firebase/auth';
// FIX: Use namespaced import for firebase/app to fix module resolution errors.
import * as firebaseApp from 'firebase/app';

export interface User {
    id: string;
    username: string;
    role: 'admin' | 'user' | 'manager';
    apiKeyId?: string;
    password?: string; // Only used for creation/validation, not stored in active session
}

interface AuthContextType {
    user: Omit<User, 'password'> | null;
    users: Omit<User, 'password'>[];
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    signUp: (username: string, password: string) => Promise<void>;
    addUser: (newUser: Omit<User, 'id'>) => Promise<void>;
    updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    users: [],
    isLoading: true,
    login: async () => {},
    logout: async () => {},
    signUp: async () => {},
    addUser: async () => {},
    updateUser: async () => {},
    deleteUser: async () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<Omit<User, 'password'> | null>(null);
    const [users, setUsers] = useState<Omit<User, 'password'>[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadAllUsers = useCallback(async () => {
        try {
            const usersRef = collection(db, 'users');
            const querySnapshot = await getDocs(usersRef);
            const allUsers = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            })) as Omit<User, 'password'>[];
            setUsers(allUsers);
        } catch (error) {
            console.error("Error fetching all users from Firestore:", error);
            setUsers([]);
        }
    }, []);

    // Effect for handling auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    setUser({
                        id: firebaseUser.uid,
                        username: userData?.username,
                        role: userData?.role,
                        apiKeyId: userData?.apiKeyId,
                    });
                } else {
                    await signOut(auth);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });
        
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user?.role === 'admin' || user?.role === 'manager') {
            loadAllUsers();
        } else {
            setUsers([]);
        }
    }, [user, loadAllUsers]);

    const login = useCallback(async (username: string, password: string) => {
        const email = `${username.toLowerCase()}@internal.app`;
        await signInWithEmailAndPassword(auth, email, password);
    }, []);

    const logout = useCallback(async () => {
        await signOut(auth);
    }, []);

    const signUp = useCallback(async (username: string, password: string) => {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("username", "==", username));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error('Username already exists.');
        }

        const email = `${username.toLowerCase()}@internal.app`;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newFirebaseUser = userCredential.user;

        if (newFirebaseUser) {
            const userData = {
                username: username,
                role: 'user',
                apiKeyId: '',
            };
            await setDoc(doc(db, 'users', newFirebaseUser.uid), userData);
        } else {
            throw new Error("Failed to create user account.");
        }
    }, []);

    const addUser = useCallback(async (newUser: Omit<User, 'id'>) => {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("username", "==", newUser.username));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error('Username already exists.');
        }
        
        const tempAppName = `temp-user-creation-${Date.now()}`;
        // FIX: Call initializeApp directly using named import.
        const tempApp = firebaseApp.initializeApp(firebaseConfig, tempAppName);
        const tempAuth = getAuth(tempApp);

        try {
            const email = `${newUser.username.toLowerCase()}@internal.app`;
            const userCredential = await createUserWithEmailAndPassword(tempAuth, email, newUser.password!);
            const newFirebaseUser = userCredential.user;

            if (newFirebaseUser) {
                const { password, ...userData } = newUser;
                await setDoc(doc(db, 'users', newFirebaseUser.uid), userData);
                await loadAllUsers();
            } else {
                throw new Error("Failed to create user account.");
            }
        } finally {
            // FIX: Call deleteApp directly using named import.
            await firebaseApp.deleteApp(tempApp);
        }
    }, [loadAllUsers]);

    const updateUser = useCallback(async (userId: string, updates: Partial<User>) => {
        const { password, ...firestoreUpdates } = updates; 
        
        await updateDoc(doc(db, 'users', userId), firestoreUpdates);

        if (user?.id === userId) {
            setUser(prev => prev ? { ...prev, ...firestoreUpdates } : null);
        }
        await loadAllUsers();
    }, [user, loadAllUsers]);

    const deleteUser = useCallback(async (userId: string) => {
        if (user?.id === userId) {
            throw new Error("You cannot delete your own account.");
        }
        await deleteDoc(doc(db, 'users', userId));
        await loadAllUsers();
    }, [user, loadAllUsers]);

    const value = { user, users, isLoading, login, logout, signUp, addUser, updateUser, deleteUser };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};