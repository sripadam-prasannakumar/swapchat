import React, { useState } from "react";
import { ref, remove, update } from "firebase/database";
import { db, auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import FullscreenImageViewer from "./FullscreenImageViewer";

export default function GroupInfo({ group, onClose, onGroupLeft, hasLock, onLockToggle }) {
    const { currentUser } = useAuth();
    const [renaming, setRenaming] = useState(false);
    const [newName, setNewName] = useState(group?.name || "");
    const [saving, setSaving] = useState(false);
    const [fullscreenData, setFullscreenData] = useState(null); // { src, title }

    if (!group) return null;

    const isAdmin = group.createdBy === currentUser?.uid;
    const members = group.memberDetails || [];

    const handleLeaveGroup = async () => {
        if (!window.confirm("Are you sure you want to leave this group?")) return;
        try {
            await remove(ref(db, `groups/${group.groupId}/members/${currentUser.uid}`));
            onGroupLeft?.();
            onClose();
        } catch (e) {
            console.error("Leave group error:", e);
        }
    };

    const handleRename = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        try {
            await update(ref(db, `groups/${group.groupId}`), { name: newName.trim() });
            setRenaming(false);
        } catch (e) {
            console.error("Rename error:", e);
        }
        setSaving(false);
    };

    return (
        <div className="w-[380px] bg-white dark:bg-[#111927] border-l border-slate-200 dark:border-[#2d3748] flex flex-col shrink-0 z-10 transition-all font-display animate-in slide-in-from-right duration-300">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2d3748]">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">group</span>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Group Info</h2>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-primary/10 rounded-lg transition-colors">
                    <span className="material-symbols-outlined text-slate-500">close</span>
                </button>
            </header>

            {/* Group Overview */}
            <div className="flex flex-col items-center py-8 px-6 border-b border-slate-200 dark:border-[#2d3748] bg-slate-50/50 dark:bg-primary/5">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-5xl shadow-lg mb-4">
                    {group.emoji || "👥"}
                </div>

                {renaming ? (
                    <div className="flex gap-2 items-center w-full max-w-xs">
                        <input
                            className="flex-1 bg-slate-100 dark:bg-[#272546] rounded-lg px-3 py-2 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            maxLength={40}
                            autoFocus
                        />
                        <button onClick={handleRename} disabled={saving} className="px-3 py-2 bg-primary text-white rounded-lg text-sm font-bold">
                            {saving ? "..." : "Save"}
                        </button>
                        <button onClick={() => setRenaming(false)} className="px-3 py-2 bg-slate-100 dark:bg-[#272546] rounded-lg text-sm">
                            Cancel
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{group.name}</h3>
                        {isAdmin && (
                            <button onClick={() => setRenaming(true)} className="p-1 hover:bg-slate-200 dark:hover:bg-[#272546] rounded-md transition-colors" title="Rename group">
                                <span className="material-symbols-outlined text-slate-400 text-[16px]">edit</span>
                            </button>
                        )}
                    </div>
                )}
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{members.length + 1} members</p>
            </div>

            {/* Members List */}
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-2">
                <p className="px-2 py-1 text-xs font-bold text-slate-400 uppercase tracking-widest">Members</p>

                {/* Current user */}
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
                    <div
                        className="w-10 h-10 rounded-full bg-cover bg-center bg-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ backgroundImage: `url(${currentUser?.photoURL || "/profile_image.jpg"})` }}
                        onClick={() => setFullscreenData({ src: currentUser?.photoURL || "/profile_image.jpg", title: "You" })}
                    />
                    <div className="flex-1">
                        <p className="font-semibold text-sm text-slate-800 dark:text-white">{currentUser?.displayName || "You"}</p>
                        <p className="text-xs text-slate-400">You · {isAdmin ? "Admin" : "Member"}</p>
                    </div>
                    {isAdmin && <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">Admin</span>}
                </div>

                {members.map(m => (
                    <div key={m.uid} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors">
                        <div className="relative">
                            <div
                                className="w-10 h-10 rounded-full bg-cover bg-center bg-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                                style={{ backgroundImage: `url(${m.profile_image || "/profile_image.jpg"})` }}
                                onClick={() => setFullscreenData({ src: m.profile_image || "/profile_image.jpg", title: m.name })}
                            />
                            {m.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#111927] rounded-full" />}
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-sm text-slate-800 dark:text-white">{m.name}</p>
                            <p className="text-xs text-slate-400">{m.online ? "Online" : "Offline"}</p>
                        </div>
                        {group.createdBy === m.uid && <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">Admin</span>}
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-[#2d3748] space-y-1">
                {/* Lock / Unlock Group */}
                <button onClick={onLockToggle} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-primary/5 transition-colors text-left">
                    <span className={`p-2 rounded-lg ${hasLock ? "bg-purple-100 dark:bg-purple-500/20 text-purple-600" : "bg-slate-100 dark:bg-slate-500/20 text-slate-500"}`}>
                        <span className="material-symbols-outlined text-[20px]">{hasLock ? "lock_open" : "lock"}</span>
                    </span>
                    <div>
                        <p className="font-medium text-sm text-slate-800 dark:text-white">{hasLock ? "Remove Group Lock" : "Lock this Group"}</p>
                        <p className="text-xs text-slate-400">{hasLock ? "Unlock with PIN" : "Protect with a PIN"}</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 ml-auto">chevron_right</span>
                </button>

                {/* Leave Group */}
                <button onClick={handleLeaveGroup} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors text-left">
                    <span className="p-2 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-lg">
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                    </span>
                    <div>
                        <p className="font-medium text-sm text-red-600 dark:text-red-400">Leave Group</p>
                        <p className="text-xs text-slate-400">Remove yourself from members</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 ml-auto">chevron_right</span>
                </button>
            </div>
            {fullscreenData && (
                <FullscreenImageViewer
                    src={fullscreenData.src}
                    onClose={() => setFullscreenData(null)}
                    title={fullscreenData.title}
                />
            )}
        </div>
    );
}
