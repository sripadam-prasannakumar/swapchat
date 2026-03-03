import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { ref, onValue } from "firebase/database";
import { auth, db } from "../firebase";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [dbUser, setDbUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubDb = () => { };

        const unsubAuth = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);

            // Stop any previous DB listener
            unsubDb();

            if (user) {
                // Listen to RTDB user profile in real-time
                const userRef = ref(db, `users/${user.uid}`);
                unsubDb = onValue(userRef, (snap) => {
                    if (snap.exists()) {
                        setDbUser({ uid: user.uid, ...snap.val() });
                    } else {
                        setDbUser({ uid: user.uid });
                    }
                });
            } else {
                setDbUser(null);
            }
        });

        return () => {
            unsubAuth();
            unsubDb();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ currentUser, dbUser, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
