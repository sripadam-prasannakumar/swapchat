import { onAuthStateChanged } from "firebase/auth";
import {
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  set,
  update,
  runTransaction,
  get,
} from "firebase/database";
import { ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";
import React, { useEffect, useRef, useState, useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import { auth, db, storage } from "../firebase";

import Sidebar from "../Components/Sidebar";
import LeftNav from "../Components/LeftNav";
import ThemeModal, { THEMES } from "../Components/ThemeModal";
import FriendProfile from "../Components/FriendProfile";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

import Settings from "./Settings";
import AIChatbot from "./AIChatbot";
import GroupChat from "./GroupChat";
import ChatLockModal from "../Components/ChatLockModal";
import { useAuth } from "../context/AuthContext";
import { useCall } from "../context/CallContext";

import "./Chat.css";
import "./Themes.css";

const ONE_HOUR = 60 * 60 * 1000;

const Chat = () => {
  const { currentUser } = useAuth();
  const { startCall, setActiveChatId } = useCall();
  const { dark } = useContext(ThemeContext);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const chatId =
    currentUser && selectedUser
      ? [currentUser.uid, selectedUser.uid].sort().join("_")
      : null;

  const [replyTo, setReplyTo] = useState(null);
  const [activeMsg, setActiveMsg] = useState(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // 🔥 typing indicator
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);

  // 🎨 Themes & Backgrounds
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('default');
  const [customBg, setCustomBg] = useState(null);

  // screen
  const [activeScreen, setActiveScreen] = useState("chats");

  // Friend Profile
  const [showFriendProfile, setShowFriendProfile] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [amIBlocked, setAmIBlocked] = useState(false);

  // 🔍 Search in Chat
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ✏️ Inline message edit
  const [editingMsg, setEditingMsg] = useState(null);
  const [editText, setEditText] = useState("");

  // 🔐 Chat Lock
  const [chatLockMode, setChatLockMode] = useState(null); // null, 'set', 'enter', 'remove'
  const [unlockedChats, setUnlockedChats] = useState(new Set());
  const [hasLock, setHasLock] = useState(false);
  const [toast, setToast] = useState(null);

  // 📎 Attachment menu
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // 🎙️ Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const recordTimerRef = useRef(null);

  const bottomRef = useRef(null);

  /* 🔐 AUTH */
  /* 🔐 ACTIVE CHAT ID SYNC */
  useEffect(() => {
    setActiveChatId(chatId);
  }, [chatId, setActiveChatId]);

  /* 🟢 ONLINE STATUS */
  useEffect(() => {
    if (!currentUser) return;

    const userRef = ref(db, `users/${currentUser.uid}`);
    update(userRef, { online: true });

    onDisconnect(userRef).update({
      online: false,
      lastSeen: Date.now(),
    });
  }, [currentUser]);

  /* 🔑 CHAT LOGIC */

  /* 🔐 CHAT LOCK CHECK */
  useEffect(() => {
    if (!chatId) {
      setHasLock(false);
      return;
    }
    return onValue(ref(db, `chatLocks/${chatId}`), (snap) => {
      const lockExists = snap.exists();
      setHasLock(lockExists);
      if (lockExists && !unlockedChats.has(chatId)) {
        setChatLockMode("enter");
      } else {
        setChatLockMode(null);
      }
    });
  }, [chatId, unlockedChats]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLockConfirm = async (enteredPin, callback) => {
    if (!chatId) return;

    if (chatLockMode === "set") {
      await set(ref(db, `chatLocks/${chatId}`), { pin: enteredPin });
      setUnlockedChats(prev => new Set(prev).add(chatId));
      setChatLockMode(null);
      showToast("Chat locked successfully!");
    } else if (chatLockMode === "enter") {
      const snap = await get(ref(db, `chatLocks/${chatId}/pin`));
      if (snap.exists() && snap.val() === enteredPin) {
        setUnlockedChats(prev => new Set(prev).add(chatId));
        setChatLockMode(null);
        if (callback) callback(true);
      } else {
        if (callback) callback(false);
      }
    } else if (chatLockMode === "remove") {
      const snap = await get(ref(db, `chatLocks/${chatId}/pin`));
      if (snap.exists() && snap.val() === enteredPin) {
        await remove(ref(db, `chatLocks/${chatId}`));
        setUnlockedChats(prev => {
          const next = new Set(prev);
          next.delete(chatId);
          return next;
        });
        setChatLockMode(null);
        if (callback) callback(true);
        showToast("Lock removed.");
      } else {
        if (callback) callback(false);
      }
    }
  };

  /* 📩 RESET UNREAD COUNT */
  useEffect(() => {
    if (!currentUser || !selectedUser) return;
    const unreadRef = ref(db, `unread/${currentUser.uid}/${selectedUser.uid}`);
    set(unreadRef, null); // Clear unread count
  }, [currentUser, selectedUser]);

  /* 🛡️ BLOCK STATUS */
  useEffect(() => {
    if (!currentUser || !selectedUser) return;

    const blockedRef = ref(db, `users/${currentUser.uid}/blocked/${selectedUser.uid}`);
    return onValue(blockedRef, (snap) => {
      setIsBlocked(!!snap.val());
    });
  }, [currentUser, selectedUser]);

  /* 🛡️ AM I BLOCKED STATUS */
  useEffect(() => {
    if (!currentUser || !selectedUser) return;

    const blockedByRef = ref(db, `users/${selectedUser.uid}/blocked/${currentUser.uid}`);
    return onValue(blockedByRef, (snap) => {
      setAmIBlocked(!!snap.val());
    });
  }, [currentUser, selectedUser]);

  /* 📥 LOAD MESSAGES */
  useEffect(() => {
    if (!chatId) return;

    return onValue(ref(db, `chats/${chatId}`), (snap) => {
      const data = snap.val() || {};
      const list = Object.keys(data).map((id) => ({
        id,
        ...data[id],
      }));
      setMessages(list);
    });
  }, [chatId]);

  /* ⬇ AUTO SCROLL */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* 🟡 TYPING INDICATOR (SEND) */
  useEffect(() => {
    if (!chatId || !currentUser) return;

    const typingRef = ref(db, `typing/${chatId}/${currentUser.uid}`);

    if (isTyping) {
      set(typingRef, true);
    } else {
      remove(typingRef);
    }

    return () => remove(typingRef);
  }, [isTyping, chatId, currentUser]);

  /* 🔵 TYPING INDICATOR (RECEIVE) */
  useEffect(() => {
    if (!chatId || !currentUser) return;

    return onValue(ref(db, `typing/${chatId}`), (snap) => {
      const data = snap.val() || {};
      const other = Object.keys(data).some(
        (uid) => uid !== currentUser.uid
      );
      setOtherTyping(other);
    });
  }, [chatId, currentUser]);

  /* 🎨 LOAD THEME (per-user per-chat, stored in localStorage) */
  useEffect(() => {
    if (!currentUser || !chatId) return;
    const saved = localStorage.getItem(`theme_${currentUser.uid}_${chatId}`) || 'default';
    setCurrentTheme(saved);
  }, [currentUser, chatId]);

  /* 🎨 LOAD BACKGROUND (per-chat, stored in Firebase) */
  useEffect(() => {
    if (!chatId) return;
    const bgRef = ref(db, `chats/${chatId}/background`);
    const unsubBg = onValue(bgRef, (snap) => {
      setCustomBg(snap.val() || null);
    });
    return () => unsubBg();
  }, [chatId]);

  /* 🎨 THEME ACTIONS (per-user per-chat localStorage) */
  const handleThemeChange = (themeId) => {
    if (!currentUser || !chatId) return;
    localStorage.setItem(`theme_${currentUser.uid}_${chatId}`, themeId);
    setCurrentTheme(themeId);
  };

  /* 📎 SEND MEDIA MESSAGE (image/video/file/audio) */
  const sendMediaMessage = async (file, type) => {
    if (!chatId || !currentUser || !file) return;
    try {
      const ext = file.name ? file.name.split('.').pop() : 'webm';
      const path = `chats/${chatId}/media/${Date.now()}_${file.name || 'audio.webm'}`;
      const storageRef = sRef(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const msgRef = ref(db, `chats/${chatId}`);
      await push(msgRef, {
        type,
        url,
        name: file.name || 'Voice message',
        sender: currentUser.uid,
        time: Date.now(),
        seen: false,
      });
      // update sidebar last message
      await update(ref(db, `users/${currentUser.uid}`), { lastMessage: type === 'audio' ? '🎤 Voice message' : `📎 ${file.name || 'Media'}`, lastMessageTime: Date.now() });
    } catch (err) {
      console.error('Media upload failed:', err);
      alert('Upload failed. Please try again.');
    }
  };

  /* 🎙️ VOICE RECORDING */
  const startRecording = async () => {
    if (text.trim()) return; // only when no text
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recordChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) recordChunksRef.current.push(e.data); };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch (err) {
      console.error('Mic access denied:', err);
      alert('Microphone access is required to send voice messages.');
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    clearInterval(recordTimerRef.current);
    setIsRecording(false);
    setRecordSeconds(0);
    const mr = mediaRecorderRef.current;
    mr.onstop = async () => {
      const blob = new Blob(recordChunksRef.current, { type: 'audio/webm' });
      blob.name = `voice_${Date.now()}.webm`;
      await sendMediaMessage(blob, 'audio');
      mr.stream?.getTracks().forEach(t => t.stop());
    };
    mr.stop();
  };

  const handleBackgroundUpload = async (e) => {
    if (!chatId || !e.target.files[0]) return;
    const file = e.target.files[0];

    try {
      const storageRef = sRef(storage, `chat_backgrounds/${chatId}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await set(ref(db, `chats/${chatId}/background`), url);

      // System message
      await push(ref(db, `chats/${chatId}`), {
        text: 'Background image updated',
        type: 'system',
        time: Date.now()
      });
    } catch (error) {
      console.error("Error uploading background:", error);
      alert("Failed to upload background image");
    }
  };

  const handleRemoveBackground = async () => {
    if (!chatId) return;
    await remove(ref(db, `chats/${chatId}/background`));

    // System message
    await push(ref(db, `chats/${chatId}`), {
      text: 'Background image removed',
      type: 'system',
      time: Date.now()
    });
  };

  /* 👀 MARK MESSAGES AS SEEN */
  useEffect(() => {
    if (!chatId || !currentUser || !messages.length) return;

    const updates = {};
    messages.forEach((msg) => {
      if (msg.sender !== currentUser.uid && !msg.seen) {
        updates[`chats/${chatId}/${msg.id}/seen`] = true;
      }
    });

    if (Object.keys(updates).length > 0) {
      update(ref(db), updates);
    }
  }, [chatId, messages, currentUser]);

  /* 📤 SEND MESSAGE */
  const sendMessage = async () => {
    if (!text.trim() || !chatId) return;

    if (isBlocked) {
      alert("You have blocked this user. Unblock them to send messages.");
      return;
    }

    if (amIBlocked) {
      alert("You cannot send messages to this user.");
      return; // Or maybe show a subtle UI indication instead of alert
    }

    await push(ref(db, `chats/${chatId}`), {
      text,
      sender: currentUser.uid,
      time: Date.now(),
      seen: false,
      replyTo: replyTo
        ? { text: replyTo.text, sender: replyTo.sender }
        : null,
    });

    // Increment Unread Count
    const unreadRef = ref(db, `unread/${selectedUser.uid}/${currentUser.uid}`);
    runTransaction(unreadRef, (count) => {
      return (count || 0) + 1;
    });

    // Update Last Message Time for both users
    update(ref(db, "users/" + currentUser.uid), { lastMessageTime: Date.now() });
    update(ref(db, "users/" + selectedUser.uid), { lastMessageTime: Date.now() });

    setText("");
    setReplyTo(null);
    setIsTyping(false);
  };

  /* 🧠 CAN EDIT */
  const canEdit = (msg) =>
    msg.sender === currentUser.uid &&
    Date.now() - msg.time <= ONE_HOUR;

  /* 🗑 DELETE */
  const deleteMessage = async (msg) => {
    await remove(ref(db, `chats/${chatId}/${msg.id}`));
    setActiveMsg(null);
  };

  /* ✏ INLINE EDIT */
  const editMessage = (msg) => {
    if (!canEdit(msg)) return;
    setEditingMsg(msg);
    setEditText(msg.text);
    setActiveMsg(null);
  };

  const saveEditMessage = async () => {
    if (!editText.trim() || !editingMsg) return;
    await update(ref(db, `chats/${chatId}/${editingMsg.id}`), {
      text: editText,
      edited: true,
    });
    setEditingMsg(null);
    setEditText("");
  };

  /* 😀 EMOJI REACTION */
  const toggleReaction = async (msg, emoji) => {
    const reactionRef = ref(
      db,
      `chats/${chatId}/${msg.id}/reactions/${currentUser.uid}`
    );

    if (msg.reactions?.[currentUser.uid] === emoji) {
      await remove(reactionRef);
    } else {
      await set(reactionRef, emoji);
    }
  };

  const resetSelection = () => {
    setSelectedUser(null);
    setShowFriendProfile(false);
  }

  /* 🚫 BLOCK / UNBLOCK */
  const handleBlock = async () => {
    if (!currentUser || !selectedUser) return;
    if (window.confirm(`Are you sure you want to block ${selectedUser.name}?`)) {
      await set(ref(db, `users/${currentUser.uid}/blocked/${selectedUser.uid}`), true);
      alert(`${selectedUser.name} has been blocked.`);
    }
  }

  const handleUnblock = async () => {
    if (!currentUser || !selectedUser) return;
    if (window.confirm(`Unblock ${selectedUser.name}?`)) {
      await remove(ref(db, `users/${currentUser.uid}/blocked/${selectedUser.uid}`));
      alert(`${selectedUser.name} has been unblocked.`);
    }
  }

  /* 🧹 CLEAR CHAT */
  const handleClearChat = async () => {
    if (!chatId) return;
    if (window.confirm("Are you sure you want to clear this chat history? This cannot be undone.")) {
      await remove(ref(db, `chats/${chatId}`));
    }
  }

  /* 🎥 START CALL */ // Logic moved to CallContext

  /* ================= UI ================= */

  // 📱 Mobile Responsiveness
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Find the last message sent by the current user
  const lastMyMessageId = [...messages].reverse().find(m => m.sender === currentUser?.uid)?.id;

  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark font-display overflow-hidden">


      {(!isMobile || !selectedUser) && <LeftNav onSelect={setActiveScreen} activeScreen={activeScreen} currentUser={currentUser} />}
      {activeScreen === "chats" && (!isMobile || !selectedUser) && <Sidebar onSelectUser={setSelectedUser} selectedUser={selectedUser} currentUser={currentUser} />}

      {activeScreen === "profile" && <div className="flex-1 overflow-auto"><Settings initialTab="profile" onBack={() => setActiveScreen("chats")} /></div>}
      {activeScreen === "settings" && <div className="flex-1 overflow-auto"><Settings initialTab="general" onBack={() => setActiveScreen("chats")} /></div>}
      {activeScreen === "ai" && <div className="flex-1 overflow-hidden"><AIChatbot /></div>}

      {activeScreen === "chats" && (!isMobile || selectedUser) && (
        <>
          {/* ===== GROUP CHAT ROUTING ===== */}
          {selectedUser?.isGroup ? (
            <GroupChat
              group={selectedUser}
              onBack={() => setSelectedUser(null)}
              isMobile={isMobile}
              hasLock={hasLock}
              onLockToggle={() => {
                setChatLockMode(hasLock ? "remove" : "set");
              }}
            />
          ) : (
            <main
              className={`flex-1 flex flex-col relative chat-area ${currentTheme ? `theme-${currentTheme}` : ''} ${customBg ? 'theme-custom-bg' : ''}`}
              style={customBg ? { backgroundImage: `url(${customBg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
              {selectedUser ? (
                <>
                  {/* Chat Header */}
                  <header className="h-[72px] flex items-center justify-between px-4 md:px-6 border-b border-primary/10 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md z-10 shrink-0">
                    <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                      {isMobile && (
                        <button onClick={() => setSelectedUser(null)} className="mr-1 text-slate-500 dark:text-slate-300">
                          <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                      )}
                      <div
                        className="flex items-center gap-3 md:gap-4 cursor-pointer hover:opacity-80 transition-opacity min-w-0"
                        onClick={() => setShowFriendProfile(!showFriendProfile)}
                      >
                        <div className="relative shrink-0">
                          <div
                            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-cover bg-center bg-slate-200 dark:bg-[#272546]"
                            style={{ backgroundImage: `url(${selectedUser.profile_image || "/profile_image.jpg"})` }}
                          ></div>
                          {selectedUser.online && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 border-2 border-white dark:border-background-dark rounded-full"></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h2 className="font-bold text-sm md:text-base leading-tight text-slate-900 dark:text-white truncate">{selectedUser.name}</h2>
                          <span className="text-[10px] md:text-xs font-medium text-slate-500 dark:text-slate-400 block truncate">
                            {otherTyping ? "typing..." : (selectedUser.online ? "Online" : "Offline")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2">
                      <button
                        onClick={() => { setShowSearchPanel(!showSearchPanel); setSearchQuery(""); }}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-[#272546] text-slate-600 dark:text-white hover:bg-primary/20 hover:text-primary transition-all"
                        title="Search in chat"
                      >
                        <span className="material-symbols-outlined text-[20px]">search</span>
                      </button>
                      <button
                        onClick={() => setShowThemeModal(true)}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-[#272546] text-slate-600 dark:text-white hover:bg-primary/20 hover:text-primary transition-all hidden sm:block"
                        title="Change Theme"
                      >
                        <span className="material-symbols-outlined text-[20px]">palette</span>
                      </button>
                      <button
                        onClick={() => startCall(selectedUser, 'video')}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-[#272546] text-slate-600 dark:text-white hover:bg-primary/20 hover:text-primary transition-all"
                      >
                        <span className="material-symbols-outlined text-[20px]">videocam</span>
                      </button>
                      <button
                        onClick={() => startCall(selectedUser, 'audio')}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-[#272546] text-slate-600 dark:text-white hover:bg-primary/20 hover:text-primary transition-all"
                      >
                        <span className="material-symbols-outlined text-[20px]">call</span>
                      </button>
                      <button
                        onClick={() => setShowFriendProfile(!showFriendProfile)}
                        className={`p-2 rounded-lg bg-slate-100 dark:bg-[#272546] hover:bg-primary/20 hover:text-primary transition-all ${showFriendProfile ? "text-primary bg-primary/10" : "text-slate-600 dark:text-white"}`}
                      >
                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                      </button>
                    </div>
                  </header>

                  {/* Search Bar */}
                  {showSearchPanel && (
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
                          {messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase())).length} result(s)
                        </span>
                      )}
                      <button onClick={() => { setShowSearchPanel(false); setSearchQuery(""); }} className="text-slate-400 hover:text-red-400">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  )}

                  {/* Message History */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-2 custom-scrollbar messages">
                    {messages.map((msg, index) => {
                      const isMe = msg.sender === currentUser.uid;
                      const msgDate = new Date(msg.time);
                      const prevMsg = messages[index - 1];
                      const prevDate = prevMsg ? new Date(prevMsg.time) : null;
                      const showDateSeparator = !prevDate || msgDate.toDateString() !== prevDate.toDateString();

                      const formatDate = (date) => {
                        if (!date || isNaN(date.getTime())) return "";
                        const today = new Date();
                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);
                        if (date.toDateString() === today.toDateString()) return "Today";
                        if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
                        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
                      };

                      if (msg.type === 'system') {
                        return (
                          <div key={msg.id} className="flex justify-center my-4">
                            <span className="px-3 py-1 bg-slate-100 dark:bg-[#272546] rounded-full text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                              {msg.text}
                            </span>
                          </div>
                        );
                      }

                      if (msg.type !== 'system' && !msg.text && !msg.url) return null;

                      return (
                        <React.Fragment key={msg.id}>
                          {showDateSeparator && (
                            <div className="flex items-center justify-center py-4">
                              <div className="h-px flex-1 bg-slate-100 dark:bg-[#272546/50]"></div>
                              <span className="px-4 text-[10px] font-bold tracking-wider text-slate-400 uppercase">{formatDate(msgDate)}</span>
                              <div className="h-px flex-1 bg-slate-100 dark:bg-[#272546/50]"></div>
                            </div>
                          )}

                          <div
                            className={`flex gap-3 max-w-[80%] group message ${isMe ? "ml-auto flex-row-reverse me" : "other"}`}
                            onClick={() => setActiveMsg(activeMsg?.id === msg.id ? null : msg)}
                          >
                            {!isMe && (
                              <div className="shrink-0 mt-auto mb-1">
                                <div
                                  className="w-8 h-8 rounded-full bg-cover bg-center bg-slate-200 dark:bg-[#272546]"
                                  style={{ backgroundImage: `url(${selectedUser.profile_image || "/profile_image.jpg"})` }}
                                ></div>
                              </div>
                            )}

                            <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                              <div className={`bubble relative min-w-[90px] px-2.5 pt-1.5 pb-2 shadow-sm text-[14.5px] leading-relaxed break-words ${isMe
                                ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-slate-100"
                                : "bg-white dark:bg-[#202c33] text-[#111b21] dark:text-slate-100 border border-slate-100 dark:border-white/5"
                                } ${searchQuery && msg.text?.toLowerCase().includes(searchQuery.toLowerCase()) ? "ring-2 ring-yellow-400" : ""}`}>
                                {msg.replyTo && (
                                  <div className={`text-xs mb-1 border-l-2 pl-2 opacity-80 truncate ${isMe ? "border-white/50" : "border-primary"}`}>
                                    {msg.replyTo.text}
                                  </div>
                                )}

                                {editingMsg?.id === msg.id ? (
                                  <div className="flex flex-col gap-2 min-w-[150px]">
                                    <textarea
                                      autoFocus
                                      className="w-full bg-white/10 border border-white/20 rounded-lg p-2 text-sm outline-none text-inherit resize-none"
                                      value={editText}
                                      onChange={e => setEditText(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEditMessage(); }
                                        if (e.key === "Escape") setEditingMsg(null);
                                      }}
                                    />
                                    <div className="flex justify-end gap-2">
                                      <button onClick={() => setEditingMsg(null)} className="text-[10px] opacity-70 hover:opacity-100">Cancel</button>
                                      <button onClick={saveEditMessage} className="text-[10px] bg-white text-primary font-bold px-2 py-1 rounded">Save</button>
                                    </div>
                                  </div>
                                ) : msg.type === 'audio' ? (
                                  <div className="min-w-[220px] pr-10">
                                    <audio controls src={msg.url} className="w-full h-9 rounded" />
                                    <div className="absolute bottom-0 right-1 flex items-center gap-1 opacity-70">
                                      <span className="text-[10px] whitespace-nowrap font-medium text-slate-500 dark:text-slate-400">
                                        {msg.time && !isNaN(new Date(msg.time).getTime()) ? new Date(msg.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}
                                      </span>
                                      {isMe && <span className={`material-symbols-outlined text-[14px] leading-none ${msg.seen ? "text-blue-500" : "text-slate-500"}`}>{msg.seen ? "done_all" : "done"}</span>}
                                    </div>
                                  </div>
                                ) : msg.type === 'image' ? (
                                  <div className="min-w-[180px] pr-10">
                                    <img src={msg.url} alt="sent" className="rounded-lg max-w-full max-h-[300px] object-cover" />
                                    <div className="absolute bottom-0 right-1 flex items-center gap-1 opacity-70">
                                      <span className="text-[10px] whitespace-nowrap font-medium text-slate-500 dark:text-slate-400">
                                        {msg.time && !isNaN(new Date(msg.time).getTime()) ? new Date(msg.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}
                                      </span>
                                      {isMe && <span className={`material-symbols-outlined text-[14px] leading-none ${msg.seen ? "text-blue-500" : "text-slate-500"}`}>{msg.seen ? "done_all" : "done"}</span>}
                                    </div>
                                  </div>
                                ) : msg.type === 'video' ? (
                                  <div className="min-w-[220px] pr-10">
                                    <video controls src={msg.url} className="rounded-lg max-w-full max-h-[300px]" />
                                    <div className="absolute bottom-0 right-1 flex items-center gap-1 opacity-70">
                                      <span className="text-[10px] whitespace-nowrap font-medium text-slate-500 dark:text-slate-400">
                                        {msg.time && !isNaN(new Date(msg.time).getTime()) ? new Date(msg.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}
                                      </span>
                                      {isMe && <span className={`material-symbols-outlined text-[14px] leading-none ${msg.seen ? "text-blue-500" : "text-slate-500"}`}>{msg.seen ? "done_all" : "done"}</span>}
                                    </div>
                                  </div>
                                ) : msg.type === 'file' ? (
                                  <div className="min-w-[180px] pr-10">
                                    <a href={msg.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2 hover:bg-white/30 transition-colors">
                                      <span className="material-symbols-outlined text-[22px]">description</span>
                                      <span className="text-sm truncate max-w-[140px]">{msg.name}</span>
                                      <span className="material-symbols-outlined text-[18px] shrink-0">download</span>
                                    </a>
                                    <div className="absolute bottom-0 right-1 flex items-center gap-1 opacity-70">
                                      <span className="text-[10px] whitespace-nowrap font-medium text-slate-500 dark:text-slate-400">
                                        {msg.time && !isNaN(new Date(msg.time).getTime()) ? new Date(msg.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}
                                      </span>
                                      {isMe && <span className={`material-symbols-outlined text-[14px] leading-none ${msg.seen ? "text-blue-500" : "text-slate-500"}`}>{msg.seen ? "done_all" : "done"}</span>}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="relative pb-3">
                                    <div className="pr-12">
                                      {msg.text}
                                      {msg.edited && <span className={`text-[10px] ml-2 opacity-60 ${isMe ? "text-slate-600 dark:text-slate-300" : "text-slate-400"}`}>(edited)</span>}
                                    </div>
                                    <div className="absolute bottom-[-6px] right-0 flex items-center gap-1 opacity-70">
                                      <span className="text-[10px] whitespace-nowrap font-medium text-slate-500 dark:text-slate-400">
                                        {msg.time && !isNaN(new Date(msg.time).getTime())
                                          ? new Date(msg.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                                          : ""}
                                      </span>
                                      {isMe && (
                                        <span className={`material-symbols-outlined text-[14px] leading-none ${msg.seen ? "text-blue-500 dark:text-[#53bdeb]" : "text-slate-500 dark:text-slate-400"}`}>
                                          {msg.seen ? "done_all" : "done"}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Reactions */}
                              {msg.reactions && (
                                <div className="flex -mt-2 bg-white dark:bg-[#131221] rounded-full px-2 py-0.5 shadow-sm border border-slate-100 dark:border-[#272546] z-10 text-sm">
                                  {Object.values(msg.reactions).join(" ")}
                                </div>
                              )}

                              {/* Actions Menu */}
                              {activeMsg?.id === msg.id && (
                                <div className={`flex gap-2 mt-2 bg-white dark:bg-[#131221] p-2 rounded-lg shadow-xl border border-slate-100 dark:border-[#272546] animate-in fade-in slide-in-from-top-2 z-20`}>
                                  <div className="flex gap-1">
                                    {["👍", "❤️", "😂", "😮", "😢"].map((e) => (
                                      <button key={e} onClick={(ev) => { ev.stopPropagation(); toggleReaction(msg, e); }} className="hover:scale-125 transition-transform">{e}</button>
                                    ))}
                                  </div>
                                  <div className="w-px bg-slate-200 dark:bg-[#272546]"></div>
                                  <button onClick={(ev) => { ev.stopPropagation(); setReplyTo(msg); setActiveMsg(null); }} className="text-xs text-slate-600 dark:text-slate-300 hover:text-primary">Reply</button>
                                  {canEdit(msg) && <button onClick={(ev) => { ev.stopPropagation(); editMessage(msg); }} className="text-xs text-slate-600 dark:text-slate-300 hover:text-primary">Edit</button>}
                                  <button onClick={(ev) => { ev.stopPropagation(); deleteMessage(msg); }} className="text-xs text-red-500 hover:text-red-600">Delete</button>
                                </div>
                              )}

                              {/* Timestamps are now natively inside the bubble above! */}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>

                  {/* Input Area */}
                  <footer className="p-4 border-t border-slate-200 dark:border-[#272546] bg-white dark:bg-background-dark shrink-0">
                    {(isBlocked || amIBlocked) ? (
                      <div className="text-center p-3 text-sm text-slate-500 bg-slate-100 dark:bg-[#272546] rounded-xl font-medium">
                        {isBlocked ? "You blocked this contact." : "You cannot send messages to this contact."}
                      </div>
                    ) : (
                      <div className="max-w-5xl mx-auto flex items-center gap-2 bg-[#f0f2f5] dark:bg-[#202c33] rounded-xl px-3 py-1.5 relative border border-slate-200 dark:border-white/5">
                        {showEmojiPicker && (
                          <div className="absolute bottom-full left-0 mb-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10">
                            <Picker data={data} onEmojiSelect={(e) => setText((prev) => prev + e.native)} previewPosition="none" theme={dark ? 'dark' : 'light'} />
                          </div>
                        )}

                        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                          <span className="material-symbols-outlined text-[26px]">mood</span>
                        </button>

                        {/* Hidden file inputs */}
                        <input ref={imageInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={async (e) => { const f = e.target.files[0]; if (!f) return; const t = f.type.startsWith('video') ? 'video' : 'image'; await sendMediaMessage(f, t); e.target.value = ''; setShowAttachMenu(false); }} />
                        <input ref={fileInputRef} type="file" className="hidden" onChange={async (e) => { const f = e.target.files[0]; if (!f) return; await sendMediaMessage(f, 'file'); e.target.value = ''; setShowAttachMenu(false); }} />

                        {/* Attachment menu popup */}
                        {showAttachMenu && (
                          <div className="absolute bottom-full left-10 mb-3 z-50 bg-white dark:bg-[#233138] rounded-2xl shadow-2xl border border-slate-100 dark:border-white/10 p-2 flex flex-col gap-1 min-w-[160px] animate-in slide-in-from-bottom-3">
                            <button onClick={() => imageInputRef.current?.click()} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors">
                              <span className="material-symbols-outlined text-[20px] text-pink-500">image</span> Photo / Video
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors">
                              <span className="material-symbols-outlined text-[20px] text-blue-500">description</span> Document
                            </button>
                          </div>
                        )}

                        <button onClick={() => setShowAttachMenu(v => !v)} className="p-2 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-light transition-colors">
                          <span className="material-symbols-outlined text-[26px]">add</span>
                        </button>

                        {/* Recording indicator */}
                        {isRecording && (
                          <div className="absolute bottom-full left-0 right-0 mb-2 mx-2 flex items-center gap-2 bg-white dark:bg-[#202c33] rounded-xl px-4 py-2 shadow-lg border border-red-200 dark:border-red-900">
                            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-red-500 font-bold text-sm">Recording</span>
                            <span className="text-slate-500 dark:text-slate-400 text-sm ml-auto font-mono">{Math.floor(recordSeconds / 60).toString().padStart(2, '0')}:{(recordSeconds % 60).toString().padStart(2, '0')}</span>
                            <span className="text-slate-400 text-xs">Release to send</span>
                          </div>
                        )}

                        <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-lg px-4 py-1.5 mx-1 shadow-sm border border-slate-200 dark:border-transparent">
                          <input
                            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none outline-none py-1.5 text-[15px] text-slate-900 dark:text-white placeholder:text-slate-500"
                            placeholder={isRecording ? "Recording voice message..." : "Type a message"}
                            value={text}
                            onChange={(e) => { setText(e.target.value); setIsTyping(true); }}
                            onBlur={() => setIsTyping(false)}
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                            disabled={isRecording}
                          />
                        </div>

                        {text.trim() ? (
                          <button onClick={sendMessage} className="text-primary dark:text-primary-light p-2 transition-all active:scale-90">
                            <span className="material-symbols-outlined text-[30px]">send</span>
                          </button>
                        ) : (
                          <button
                            onPointerDown={startRecording}
                            onPointerUp={stopRecording}
                            onPointerLeave={stopRecording}
                            className={`p-2 transition-all active:scale-90 select-none ${isRecording ? 'text-red-500 scale-110' : 'text-slate-400 hover:text-primary dark:hover:text-primary-light'}`}
                          >
                            <span className="material-symbols-outlined text-[30px]">{isRecording ? 'stop_circle' : 'mic'}</span>
                          </button>
                        )}
                      </div>
                    )}
                    {/* Reply Preview */}
                    {
                      replyTo && (
                        <div className="max-w-4xl mx-auto mt-2 text-xs text-slate-500 flex justify-between items-center bg-slate-50 dark:bg-[#272546]/50 p-2 rounded-lg border border-slate-200 dark:border-[#272546]">
                          <span>Replying to: <b>{replyTo.text.substring(0, 50)}...</b></span>
                          <button onClick={() => setReplyTo(null)} className="hover:text-red-500"><span className="material-symbols-outlined text-[16px]">close</span></button>
                        </div>
                      )
                    }
                  </footer >
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                  <span className="material-symbols-outlined text-6xl mb-4 bg-slate-100 dark:bg-[#272546] p-6 rounded-full">chat_bubble_outline</span>
                  <p className="text-lg font-medium">Select a conversation to start messaging</p>
                </div>
              )}

              <ThemeModal
                isOpen={showThemeModal}
                onClose={() => setShowThemeModal(false)}
                onSelectTheme={handleThemeChange}
                currentTheme={currentTheme}
                onUploadBackground={handleBackgroundUpload}
                onRemoveBackground={handleRemoveBackground}
                hasCustomBg={!!customBg}
              />
            </main >
          )}

          {/* Friend Profile Sidebar */}
          {
            selectedUser && !selectedUser.isGroup && showFriendProfile && (
              <FriendProfile
                user={selectedUser}
                chatId={chatId}
                onClose={() => setShowFriendProfile(false)}
                onBlock={(uid, blocked) => {
                  if (blocked) set(ref(db, `users/${currentUser.uid}/blocked/${uid}`), true);
                  else remove(ref(db, `users/${currentUser.uid}/blocked/${uid}`));
                }}
                onSearchToggle={() => {
                  setShowSearchPanel(true);
                  setShowFriendProfile(false);
                }}
                onLockToggle={() => {
                  setChatLockMode(hasLock ? "remove" : "set");
                  setShowFriendProfile(false);
                }}
                hasLock={hasLock}
              />
            )
          }

          {/* Chat Lock Modal */}
          {
            chatLockMode && (
              <ChatLockModal
                mode={chatLockMode}
                userName={selectedUser?.name || "this chat"}
                onConfirm={handleLockConfirm}
                onCancel={() => {
                  if (chatLockMode === "enter") {
                    setSelectedUser(null);
                  }
                  setChatLockMode(null);
                }}
              />
            )
          }
        </>
      )}

      {/* Toast */}
      {
        toast && (
          <div className={`fixed bottom-6 right-6 z-[9999] px-4 py-3 rounded-xl shadow-xl text-white text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-4 ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>
            <span className="material-symbols-outlined text-[18px]">{toast.type === "error" ? "error" : "check_circle"}</span>
            {toast.msg}
          </div>
        )
      }
    </div >
  );
};

export default Chat;
