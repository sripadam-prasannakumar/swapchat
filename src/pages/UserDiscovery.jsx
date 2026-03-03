import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ref, onValue } from "firebase/database";
import { auth, db } from "../firebase";
import { ThemeContext } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
// import "./UserDiscovery.css"; // Removed for better integration

const UserDiscovery = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { dark } = useContext(ThemeContext);
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        const usersRef = ref(db, "users");
        const unsubscribe = onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const usersList = Object.keys(data)
                    .map((uid) => ({
                        uid,
                        ...data[uid],
                    }))
                    .filter((user) => user.uid !== currentUser.uid); // Exclude self
                setUsers(usersList);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const filteredUsers = users.filter((user) =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleStartChat = (user) => {
        navigate("/chat", { state: { selectedUserId: user.uid } });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="discover-page flex flex-col h-screen bg-background-light dark:bg-background-dark overflow-hidden">
            <style>
                {`
                @keyframes green-pulse {
                    0% {
                        transform: scale(0.95);
                        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
                    }
                    70% {
                        transform: scale(1);
                        box-shadow: 0 0 0 6px rgba(34, 197, 94, 0);
                    }
                    100% {
                        transform: scale(0.95);
                        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
                    }
                }
                .discover-page {
                    font-family: 'Outfit', 'Inter', sans-serif;
                }
                `}
            </style>
            {/* Header Area */}
            <header className="px-4 py-6 md:px-12 md:py-12 shrink-0 animate-fade-in">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Discover <span className="text-primary italic">People</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 md:mt-2 text-sm md:text-base font-medium">
                            Connect with {users.length} amazing people on SwapChat
                        </p>
                    </div>

                    <div className="relative w-full md:w-96 group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                        <input
                            type="text"
                            placeholder="Search by name..."
                            className="discover-search w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 shadow-premium outline-none transition-all focus:ring-4 focus:ring-primary/10 focus:border-primary/50 text-slate-900 dark:text-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto px-6 md:px-12 pb-12 custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    {filteredUsers.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredUsers.map((user, index) => (
                                <div
                                    key={user.uid}
                                    className="group relative p-6 glass-morphism rounded-[2rem] hover:-translate-y-2 transition-all duration-500 cursor-pointer animate-fade-up"
                                    onClick={() => handleStartChat(user)}
                                    style={{
                                        animationDelay: `${index * 50}ms`,
                                        background: dark ? "rgba(30, 41, 59, 0.6)" : "rgba(255, 255, 255, 0.7)",
                                        backdropFilter: "blur(20px)",
                                        border: dark ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(226, 232, 240, 0.6)"
                                    }}
                                >
                                    {/* Action Gradient Overlay */}
                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem]" />

                                    <div className="relative z-10 flex flex-col items-center text-center">
                                        {/* Avatar with status */}
                                        <div className="relative mb-4">
                                            <div className="absolute -inset-1 bg-primary-gradient rounded-full opacity-0 group-hover:opacity-20 blur-md transition-opacity" />
                                            <img
                                                src={user.profile_image || "/profile_image.jpg"}
                                                alt={user.name}
                                                className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-xl relative z-10"
                                                onError={(e) => e.target.src = "/profile_image.jpg"}
                                            />
                                            {user.online && (
                                                <div
                                                    className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-white dark:border-slate-800 rounded-full z-20"
                                                    style={{
                                                        boxShadow: "0 0 0 0 rgba(34, 197, 94, 0.7)",
                                                        animation: "green-pulse 2s infinite"
                                                    }}
                                                />
                                            )}
                                        </div>

                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white truncate w-full px-2">
                                            {user.name}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 h-5 italic">
                                            {user.about || "Hey there! I'm using SwapChat"}
                                        </p>

                                        <button className="mt-6 w-full premium-btn-primary py-3 hidden group-hover:flex animate-fade-in duration-300">
                                            <span className="material-symbols-outlined text-[20px]">chat</span>
                                            Message
                                        </button>

                                        <div className="mt-6 w-full flex justify-center py-3 text-primary text-sm font-bold group-hover:hidden transition-all uppercase tracking-widest opacity-80">
                                            Available Now
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4 scale-150">person_search</span>
                            {searchQuery ? (
                                <>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">No results for "{searchQuery}"</h3>
                                    <p className="text-slate-500 mt-1">Try a different name or clear the search</p>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">No one's here yet</h3>
                                    <p className="text-slate-500 mt-1">Invite your friends to join SwapChat!</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Bottom Accent */}
            <div className="h-2 bg-primary/20 dark:bg-primary/10 w-full" />
        </div>
    );
};

export default UserDiscovery;
