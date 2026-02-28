import React, { useEffect, useRef, useState } from "react";
import {
    onValue, push, ref, remove, set, update, runTransaction
} from "firebase/database";
import { auth, db } from "../firebase";
import GroupInfo from "../Components/GroupInfo";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import "./Chat.css";

export default function GroupChat({ group, onBack, isMobile, hasLock, onLockToggle }) {
    const currentUser = auth.currentUser;

    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [replyTo, setReplyTo] = useState(null);
    const [activeMsg, setActiveMsg] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [otherTyping, setOtherTyping] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [memberDetails, setMemberDetails] = useState([]);
    const [editingMsg, setEditingMsg] = useState(null);
    const [editText, setEditText] = useState("");

    // search
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const bottomRef = useRef(null);
    const ONE_HOUR = 60 * 60 * 1000;
    const groupId = group?.groupId;

    /* Load member details */
    useEffect(() => {
        if (!group?.members) return;
        const uids = Object.keys(group.members).filter(u => u !== currentUser?.uid);
        const unsubs = uids.map(uid =>
            onValue(ref(db, `users/${uid}`), snap => {
                if (snap.exists()) {
                    setMemberDetails(prev => {
                        const filtered = prev.filter(m => m.uid !== uid);
                        return [...filtered, { uid, ...snap.val() }];
                    });
                }
            })
        );
        return () => unsubs.forEach(u => u());
    }, [group?.members, currentUser]);

    /* Load messages */
    useEffect(() => {
        if (!groupId) return;
        return onValue(ref(db, `groups/${groupId}/messages`), snap => {
            const d = snap.val() || {};
            setMessages(Object.keys(d).map(k => ({ id: k, ...d[k] })));
        });
    }, [groupId]);

    /* Auto scroll */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    /* Typing send */
    useEffect(() => {
        if (!groupId || !currentUser) return;
        const typRef = ref(db, `groups/${groupId}/typing/${currentUser.uid}`);
        isTyping ? set(typRef, true) : remove(typRef);
        return () => remove(typRef);
    }, [isTyping, groupId, currentUser]);

    /* Typing receive */
    useEffect(() => {
        if (!groupId || !currentUser) return;
        return onValue(ref(db, `groups/${groupId}/typing`), snap => {
            const d = snap.val() || {};
            setOtherTyping(Object.keys(d).some(u => u !== currentUser.uid));
        });
    }, [groupId, currentUser]);

    /* Mark as seen */
    useEffect(() => {
        if (!groupId || !currentUser || !messages.length) return;
        const updates = {};
        messages.forEach(msg => {
            if (msg.sender !== currentUser.uid && !msg.seen?.[currentUser.uid]) {
                updates[`groups/${groupId}/messages/${msg.id}/seen/${currentUser.uid}`] = true;
            }
        });
        if (Object.keys(updates).length > 0) update(ref(db), updates);
        // clear unread
        set(ref(db, `groupUnread/${groupId}/${currentUser.uid}`), 0);
    }, [messages, groupId, currentUser]);

    const sendMessage = async () => {
        if (!text.trim() || !groupId) return;
        const msgData = {
            text,
            sender: currentUser.uid,
            senderName: currentUser.displayName || "User",
            senderPhoto: currentUser.photoURL || "/profile_image.jpg",
            time: Date.now(),
            type: "text",
            replyTo: replyTo ? { text: replyTo.text, sender: replyTo.sender, senderName: replyTo.senderName } : null,
        };
        await push(ref(db, `groups/${groupId}/messages`), msgData);

        // Update group last message + increment unread for other members
        await update(ref(db, `groups/${groupId}`), {
            lastMessage: text,
            lastMessageTime: Date.now(),
        });
        const memberUids = Object.keys(group.members || {}).filter(u => u !== currentUser.uid);
        const unreadUpdates = {};
        memberUids.forEach(uid => {
            unreadUpdates[`groupUnread/${groupId}/${uid}`] = null; // will use runTransaction per uid below
        });
        for (const uid of memberUids) {
            runTransaction(ref(db, `groupUnread/${groupId}/${uid}`), c => (c || 0) + 1);
        }

        setText(""); setReplyTo(null); setIsTyping(false);
    };

    const deleteMessage = async msg => {
        await remove(ref(db, `groups/${groupId}/messages/${msg.id}`));
        setActiveMsg(null);
    };

    const startEdit = msg => {
        setEditingMsg(msg);
        setEditText(msg.text);
        setActiveMsg(null);
    };

    const saveEdit = async () => {
        if (!editText.trim()) return;
        await update(ref(db, `groups/${groupId}/messages/${editingMsg.id}`), { text: editText, edited: true });
        setEditingMsg(null); setEditText("");
    };

    const toggleReaction = async (msg, emoji) => {
        const reactionRef = ref(db, `groups/${groupId}/messages/${msg.id}/reactions/${currentUser.uid}`);
        msg.reactions?.[currentUser.uid] === emoji
            ? await remove(reactionRef)
            : await set(reactionRef, emoji);
    };

    const canEdit = msg =>
        msg.sender === currentUser.uid && Date.now() - msg.time <= ONE_HOUR;

    const filteredMessages = searchQuery.trim()
        ? messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase()))
        : messages;

    const formatDate = date => {
        if (!date || isNaN(date.getTime())) return "";
        const today = new Date();
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === today.toDateString()) return "Today";
        if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
        return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    };

    return (
        <div className="flex flex-1 overflow-hidden">
            <main className="flex-1 flex flex-col relative chat-area">
                {/* Header */}
                <header className="h-[72px] flex items-center justify-between px-4 md:px-6 border-b border-primary/10 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md z-10 shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {isMobile && (
                            <button onClick={onBack} className="mr-1 text-slate-500 dark:text-slate-300">
                                <span className="material-symbols-outlined">arrow_back</span>
                            </button>
                        )}
                        <div
                            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setShowGroupInfo(!showGroupInfo)}
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl shadow-md flex-shrink-0">
                                {group.emoji || "👥"}
                            </div>
                            <div className="min-w-0">
                                <h2 className="font-bold text-sm md:text-base leading-tight text-slate-900 dark:text-white truncate">
                                    {group.name}
                                </h2>
                                <span className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 block">
                                    {otherTyping
                                        ? "typing..."
                                        : `${Object.keys(group.members || {}).length} members`}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2">
                        <button
                            onClick={() => { setShowSearch(!showSearch); setSearchQuery(""); }}
                            className="p-2 rounded-lg bg-slate-100 dark:bg-[#272546] text-slate-600 dark:text-white hover:bg-primary/20 hover:text-primary transition-all"
                            title="Search in group"
                        >
                            <span className="material-symbols-outlined text-[20px]">search</span>
                        </button>
                        <button
                            onClick={() => setShowGroupInfo(!showGroupInfo)}
                            className={`p-2 rounded-lg bg-slate-100 dark:bg-[#272546] hover:bg-primary/20 hover:text-primary transition-all ${showGroupInfo ? "text-primary bg-primary/10" : "text-slate-600 dark:text-white"}`}
                        >
                            <span className="material-symbols-outlined text-[20px]">more_vert</span>
                        </button>
                    </div>
                </header>

                {/* Search Bar */}
                {showSearch && (
                    <div className="px-4 py-2 border-b border-primary/10 bg-white/60 dark:bg-background-dark/60 backdrop-blur-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
                        <input
                            autoFocus
                            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                            placeholder="Search in conversation..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <span className="text-xs text-slate-400">
                                {filteredMessages.filter(m => m.type !== "system").length} result(s)
                            </span>
                        )}
                        <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="text-slate-400 hover:text-red-400">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-2 custom-scrollbar messages">
                    {filteredMessages.map((msg, index) => {
                        const isMe = msg.sender === currentUser.uid;
                        const msgDate = new Date(msg.time);
                        const prevMsg = filteredMessages[index - 1];
                        const showDateSep = !prevMsg || new Date(prevMsg.time).toDateString() !== msgDate.toDateString();
                        const isHighlighted = searchQuery && msg.text?.toLowerCase().includes(searchQuery.toLowerCase());

                        if (msg.type === "system") {
                            return (
                                <div key={msg.id} className="flex justify-center my-4">
                                    <span className="px-3 py-1 bg-slate-100 dark:bg-[#272546] rounded-full text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                                        {msg.text}
                                    </span>
                                </div>
                            );
                        }

                        if (!msg.text) return null;

                        return (
                            <React.Fragment key={msg.id}>
                                {showDateSep && (
                                    <div className="flex items-center justify-center py-4">
                                        <div className="h-px flex-1 bg-slate-100 dark:bg-[#272546]/50" />
                                        <span className="px-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase">{formatDate(msgDate)}</span>
                                        <div className="h-px flex-1 bg-slate-100 dark:bg-[#272546]/50" />
                                    </div>
                                )}
                                <div
                                    className={`flex gap-2 max-w-[80%] group message ${isMe ? "ml-auto flex-row-reverse me" : "other"} ${isHighlighted ? "ring-2 ring-yellow-400 rounded-2xl" : ""}`}
                                    onClick={() => setActiveMsg(activeMsg?.id === msg.id ? null : msg)}
                                >
                                    {/* Avatar */}
                                    {!isMe && (
                                        <div className="shrink-0 mt-auto mb-1">
                                            <div
                                                className="w-8 h-8 rounded-full bg-cover bg-center bg-slate-200"
                                                style={{ backgroundImage: `url(${msg.senderPhoto || "/profile_image.jpg"})` }}
                                            />
                                        </div>
                                    )}

                                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                                        {/* Sender name (only for others) */}
                                        {!isMe && (
                                            <span className="text-[10px] font-bold text-primary ml-1 mb-0.5">{msg.senderName}</span>
                                        )}

                                        <div className={`flex items-baseline gap-2 mb-1 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
                                            <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {msg.time ? new Date(msg.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}
                                            </span>
                                        </div>

                                        {/* Editing inline */}
                                        {editingMsg?.id === msg.id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    autoFocus
                                                    className="px-3 py-2 rounded-xl border-2 border-primary bg-white dark:bg-[#272546] text-slate-900 dark:text-white text-sm outline-none"
                                                    value={editText}
                                                    onChange={e => setEditText(e.target.value)}
                                                    onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingMsg(null); }}
                                                />
                                                <button onClick={saveEdit} className="text-xs bg-primary text-white px-2 py-1 rounded-lg">Save</button>
                                                <button onClick={() => setEditingMsg(null)} className="text-xs text-slate-400">Cancel</button>
                                            </div>
                                        ) : (
                                            <div className={`bubble relative px-4 py-3 shadow-sm text-sm leading-relaxed break-words ${isMe
                                                ? "bg-primary text-white rounded-2xl rounded-br-none shadow-primary/20"
                                                : "bg-slate-100 dark:bg-[#272546] text-slate-900 dark:text-white rounded-2xl rounded-bl-none"
                                                }`}>
                                                {msg.replyTo && (
                                                    <div className={`text-xs mb-1 border-l-2 pl-2 opacity-80 truncate ${isMe ? "border-white/50" : "border-primary"}`}>
                                                        <span className="font-semibold">{msg.replyTo.senderName || ""}</span>
                                                        {msg.replyTo.text}
                                                    </div>
                                                )}
                                                {msg.text}
                                                {msg.edited && <span className={`text-[10px] ml-2 opacity-60 ${isMe ? "text-white" : "text-slate-400"}`}>(edited)</span>}
                                            </div>
                                        )}

                                        {/* Reactions */}
                                        {msg.reactions && (
                                            <div className="flex -mt-2 bg-white dark:bg-[#131221] rounded-full px-2 py-0.5 shadow-sm border border-slate-100 dark:border-[#272546] z-10 text-sm">
                                                {Object.values(msg.reactions).join(" ")}
                                            </div>
                                        )}

                                        {/* Actions Menu */}
                                        {activeMsg?.id === msg.id && (
                                            <div className="flex gap-2 mt-2 bg-white dark:bg-[#131221] p-2 rounded-lg shadow-xl border border-slate-100 dark:border-[#272546] animate-in fade-in slide-in-from-top-2 z-20">
                                                <div className="flex gap-1">
                                                    {["👍", "❤️", "😂", "😮", "😢"].map(e => (
                                                        <button key={e} onClick={ev => { ev.stopPropagation(); toggleReaction(msg, e); }} className="hover:scale-125 transition-transform">{e}</button>
                                                    ))}
                                                </div>
                                                <div className="w-px bg-slate-200 dark:bg-[#272546]" />
                                                <button onClick={ev => { ev.stopPropagation(); setReplyTo(msg); setActiveMsg(null); }} className="text-xs text-slate-600 dark:text-slate-300 hover:text-primary">Reply</button>
                                                {canEdit(msg) && <button onClick={ev => { ev.stopPropagation(); startEdit(msg); }} className="text-xs text-slate-600 dark:text-slate-300 hover:text-primary">Edit</button>}
                                                {msg.sender === currentUser.uid && (
                                                    <button onClick={ev => { ev.stopPropagation(); deleteMessage(msg); }} className="text-xs text-red-500 hover:text-red-600">Delete</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <footer className="p-4 border-t border-slate-200 dark:border-[#272546] bg-white dark:bg-background-dark shrink-0">
                    <div className="max-w-4xl mx-auto flex items-end gap-3 bg-slate-100 dark:bg-[#272546] rounded-xl p-2 pr-3 relative">
                        {showEmojiPicker && (
                            <div className="absolute bottom-full left-0 mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-[#272546]">
                                <Picker data={data} onEmojiSelect={e => setText(prev => prev + e.native)} previewPosition="none" theme="dark" />
                            </div>
                        )}
                        <div className="flex items-center pb-1">
                            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-slate-500 hover:text-primary transition-colors">
                                <span className="material-symbols-outlined text-[24px]">mood</span>
                            </button>
                        </div>
                        <input
                            className="flex-1 bg-transparent border-none focus:ring-0 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                            placeholder="Type a message..."
                            value={text}
                            onChange={e => { setText(e.target.value); setIsTyping(true); }}
                            onBlur={() => setIsTyping(false)}
                            onKeyDown={e => e.key === "Enter" && sendMessage()}
                        />
                        <div className="flex items-center gap-1 pb-1">
                            <button onClick={sendMessage} className="bg-primary text-white rounded-lg p-2 flex items-center justify-center hover:opacity-90 transition-opacity shadow-lg shadow-primary/25">
                                <span className="material-symbols-outlined text-[20px] font-bold">send</span>
                            </button>
                        </div>
                    </div>
                    {replyTo && (
                        <div className="max-w-4xl mx-auto mt-2 text-xs text-slate-500 flex justify-between items-center bg-slate-50 dark:bg-[#272546]/50 p-2 rounded-lg border border-slate-200 dark:border-[#272546]">
                            <span>Replying to <b>{replyTo.senderName || "user"}</b>: {replyTo.text?.substring(0, 50)}...</span>
                            <button onClick={() => setReplyTo(null)} className="hover:text-red-500">
                                <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                        </div>
                    )}
                </footer>
            </main>

            {/* Group Info Panel */}
            {showGroupInfo && (
                <GroupInfo
                    group={{ ...group, memberDetails }}
                    onClose={() => setShowGroupInfo(false)}
                    onGroupLeft={onBack}
                    hasLock={hasLock}
                    onLockToggle={onLockToggle}
                />
            )}
        </div>
    );
}
