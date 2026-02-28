import { useState } from "react";
import { ref, push, set, serverTimestamp } from "firebase/database";
import { db } from "../firebase";
import { auth } from "../firebase";
import "./CreateGroupModal.css";

const GROUP_EMOJIS = ["🌟", "🚀", "🎉", "🔥", "💡", "🎯", "🌈", "🎵", "🏆", "❤️", "🐉", "🌊", "🎮", "🌍", "💎"];

export default function CreateGroupModal({ selectedMembers, allUsers, onClose, onGroupCreated }) {
    const [groupName, setGroupName] = useState("");
    const [selectedEmoji, setSelectedEmoji] = useState("🌟");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");

    const currentUser = auth.currentUser;

    const members = allUsers.filter(u => selectedMembers.includes(u.uid));

    const handleCreate = async () => {
        if (!groupName.trim()) { setError("Please enter a group name."); return; }
        if (members.length < 2) { setError("Select at least 2 friends."); return; }
        setCreating(true);

        try {
            const membersMap = { [currentUser.uid]: true };
            members.forEach(m => { membersMap[m.uid] = true; });

            const groupRef = push(ref(db, "groups"));
            const groupId = groupRef.key;

            await set(groupRef, {
                name: groupName.trim(),
                emoji: selectedEmoji,
                createdBy: currentUser.uid,
                createdAt: Date.now(),
                members: membersMap,
                lastMessage: `Group created by ${currentUser.displayName || "You"}`,
                lastMessageTime: Date.now(),
            });

            // First system message
            await push(ref(db, `groups/${groupId}/messages`), {
                text: `Group created by ${currentUser.displayName || "User"}`,
                sender: currentUser.uid,
                senderName: currentUser.displayName || "User",
                type: "system",
                time: Date.now(),
            });

            onGroupCreated({ groupId, name: groupName.trim(), emoji: selectedEmoji, members: membersMap, isGroup: true });
            onClose();
        } catch (e) {
            console.error("Error creating group:", e);
            setError("Failed to create group. Try again.");
        }
        setCreating(false);
    };

    return (
        <div className="cg-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="cg-modal font-display">
                {/* Header */}
                <div className="cg-header">
                    <h2>New Group</h2>
                    <button className="cg-close" onClick={onClose}>
                        <span className="material-symbols-outlined text-[24px]">close</span>
                    </button>
                </div>

                {/* Emoji Selector Section */}
                <div className="cg-emoji-section shadow-sm">
                    <div className="cg-group-avatar">{selectedEmoji}</div>
                    <div className="cg-emoji-grid">
                        {GROUP_EMOJIS.map(e => (
                            <button
                                key={e}
                                className={`cg-emoji-btn ${selectedEmoji === e ? "selected" : ""}`}
                                onClick={() => setSelectedEmoji(e)}
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Fields */}
                <div className="space-y-6">
                    <div className="cg-field">
                        <label>Group Name</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="What's your group called?"
                                value={groupName}
                                onChange={e => { setGroupName(e.target.value); setError(""); }}
                                maxLength={40}
                                autoFocus
                            />
                            <span className="cg-char-count">{groupName.length}/40</span>
                        </div>
                    </div>

                    <div className="cg-members-section">
                        <label>Members ({members.length + 1})</label>
                        <div className="cg-members-list max-h-[120px] overflow-y-auto custom-scrollbar pr-2">
                            {/* Current user */}
                            <div className="cg-member-chip border border-primary/20 bg-primary/5">
                                <div
                                    className="cg-member-avatar"
                                    style={{ backgroundImage: `url(${currentUser?.photoURL || "/profile_image.jpg"})` }}
                                />
                                <span className="text-primary font-bold">You (Admin)</span>
                            </div>
                            {members.map(m => (
                                <div key={m.uid} className="cg-member-chip">
                                    <div
                                        className="cg-member-avatar"
                                        style={{ backgroundImage: `url(${m.profile_image || "/profile_image.jpg"})` }}
                                    />
                                    <span>{m.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl text-red-500 text-sm font-bold">
                        <span className="material-symbols-outlined text-[18px]">error</span>
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="cg-actions pt-4 border-t border-slate-50 dark:border-border-dark">
                    <button className="cg-btn cancel" onClick={onClose}>Discard</button>
                    <button className="cg-btn create" onClick={handleCreate} disabled={creating}>
                        {creating ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                        ) : "Create Group"}
                    </button>
                </div>
            </div>
        </div>
    );
}
