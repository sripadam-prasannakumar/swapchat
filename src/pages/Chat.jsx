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
import { useNavigate, useLocation } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext";
import { auth, db, storage } from "../firebase";

import Sidebar from "../Components/Sidebar";
import LeftNav from "../Components/LeftNav";
import ThemeModal, { THEMES } from "../Components/ThemeModal";
import FriendProfile from "../Components/FriendProfile";
import FullscreenImageViewer from "../Components/FullscreenImageViewer";

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
  const navigate = useNavigate();
  const location = useLocation();
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
  const [otherRecording, setOtherRecording] = useState(false);

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
  const [showFullscreenPhoto, setShowFullscreenPhoto] = useState(false);
  const [fullscreenPhotoUrl, setFullscreenPhotoUrl] = useState("");

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

  // Auto-select user from Discovery page
  useEffect(() => {
    const selectedId = location.state?.selectedUserId;
    if (selectedId && currentUser) {
      const userRef = ref(db, `users/${selectedId}`);
      get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
          setSelectedUser({ uid: selectedId, ...snapshot.val() });
          setActiveScreen("chats");
        }
      });
    }
  }, [location.state, currentUser]);
  const recordTimerRef = useRef(null);
  const isRecordingRef = useRef(false);

  // Refs to avoid stale closures in async callbacks
  const chatIdRef = useRef(null);
  const currentUserRef = useRef(null);

  useEffect(() => { chatIdRef.current = chatId; }, [chatId]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

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

  /* 🎙️ RECORDING STATUS (SEND) */
  useEffect(() => {
    if (!chatId || !currentUser) return;
    const recordingRef = ref(db, `recording/${chatId}/${currentUser.uid}`);
    if (isRecording) {
      set(recordingRef, true);
    } else {
      remove(recordingRef);
    }
    return () => remove(recordingRef);
  }, [isRecording, chatId, currentUser]);

  /* 🎙️ RECORDING STATUS (RECEIVE) */
  useEffect(() => {
    if (!chatId || !currentUser) return;
    return onValue(ref(db, `recording/${chatId}`), (snap) => {
      const data = snap.val() || {};
      const other = Object.keys(data).some((uid) => uid !== currentUser.uid);
      setOtherRecording(other);
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

  /* 📤 SEND MEDIA MESSAGE (images/videos/files — NOT audio) */
  const sendMediaMessage = async (file, type) => {
    const cid = chatIdRef.current;
    const user = currentUserRef.current;
    if (!cid || !user || !file) {
      console.error('sendMediaMessage: missing chatId, user, or file', { cid, user, file });
      return;
    }
    try {
      const fileName = file.name || `media_${Date.now()}`;
      const path = `chats/${cid}/media/${Date.now()}_${fileName}`;
      const storageRef = sRef(storage, path);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      const msgRef = ref(db, `chats/${cid}`);
      await push(msgRef, {
        type,
        url,
        name: fileName,
        sender: user.uid,
        time: Date.now(),
        seen: false,
      });
      const lastMsg = `📎 ${fileName}`;
      await update(ref(db, `users/${user.uid}`), { lastMessage: lastMsg, lastMessageTime: Date.now() });
    } catch (err) {
      console.error('Media upload failed:', err);
      alert(`Upload failed: ${err.message || 'Please try again.'}`);
    }
  };

  /* 🎤 SEND AUDIO — base64 stored in RTDB, skips Firebase Storage entirely (no CORS issues) */
  const sendAudioMessage = async (blob) => {
    const cid = chatIdRef.current;
    const user = currentUserRef.current;
    if (!cid || !user || !blob || blob.size === 0) return;
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      await push(ref(db, `chats/${cid}`), {
        type: 'audio',
        url: dataUrl,
        name: `voice_${Date.now()}.webm`,
        sender: user.uid,
        time: Date.now(),
        seen: false,
      });
      await update(ref(db, `users/${user.uid}`), {
        lastMessage: '🎤 Voice message',
        lastMessageTime: Date.now(),
      });
      console.log('✅ Voice message sent');
    } catch (err) {
      console.error('Audio send failed:', err);
      alert('Failed to send voice message. Please try again.');
    }
  };

  /* 🎙️ VOICE RECORDING */
  const startRecording = async () => {
    if (text.trim()) return; // only when input has text, show send instead
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recordChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordChunksRef.current.push(e.data);
        }
      };
      mr.start(200); // collect chunks every 200ms so we always have data
      mediaRecorderRef.current = mr;
      isRecordingRef.current = true;
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch (err) {
      console.error('Mic access denied:', err);
      alert('Microphone access is required to send voice messages.');
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (!isRecordingRef.current) return;
    clearInterval(recordTimerRef.current);
    isRecordingRef.current = false;
    setIsRecording(false);
    setRecordSeconds(0);

    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') return;

    // Wrap in Promise so onstop is fully awaited
    new Promise((resolve) => {
      mr.onstop = async () => {
        try {
          console.log('Recording stopped. Chunks:', recordChunksRef.current.length, 'shouldSend:', shouldSend);
          if (shouldSend && recordChunksRef.current.length > 0) {
            const blobType = mr.mimeType || 'audio/webm';
            const blob = new Blob(recordChunksRef.current, { type: blobType });
            console.log('Audio blob size:', blob.size, 'type:', blob.type);
            if (blob.size > 0) {
              await sendAudioMessage(blob);
            } else {
              alert('Recording was empty. Please try again.');
            }
          }
        } catch (err) {
          console.error('Error in onstop:', err);
          alert('Failed to send voice message. Please try again.');
        } finally {
          mr.stream?.getTracks().forEach(t => t.stop());
          recordChunksRef.current = [];
          resolve();
        }
      };
      // requestData flushes any pending chunk before stop fires ondataavailable
      if (mr.state === 'recording') {
        mr.requestData();
      }
      mr.stop();
    });
  };

  const toggleRecording = () => {
    if (isRecordingRef.current) {
      stopRecording(true);
    } else {
      startRecording();
    }
  };

  const cancelRecording = () => {
    stopRecording(false);
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


      {(!isMobile || !selectedUser) && (
        <div className={`flex h-full ${isMobile ? 'w-full' : ''}`}>
          <LeftNav onSelect={setActiveScreen} activeScreen={activeScreen} />
          {activeScreen === "chats" && !location.state?.selectedUserId && (
            <Sidebar onSelectUser={setSelectedUser} selectedUser={selectedUser} currentUser={currentUser} />
          )}
        </div>
      )}

      {activeScreen === "profile" && <div className="flex-1 overflow-auto"><Settings initialTab="profile" onBack={() => setActiveScreen("chats")} /></div>}
      {activeScreen === "settings" && <div className="flex-1 overflow-auto"><Settings initialTab="general" onBack={() => setActiveScreen("chats")} /></div>}
      {activeScreen === "ai" && <div className="flex-1 overflow-hidden"><AIChatbot /></div>}

      {activeScreen === "chats" && (selectedUser || !isMobile) && (
        <div className={`flex-1 flex flex-col h-full bg-surface-light dark:bg-surface-dark relative ${isMobile && selectedUser ? 'z-50' : ''}`}>
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
              className={`flex-1 flex flex-col relative chat-area ${currentTheme ? `theme-${currentTheme}` : ''} ${customBg ? 'theme-custom-bg' : ''} ${!selectedUser ? 'hidden md:flex' : 'flex'}`}
              style={customBg ? { backgroundImage: `url(${customBg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
              {selectedUser ? (
                <>
                  {/* Chat Header */}
                  <header className="chat-header">
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      {isMobile && (
                        <button onClick={() => setSelectedUser(null)} className="header-action-btn mr-1" aria-label="Back">
                          <span className="material-symbols-outlined text-[22px]">arrow_back</span>
                        </button>
                      )}
                      {location.state?.selectedUserId && (
                        <button onClick={() => navigate("/discovery")} className="header-action-btn mr-1" title="Back to Discovery">
                          <span className="material-symbols-outlined text-[22px]">arrow_back</span>
                        </button>
                      )}
                      <div
                        className="flex items-center gap-3 cursor-pointer min-w-0"
                        onClick={() => setShowFriendProfile(!showFriendProfile)}
                      >
                        <div className="relative shrink-0">
                          <img
                            className="header-avatar cursor-pointer hover:opacity-90 transition-opacity"
                            src={selectedUser.profile_image || "/profile_image.jpg"}
                            alt={selectedUser.name}
                            onClick={(e) => {
                              e.stopPropagation();
                              setFullscreenPhotoUrl(selectedUser.profile_image || "/profile_image.jpg");
                              setShowFullscreenPhoto(true);
                            }}
                          />
                          {selectedUser.online && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] border-2 border-white dark:border-[#1f2c34] rounded-full" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h2 className="font-semibold text-[15px] leading-tight text-[#111b21] dark:text-[#e9edef] truncate">{selectedUser.name}</h2>
                          <span className="text-[12.5px] block truncate font-normal"
                            style={{ color: otherRecording ? '#ef4444' : otherTyping ? '#00a884' : selectedUser.online ? '#00a884' : '#667781' }}
                          >
                            {otherRecording
                              ? <><span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse mr-1" />Recording audio...</>
                              : otherTyping
                                ? <span className="flex items-center gap-1.5">
                                  <span className="inline-flex gap-0.5 items-end h-3">
                                    {[0, 1, 2].map(i => <span key={i} className="inline-block w-1 h-1 rounded-full bg-[#00a884]" style={{ animation: `bounce 1s infinite ${i * 0.15}s` }} />)}
                                  </span>
                                  typing...
                                </span>
                                : selectedUser.online ? 'Online' : 'Offline'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => { setShowSearchPanel(!showSearchPanel); setSearchQuery(""); }}
                        className="header-action-btn"
                        title="Search in chat"
                        aria-label="Search"
                      >
                        <span className="material-symbols-outlined text-[22px]">search</span>
                      </button>
                      <button
                        onClick={() => setShowThemeModal(true)}
                        className="header-action-btn hidden sm:flex"
                        title="Change Theme"
                        aria-label="Theme"
                      >
                        <span className="material-symbols-outlined text-[22px]">palette</span>
                      </button>
                      <button
                        onClick={() => startCall(selectedUser, 'video')}
                        className="header-action-btn"
                        title="Video call"
                        aria-label="Video call"
                      >
                        <span className="material-symbols-outlined text-[22px]">videocam</span>
                      </button>
                      <button
                        onClick={() => startCall(selectedUser, 'audio')}
                        className="header-action-btn"
                        title="Voice call"
                        aria-label="Voice call"
                      >
                        <span className="material-symbols-outlined text-[22px]">call</span>
                      </button>
                      <button
                        onClick={() => setShowFriendProfile(!showFriendProfile)}
                        className={`header-action-btn ${showFriendProfile ? 'text-[#6366f1] dark:text-[#818cf8]' : ''}`}
                        title="More options"
                        aria-label="More options"
                      >
                        <span className="material-symbols-outlined text-[22px]">more_vert</span>
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
                  <div className="messages custom-scrollbar">
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
                          <div key={msg.id} className="flex justify-center my-3">
                            <span className="system-msg">{msg.text}</span>
                          </div>
                        );
                      }

                      if (msg.type !== 'system' && !msg.text && !msg.url) return null;

                      return (
                        <React.Fragment key={msg.id}>
                          {showDateSeparator && (
                            <div className="date-separator">
                              <span>{formatDate(msgDate)}</span>
                            </div>
                          )}

                          <div
                            className={`flex gap-2 group message ${isMe ? "ml-auto me" : "other"}`}
                            onClick={() => setActiveMsg(activeMsg?.id === msg.id ? null : msg)}
                          >
                            {!isMe && (
                              <div className="shrink-0 mt-auto">
                                <img
                                  className="w-8 h-8 rounded-full object-cover"
                                  src={selectedUser.profile_image || "/profile_image.jpg"}
                                  alt={selectedUser.name}
                                />
                              </div>
                            )}

                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className={`bubble ${searchQuery && msg.text?.toLowerCase().includes(searchQuery.toLowerCase()) ? 'search-highlight' : ''}`}>
                                {msg.replyTo && (
                                  <div className="reply-preview">
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
                                  <div className="voice-msg-player">
                                    <span className="material-symbols-outlined text-[22px] text-[#00a884] shrink-0">mic</span>
                                    <audio controls src={msg.url} className="flex-1" style={{ height: '34px' }} />
                                    <div className="flex items-center gap-1 shrink-0 opacity-70 ml-1">
                                      <span className="text-[11px] whitespace-nowrap" style={{ color: '#667781' }}>
                                        {msg.time && !isNaN(new Date(msg.time).getTime()) ? new Date(msg.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
                                      </span>
                                      {isMe && <span className={`material-symbols-outlined text-[14px] leading-none ${msg.seen ? 'text-[#53bdeb]' : 'text-[#667781]'}`}>{msg.seen ? 'done_all' : 'done'}</span>}
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
                                  <div className="relative pb-1">
                                    <div className="pr-8">
                                      {msg.text}
                                      {msg.edited && <span className={`text-[10px] ml-2 opacity-60 ${isMe ? "text-slate-600 dark:text-slate-300" : "text-slate-400"}`}>(edited)</span>}
                                    </div>
                                    <div className="absolute bottom-[-2px] right-0 flex items-center gap-1 opacity-70">
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
                                <div className="reaction-badge">
                                  {Object.values(msg.reactions).join(' ')}
                                </div>
                              )}

                              {/* Actions Menu */}
                              {activeMsg?.id === msg.id && (
                                <div className="msg-actions">
                                  <div className="flex gap-1">
                                    {['👍', '❤️', '😂', '😮', '😢'].map(e => (
                                      <button key={e} onClick={ev => { ev.stopPropagation(); toggleReaction(msg, e); }} className="msg-actions-emoji-btn">{e}</button>
                                    ))}
                                  </div>
                                  <div className="msg-actions-divider"></div>
                                  <button onClick={ev => { ev.stopPropagation(); setReplyTo(msg); setActiveMsg(null); }} className="msg-action-btn">Reply</button>
                                  {canEdit(msg) && <button onClick={ev => { ev.stopPropagation(); editMessage(msg); }} className="msg-action-btn">Edit</button>}
                                  <button onClick={ev => { ev.stopPropagation(); deleteMessage(msg); }} className="msg-action-btn danger">Delete</button>
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
                  <footer className="shrink-0 relative">
                    {(isBlocked || amIBlocked) ? (
                      <div className="text-center p-4 text-sm text-[#667781] dark:text-[#8696a0] bg-[#f0f2f5] dark:bg-[#111b21] border-t border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.06)]">
                        {isBlocked ? 'You blocked this contact.' : 'You cannot send messages to this contact.'}
                      </div>
                    ) : (
                      <div className="chat-input-bar">
                        {/* Emoji Picker */}
                        {showEmojiPicker && (
                          <div className="absolute bottom-full left-0 mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.06)]">
                            <Picker data={data} onEmojiSelect={e => setText(prev => prev + e.native)} previewPosition="none" theme={dark ? 'dark' : 'light'} />
                          </div>
                        )}

                        {/* Hidden file inputs */}
                        <input ref={imageInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={async e => { const f = e.target.files[0]; if (!f) return; const t = f.type.startsWith('video') ? 'video' : 'image'; await sendMediaMessage(f, t); e.target.value = ''; setShowAttachMenu(false); }} />
                        <input ref={fileInputRef} type="file" className="hidden" onChange={async e => { const f = e.target.files[0]; if (!f) return; await sendMediaMessage(f, 'file'); e.target.value = ''; setShowAttachMenu(false); }} />

                        {/* Recording Bar */}
                        {isRecording && (
                          <div className="recording-bar">
                            <span className="recording-dot" />
                            <span className="recording-label">Recording</span>
                            <span className="recording-timer">
                              {Math.floor(recordSeconds / 60).toString().padStart(2, '0')}:{(recordSeconds % 60).toString().padStart(2, '0')}
                            </span>
                            <button onClick={cancelRecording} className="recording-cancel-btn" title="Cancel">
                              <span className="material-symbols-outlined text-[14px]">close</span>
                              Cancel
                            </button>
                            <button onClick={() => stopRecording(true)} className="recording-send-btn" title="Send">
                              <span className="material-symbols-outlined text-[14px]">send</span>
                              Send
                            </button>
                          </div>
                        )}

                        {/* Attachment menu popup */}
                        {showAttachMenu && (
                          <div className="attach-menu absolute bottom-full left-12 mb-2 z-50">
                            <button onClick={() => imageInputRef.current?.click()} className="attach-menu-item">
                              <span className="material-symbols-outlined text-[20px] text-pink-500">image</span>
                              Photo / Video
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="attach-menu-item">
                              <span className="material-symbols-outlined text-[20px] text-indigo-500">description</span>
                              Document
                            </button>
                          </div>
                        )}

                        {/* Emoji button */}
                        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="header-action-btn shrink-0" aria-label="Emoji">
                          <span className="material-symbols-outlined text-[24px]">mood</span>
                        </button>

                        {/* Attach button */}
                        <button onClick={() => setShowAttachMenu(v => !v)} className="header-action-btn shrink-0" aria-label="Attach">
                          <span className="material-symbols-outlined text-[24px]">attach_file</span>
                        </button>

                        {/* Text Input Pill */}
                        <div className="chat-input-pill">
                          <input
                            className="chat-input-field"
                            placeholder={isRecording ? 'Recording voice message...' : 'Type a message'}
                            value={text}
                            onChange={e => { setText(e.target.value); setIsTyping(true); }}
                            onBlur={() => setIsTyping(false)}
                            onKeyDown={e => e.key === 'Enter' && sendMessage()}
                            disabled={isRecording}
                          />
                        </div>

                        {/* Send / Mic Button */}
                        {text.trim() ? (
                          <button onClick={sendMessage} className="chat-send-btn" aria-label="Send">
                            <span className="material-symbols-outlined text-[24px]">send</span>
                          </button>
                        ) : (
                          <button
                            onClick={toggleRecording}
                            className={`chat-send-btn ${isRecording ? 'recording' : ''}`}
                            aria-label={isRecording ? 'Stop recording' : 'Record voice message'}
                          >
                            <span className="material-symbols-outlined text-[24px]">{isRecording ? 'stop' : 'mic'}</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Reply Preview */}
                    {replyTo && (
                      <div className="reply-banner">
                        <span className="text-[13px] text-[#111b21] dark:text-[#e9edef] truncate">
                          Replying to: <b>{replyTo.text?.substring(0, 60)}</b>
                        </span>
                        <button onClick={() => setReplyTo(null)} className="ml-2 text-[#667781] hover:text-red-500 transition-colors">
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    )}
                  </footer>
                </>
              ) : (
                <div className="no-chat-placeholder">
                  <div className="no-chat-icon">
                    <span className="material-symbols-outlined text-[40px]">chat_bubble_outline</span>
                  </div>
                  <p className="text-[15px] font-medium">Select a conversation to start messaging</p>
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
            </main>
          )
          }

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
        </div>
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

      {showFullscreenPhoto && (
        <FullscreenImageViewer
          src={fullscreenPhotoUrl}
          onClose={() => { setShowFullscreenPhoto(false); setFullscreenPhotoUrl(""); }}
          title={selectedUser?.name || "Profile photo"}
        />
      )}
    </div >
  );
};

export default Chat;
