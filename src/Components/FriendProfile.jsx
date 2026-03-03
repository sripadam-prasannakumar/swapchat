import { useEffect, useState } from "react";
import { ref, onValue, update, remove, set, push } from "firebase/database";
import { db, auth } from "../firebase";
import ConfirmModal from "./ConfirmModal";
import FullscreenImageViewer from "./FullscreenImageViewer";

export default function FriendProfile({ user, chatId, onClose, onBlock, onSearchToggle, onLockToggle, hasLock }) {
    const currentUser = auth.currentUser;

    const [onlineStatus, setOnlineStatus] = useState({ online: false, lastSeen: null });
    const [isMuted, setIsMuted] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [confirmModal, setConfirmModal] = useState(null);
    const [toast, setToast] = useState(null);
    const [firstMessage, setFirstMessage] = useState(null);
    const [showFullscreen, setShowFullscreen] = useState(false);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    /* ── Listen to online status ── */
    useEffect(() => {
        if (!user?.uid) return;
        return onValue(ref(db, `users/${user.uid}`), snap => {
            if (snap.exists()) {
                const d = snap.val();
                setOnlineStatus({ online: !!d.online, lastSeen: d.lastSeen || null });
            }
        });
    }, [user?.uid]);

    /* ── Listen to mute state ── */
    useEffect(() => {
        if (!user?.uid || !currentUser) return;
        return onValue(ref(db, `users/${currentUser.uid}/muted/${user.uid}`), snap => {
            setIsMuted(snap.exists() && snap.val() === true);
        });
    }, [user?.uid, currentUser]);

    /* ── Listen to block state ── */
    useEffect(() => {
        if (!user?.uid || !currentUser) return;
        return onValue(ref(db, `users/${currentUser.uid}/blocked/${user.uid}`), snap => {
            setIsBlocked(snap.exists() && snap.val() === true);
        });
    }, [user?.uid, currentUser]);

    /* ── First message timestamp ── */
    useEffect(() => {
        if (!chatId) return;
        return onValue(ref(db, `chats/${chatId}`), snap => {
            const d = snap.val();
            if (d) {
                const msgs = Object.values(d).filter(m => m.time);
                if (msgs.length > 0) {
                    msgs.sort((a, b) => (a.time || 0) - (b.time || 0));
                    setFirstMessage(msgs[0].time);
                }
            }
        }, { onlyOnce: true });
    }, [chatId]);

    /* ── Mute toggle ── */
    const handleMuteToggle = async () => {
        if (!currentUser || !user?.uid) return;
        const muteRef = ref(db, `users/${currentUser.uid}/muted/${user.uid}`);
        if (isMuted) {
            await remove(muteRef);
            showToast(`${user.name} unmuted.`);
        } else {
            await set(muteRef, true);
            showToast(`${user.name} muted.`);
        }
    };

    /* ── Clear chat ── */
    const handleClearChat = () => {
        setConfirmModal({
            title: "Clear Chat History",
            message: `All messages with ${user?.name} will be deleted. This cannot be undone.`,
            danger: true,
            confirmLabel: "Clear Chat",
            onConfirm: async () => {
                try {
                    await remove(ref(db, `chats/${chatId}`));
                    showToast("Chat history cleared.");
                } catch {
                    showToast("Failed to clear chat.", "error");
                }
                setConfirmModal(null);
            },
        });
    };

    /* ── Block / Unblock ── */
    const handleBlockToggle = () => {
        if (isBlocked) {
            setConfirmModal({
                title: "Unblock Contact",
                message: `${user?.name} will be able to send you messages again.`,
                danger: false,
                confirmLabel: "Unblock",
                onConfirm: async () => {
                    await remove(ref(db, `users/${currentUser.uid}/blocked/${user.uid}`));
                    onBlock?.(user.uid, false);
                    showToast(`${user.name} unblocked.`);
                    setConfirmModal(null);
                },
            });
        } else {
            setConfirmModal({
                title: "Block Contact",
                message: `${user?.name} won't be able to send you messages.`,
                danger: true,
                confirmLabel: "Block",
                onConfirm: async () => {
                    await set(ref(db, `users/${currentUser.uid}/blocked/${user.uid}`), true);
                    onBlock?.(user.uid, true);
                    showToast(`${user.name} blocked.`);
                    setConfirmModal(null);
                },
            });
        }
    };

    /* ── Report ── */
    const handleReport = () => {
        setConfirmModal({
            title: "Report Contact",
            message: `Report ${user?.name} for inappropriate behavior?`,
            danger: true,
            confirmLabel: "Submit Report",
            onConfirm: async () => {
                try {
                    await push(ref(db, `reports/${user.uid}`), {
                        reportedBy: currentUser.uid,
                        timestamp: Date.now(),
                        reason: "Reported via profile panel",
                    });
                    showToast("Report submitted.");
                } catch {
                    showToast("Failed to submit report.", "error");
                }
                setConfirmModal(null);
            },
        });
    };

    const formatDate = ts => ts
        ? new Date(ts).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : "Unknown";

    const formatLastSeen = ts => {
        if (!ts) return "a while ago";
        const diff = Date.now() - ts;
        if (diff < 60000) return "just now";
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return formatDate(ts);
    };

    if (!user) return null;

    return (
        <>
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[9999] px-4 py-3 rounded-xl shadow-xl text-white text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-4 ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>
                    <span className="material-symbols-outlined text-[18px]">{toast.type === "error" ? "error" : "check_circle"}</span>
                    {toast.msg}
                </div>
            )}

            {/* Confirm Modal */}
            {confirmModal && (
                <ConfirmModal
                    isOpen
                    title={confirmModal.title}
                    message={confirmModal.message}
                    danger={confirmModal.danger}
                    confirmLabel={confirmModal.confirmLabel}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(null)}
                />
            )}

            {/* Panel */}
            <div className="w-[380px] bg-white dark:bg-[#111927] border-l border-slate-100 dark:border-border-dark flex flex-col shrink-0 z-50 transition-all font-display animate-in slide-in-from-right duration-500 shadow-2xl relative overflow-hidden">
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/5 blur-3xl -z-10" />

                {/* Header */}
                <header className="flex items-center justify-between px-8 py-6 border-b border-slate-50 dark:border-border-dark bg-white/50 dark:bg-[#111927]/50 backdrop-blur-md sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined font-bold">person</span>
                        </div>
                        <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Profile Detail</h2>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all group text-slate-400 hover:text-red-500 border border-transparent hover:border-red-100">
                        <span className="material-symbols-outlined text-[20px] group-hover:rotate-90 transition-transform">close</span>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Profile Overview */}
                    <div className="flex flex-col items-center py-12 px-8 border-b border-slate-50 dark:border-border-dark">
                        <div className="relative mb-6 group">
                            <div className="absolute -inset-1 bg-primary-gradient rounded-full opacity-20 blur-sm group-hover:opacity-40 transition-opacity" />
                            <div
                                className="w-28 h-28 rounded-full border-4 border-white dark:border-[#1e293b] bg-cover bg-center shadow-premium relative z-10 cursor-pointer hover:opacity-90 transition-opacity"
                                style={{ backgroundImage: `url(${user.profile_image || "/profile_image.jpg"})` }}
                                onClick={() => setShowFullscreen(true)}
                            />
                            <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-white dark:border-[#111927] z-20 shadow-sm ${onlineStatus.online ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                        </div>
                        <div className="text-center space-y-1">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{user.name}</h3>
                            <div className="flex items-center justify-center gap-2">
                                <span className={`inline-block w-2 h-2 rounded-full ${onlineStatus.online ? "bg-green-500 animate-pulse" : "bg-slate-400"}`} />
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">
                                    {onlineStatus.online ? "Active Now" : `Seen ${formatLastSeen(onlineStatus.lastSeen)}`}
                                </p>
                            </div>
                        </div>

                        {user.about && (
                            <div className="mt-8 p-4 bg-slate-50 dark:bg-surface-dark rounded-2xl border border-slate-100 dark:border-border-dark w-full">
                                <p className="text-slate-600 dark:text-slate-300 text-sm italic text-center leading-relaxed">
                                    "{user.about}"
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Actions Grid */}
                    <div className="p-8 space-y-6">
                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Privacy & Interaction</h4>

                        <div className="grid grid-cols-1 gap-3">
                            {/* Search in Chat */}
                            <button onClick={() => { onSearchToggle?.(); onClose(); }} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-primary/5 border border-transparent hover:border-slate-100 dark:hover:border-primary/10 transition-all text-left group">
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-[24px]">search</span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-slate-800 dark:text-white">Search History</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Find specific messages</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-300 group-hover:translate-x-1 transition-transform">chevron_right</span>
                            </button>

                            {/* Mute Notifications */}
                            <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-primary/5 border border-transparent hover:border-slate-100 dark:hover:border-primary/10 transition-all cursor-pointer group" onClick={handleMuteToggle}>
                                <div className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all group-hover:scale-110 ${isMuted ? "bg-orange-50 dark:bg-orange-500/10 text-orange-500" : "bg-slate-50 dark:bg-slate-500/10 text-slate-400"}`}>
                                    <span className="material-symbols-outlined text-[24px]">{isMuted ? "notifications_off" : "notifications"}</span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-slate-800 dark:text-white">{isMuted ? "Unmute Notifications" : "Mute Notifications"}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{isMuted ? "Alerts are currently off" : "Stop receiving alerts"}</p>
                                </div>
                                <label className="premium-switch">
                                    <input type="checkbox" checked={isMuted} onChange={handleMuteToggle} />
                                    <span className="premium-slider" />
                                </label>
                            </div>

                            {/* Lock / Unlock Chat */}
                            <button onClick={onLockToggle} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-primary/5 border border-transparent hover:border-slate-100 dark:hover:border-primary/10 transition-all text-left group">
                                <div className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all group-hover:scale-110 ${hasLock ? "bg-purple-50 dark:bg-purple-500/10 text-purple-600" : "bg-slate-50 dark:bg-slate-500/10 text-slate-400"}`}>
                                    <span className="material-symbols-outlined text-[24px]">{hasLock ? "lock_open" : "lock_person"}</span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-slate-800 dark:text-white">{hasLock ? "Disable PIN Lock" : "Secure Conversation"}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{hasLock ? "Remove security protection" : "Protect with biometric/PIN"}</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-300 group-hover:translate-x-1 transition-transform">chevron_right</span>
                            </button>
                        </div>

                        <div className="h-px bg-slate-50 dark:bg-border-dark" />

                        <div className="grid grid-cols-1 gap-3">
                            {/* Clear Chat */}
                            <button onClick={handleClearChat} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-red-50 dark:hover:bg-red-500/5 border border-transparent hover:border-red-100 dark:hover:border-red-500/20 transition-all text-left group">
                                <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-[24px]">auto_delete</span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-red-600 dark:text-red-400">Clear History</p>
                                    <p className="text-xs text-red-400/60 mt-0.5">Wipe all messages locally</p>
                                </div>
                                <span className="material-symbols-outlined text-red-200 group-hover:translate-x-1 transition-transform">delete_forever</span>
                            </button>

                            {/* Block / Unblock */}
                            <button onClick={handleBlockToggle} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all text-left group">
                                <div className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all group-hover:scale-110 ${isBlocked ? "bg-green-50 dark:bg-green-500/10 text-green-500" : "bg-red-50 dark:bg-red-500/10 text-red-500"}`}>
                                    <span className="material-symbols-outlined text-[24px]">{isBlocked ? "person_add" : "person_off"}</span>
                                </div>
                                <div className="flex-1">
                                    <p className={`font-bold text-sm ${isBlocked ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{isBlocked ? "Unblock Contact" : "Block Contact"}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{isBlocked ? "Allow this person to reach you" : "No longer receive messages"}</p>
                                </div>
                            </button>

                            {/* Report */}
                            <button onClick={handleReport} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-orange-50 dark:hover:bg-orange-500/5 transition-all text-left group">
                                <div className="w-12 h-12 bg-orange-50 dark:bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-[24px]">flag</span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-orange-600 dark:text-orange-400">Report Account</p>
                                    <p className="text-xs text-orange-400/60 mt-0.5">Submit for policy violations</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer: Connected Since */}
                <div className="px-8 py-6 border-t border-slate-50 dark:border-border-dark bg-slate-50/30 dark:bg-white/5">
                    <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">Connected since {firstMessage ? formatDate(firstMessage) : "the beginning"}</p>
                </div>
            </div>

            {showFullscreen && (
                <FullscreenImageViewer
                    src={user.profile_image || "/profile_image.jpg"}
                    onClose={() => setShowFullscreen(false)}
                    title={user.name}
                />
            )}
        </>
    );
}
