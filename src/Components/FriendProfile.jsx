import React from "react";

const FriendProfile = ({ user, onClose, isBlocked, onBlock, onUnblock, onClearChat }) => {
    if (!user) return null;

    return (
        <div className="w-[400px] bg-white dark:bg-[#111927] border-l border-slate-200 dark:border-[#2d3748] flex flex-col shrink-0 z-10 transition-all font-display animate-in slide-in-from-right duration-300">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2d3748]">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">settings</span>
                    <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Chat Settings</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-primary/10 rounded-lg transition-colors"
                >
                    <span className="material-symbols-outlined text-slate-500 dark:text-slate-400">close</span>
                </button>
            </header>

            {/* Profile Overview */}
            <div className="flex flex-col items-center py-8 px-6 border-b border-slate-200 dark:border-[#2d3748] bg-slate-50/50 dark:bg-primary/5">
                <div className="relative group">
                    <div className="w-24 h-24 rounded-full border-4 border-white dark:border-[#111927] shadow-lg overflow-hidden bg-primary/20">
                        <img
                            alt={user.name}
                            className="w-full h-full object-cover"
                            src={user.profile_image || "/profile_image.jpg"}
                        />
                    </div>
                    {user.online && (
                        <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-[#111927] rounded-full" title="Online"></div>
                    )}
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">{user.name}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {user.online ? "Active Now" : "Offline"}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 text-center px-4">
                    {user.about || "Hey there! I'm using ChatApp"}
                </p>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-6">

                {/* Interaction */}
                <div className="space-y-1">
                    <p className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Interaction</p>

                    <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100 dark:hover:bg-primary/10 rounded-lg transition-all group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-primary/20 text-slate-600 dark:text-primary rounded-lg group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined">search</span>
                            </div>
                            <span className="font-medium text-slate-700 dark:text-slate-200">Search in Chat</span>
                        </div>
                        <span className="material-symbols-outlined text-slate-400 group-hover:translate-x-1 transition-transform">chevron_right</span>
                    </button>

                    <div className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100 dark:hover:bg-primary/10 rounded-lg transition-all group cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-primary/20 text-slate-600 dark:text-primary rounded-lg">
                                <span className="material-symbols-outlined">notifications_off</span>
                            </div>
                            <span className="font-medium text-slate-700 dark:text-slate-200">Mute Notifications</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="space-y-1">
                    <p className="px-4 py-2 text-xs font-bold text-red-500 uppercase tracking-widest">Danger Zone</p>

                    <button
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all group"
                        onClick={onClearChat}
                    >
                        <div className="flex items-center gap-4 text-red-500">
                            <div className="w-10 h-10 flex items-center justify-center bg-red-100 dark:bg-red-900/20 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined">delete_sweep</span>
                            </div>
                            <span className="font-medium">Clear Chat History</span>
                        </div>
                    </button>

                    {isBlocked ? (
                        <button
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all group"
                            onClick={onUnblock}
                        >
                            <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300">
                                <div className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                                    <span className="material-symbols-outlined">lock_open</span>
                                </div>
                                <span className="font-medium">Unblock {user.name}</span>
                            </div>
                        </button>
                    ) : (
                        <button
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all group"
                            onClick={onBlock}
                        >
                            <div className="flex items-center gap-4 text-red-500">
                                <div className="w-10 h-10 flex items-center justify-center bg-red-100 dark:bg-red-900/20 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-colors">
                                    <span className="material-symbols-outlined">block</span>
                                </div>
                                <span className="font-medium">Block User</span>
                            </div>
                        </button>
                    )}

                    <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all group">
                        <div className="flex items-center gap-4 text-red-500">
                            <div className="w-10 h-10 flex items-center justify-center bg-red-100 dark:bg-red-900/20 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-colors">
                                <span className="material-symbols-outlined">thumb_down</span>
                            </div>
                            <span className="font-medium">Report Contact</span>
                        </div>
                    </button>
                </div>

            </div>

            <footer className="px-6 py-4 bg-slate-50 dark:bg-primary/5 text-center border-t border-slate-200 dark:border-[#2d3748]">
                <p className="text-[11px] text-slate-400 uppercase tracking-tighter">Connected since Now</p>
            </footer>
        </div>
    );
};

export default FriendProfile;
