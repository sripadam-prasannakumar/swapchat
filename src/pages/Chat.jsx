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
} from "firebase/database";
import { ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";
import React, { useEffect, useRef, useState } from "react";
import { auth, db, storage } from "../firebase";

import Sidebar from "../Components/Sidebar";
import LeftNav from "../Components/LeftNav";
import ThemeModal, { THEMES } from "../Components/ThemeModal";
import FriendProfile from "../Components/FriendProfile";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

import Settings from "./Settings";

import "./Chat.css";
import "./Themes.css";

const ONE_HOUR = 60 * 60 * 1000;

const Chat = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

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

  const bottomRef = useRef(null);

  /* 🔐 AUTH */
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (user) setCurrentUser(user);
    });
  }, []);

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

  /* 🔑 CHAT ID */
  const chatId =
    currentUser && selectedUser
      ? [currentUser.uid, selectedUser.uid].sort().join("_")
      : null;

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

  /* 🎨 LOAD THEME & BACKGROUND */
  useEffect(() => {
    if (!chatId) return;

    // Theme listener
    const themeRef = ref(db, `chats/${chatId}/theme`);
    const unsubTheme = onValue(themeRef, (snap) => {
      setCurrentTheme(snap.val() || 'default');
    });

    // Background listener
    const bgRef = ref(db, `chats/${chatId}/background`);
    const unsubBg = onValue(bgRef, (snap) => {
      setCustomBg(snap.val() || null);
    });

    return () => {
      unsubTheme();
      unsubBg();
    };
  }, [chatId]);

  /* 🎨 THEME ACTIONS */
  const handleThemeChange = async (themeId) => {
    if (!chatId) return;
    await set(ref(db, `chats/${chatId}/theme`), themeId);

    // System message
    await push(ref(db, `chats/${chatId}`), {
      text: `Theme changed to ${THEMES.find(t => t.id === themeId)?.name || themeId}`,
      type: 'system',
      time: Date.now()
    });
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

  /* ✏ EDIT */
  const editMessage = async (msg) => {
    if (!canEdit(msg)) return alert("Edit expired");

    const newText = prompt("Edit message", msg.text);
    if (!newText) return;

    await update(ref(db, `chats/${chatId}/${msg.id}`), {
      text: newText,
      edited: true,
    });

    setActiveMsg(null);
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

  /* ================= CALLING (WebRTC) ================= */
  const [callStatus, setCallStatus] = useState('idle'); // idle, calling, incoming, connected
  const [callType, setCallType] = useState(null); // video, audio
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peerConnectionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const incomingCallDataRef = useRef(null); // Store offer data during incoming state
  const isSettingUpCallRef = useRef(false); // 🔥 Prevent race condition on startCall
  const candidateQueueRef = useRef([]); // ❄️ Queue for ICE applicants

  const servers = {
    iceServers: [
      {
        urls: [
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
        ],
      },
    ],
  };

  /* 📡 SIGNALING LISTENERS */
  useEffect(() => {
    if (!chatId || !currentUser) return;

    const callRef = ref(db, `chats/${chatId}/call`);
    const candidatesRef = ref(db, `chats/${chatId}/candidates`);

    const unsubCall = onValue(callRef, async (snap) => {
      const data = snap.val();

      if (!data) {
        // Call ended or reset
        // 🚨 IMPORTANT: Don't end call if we are just starting it (DB hasn't been written yet)
        if (isSettingUpCallRef.current) return;

        if (callStatus !== 'idle') endCall(false); // false = don't double clear
        return;
      }

      if (data.type === 'offer' && data.caller !== currentUser.uid && callStatus === 'idle') {
        incomingCallDataRef.current = data;
        setCallType(data.callType);
        setCallStatus('incoming');
      }

      if (data.type === 'answer' && data.caller !== currentUser.uid && callStatus === 'calling') {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
          setCallStatus('connected');

          // Process queued candidates
          processCandidateQueue();
        }
      }
    });

    const unsubCandidates = onValue(candidatesRef, (snap) => {
      const data = snap.val();
      if (!data) return;

      Object.values(data).forEach(async (candidateData) => {
        if (candidateData.sender !== currentUser.uid) {
          const pc = peerConnectionRef.current;

          // Re-create the ICE candidate object strictly
          // Ensure at least one required field (besides candidate string) is present OR fallback
          // RTCIceCandidate requires one of (sdpMid, sdpMLineIndex) generally, or just candidate string depending on impl.
          // But the error says: "sdpMid and sdpMLineIndex are both null"

          let iceCandidate;
          try {
            if (candidateData.candidate && (candidateData.sdpMid !== undefined || candidateData.sdpMLineIndex !== undefined)) {
              iceCandidate = new RTCIceCandidate({
                candidate: candidateData.candidate,
                sdpMid: candidateData.sdpMid,
                sdpMLineIndex: candidateData.sdpMLineIndex
              });
            } else {
              console.warn("Skipping invalid ICE candidate:", candidateData);
              return;
            }
          } catch (e) {
            console.error("Error constructing ICE candidate:", e, candidateData);
            return;
          }

          if (pc && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(iceCandidate);
            } catch (e) {
              console.error("Error adding received ice candidate", e);
            }
          } else {
            // Queue candidate if PC not ready
            candidateQueueRef.current.push(iceCandidate);
          }
        }
      });
    });

    return () => {
      unsubCall();
      unsubCandidates();
    };
  }, [chatId, currentUser, callStatus]);

  /* 🎥 START CALL */
  const startCall = async (type) => { // type: 'video' | 'audio'
    isSettingUpCallRef.current = true; // 🔒 Lock: We are setting up
    setCallType(type);
    setCallStatus('calling');
    setIsCamOn(type === 'video');

    const pc = new RTCPeerConnection(servers);
    peerConnectionRef.current = pc;

    setupPeerConnectionEndpoints(pc);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });

      setLocalStream(stream);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Clear any old candidates before starting
      await remove(ref(db, `chats/${chatId}/candidates`));

      // Send Offer
      await set(ref(db, `chats/${chatId}/call`), {
        type: 'offer',
        sdp: JSON.parse(JSON.stringify(offer)),
        caller: currentUser.uid,
        callType: type,
        timestamp: Date.now() // Use timestamp to invalidate old calls if needed
      });

      isSettingUpCallRef.current = false; // 🔓 Unlock: Setup complete, DB has data

    } catch (err) {
      console.error("Error starting call:", err);
      // 🔥 Improved error message
      if (err.name === 'NotAllowedError') {
        alert("Permission denied. Please allow camera and microphone access in browser settings.");
      } else if (err.name === 'NotFoundError') {
        alert("No camera or microphone found.");
      } else {
        alert(`Error accessing media devices: ${err.name} - ${err.message}`);
      }
      isSettingUpCallRef.current = false; // 🔓 Unlock even on error
      endCall();
    }
  };

  /* 📞 ANSWER CALL */
  const answerCall = async () => {
    setCallStatus('connected');

    const pc = new RTCPeerConnection(servers);
    peerConnectionRef.current = pc;

    setupPeerConnectionEndpoints(pc);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video', // Match incoming call type
        audio: true
      });

      setLocalStream(stream);
      setIsCamOn(callType === 'video');
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const offer = incomingCallDataRef.current;
      await pc.setRemoteDescription(new RTCSessionDescription(offer.sdp));

      // Process queued candidates (Answerer side)
      processCandidateQueue();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send Answer
      await update(ref(db, `chats/${chatId}/call`), {
        type: 'answer',
        sdp: JSON.parse(JSON.stringify(answer)),
        answerer: currentUser.uid
      });

    } catch (err) {
      console.error("Error answering call:", err);
      // 🔥 Improved error message
      alert(`Error answering call: ${err.name} - ${err.message}`);
      endCall();
    }
  };

  const processCandidateQueue = async () => {
    if (!peerConnectionRef.current || !candidateQueueRef.current.length) return;

    for (const candidate of candidateQueueRef.current) {
      try {
        await peerConnectionRef.current.addIceCandidate(candidate);
      } catch (e) {
        console.error("Error processing queued candidate", e);
      }
    }
    candidateQueueRef.current = []; // Clear queue
  };

  /* 🛠️ PC SETUP & ICE */
  const setupPeerConnectionEndpoints = (pc) => {
    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      event.track.onended = () => console.log("Track ended");

      if (event.streams && event.streams[0]) {
        console.log("Setting remote stream from event.streams[0]");
        setRemoteStream(event.streams[0]);
      } else {
        // Build stream from track if not provided
        console.log("Creating new stream from track");
        const newStream = new MediaStream();
        newStream.addTrack(event.track);
        setRemoteStream(newStream);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const { candidate, sdpMid, sdpMLineIndex } = event.candidate;
        push(ref(db, `chats/${chatId}/candidates`), {
          candidate,
          sdpMid,
          sdpMLineIndex,
          sender: currentUser.uid
        });
      }
    };
  };

  /* ❌ END CALL */
  const endCall = async (clearDb = true) => {
    // Check for Missed Call (Caller cancelled while calling OR Callee declined/ignored while incoming)
    // Only the CALLER should log the missed call to avoid duplicates (or handle carefully)
    // Actually, usually the one who cancels/ends triggers it. 
    // If I am CALLING and I end it -> I cancelled. 
    // If I am RECEIVING (incoming) and I end it -> I declined.

    // Let's rely on the CALLER to log "Missed Call" if the status was never 'connected'.
    if (callStatus === 'calling' && peerConnectionRef.current && peerConnectionRef.current.connectionState !== 'connected') {
      // I was calling, but I ended it (or it timed out). 
      // This is a "Missed Call" for the other person.
      // We log a message that will show for BOTH.
      await push(ref(db, `chats/${chatId}`), {
        text: "Missed Call",
        sender: currentUser.uid,
        type: 'missed_call',
        callType: callType, // video or audio
        time: Date.now(),
        seen: false
      });

      // Update Last Message for Sidebar
      const lastMsgData = { lastMessage: "Missed Call", lastMessageTime: Date.now() };
      update(ref(db, "users/" + currentUser.uid), lastMsgData);
      update(ref(db, "users/" + selectedUser.uid), lastMsgData);
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    setRemoteStream(null);
    setCallStatus('idle');
    setCallType(null);
    setIsScreenSharing(false);
    incomingCallDataRef.current = null;
    isSettingUpCallRef.current = false; // Reset setup flag
    candidateQueueRef.current = []; // Reset queue

    if (clearDb && chatId) {
      await remove(ref(db, `chats/${chatId}/call`));
      await remove(ref(db, `chats/${chatId}/candidates`));
    }
  };

  // Ensure remote video element updates when stream changes
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log("Attaching remote stream to video element", remoteStream.active);
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(e => console.error("Error playing remote video:", e));
    }
  }, [remoteStream]);

  // Ensure local video element updates when stream changes (re-attach)
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callStatus]);

  /* 🎛️ CONTROLS */
  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOn(videoTrack.enabled);

        // If we disabled video track, we might want to stop screen share if active
        if (isScreenSharing && !videoTrack.enabled) {
          // Logic to revert to cam or stop screen share? 
          // Usually just disabling the track is enough.
        }
      }
    }
  };

  const shareScreen = async () => {
    if (isScreenSharing) {
      // Stop screen share -> Switch back to Camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const videoTrack = stream.getVideoTracks()[0];

      if (peerConnectionRef.current) {
        const senders = peerConnectionRef.current.getSenders();
        const sender = senders.find(s => s.track.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      }

      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setIsScreenSharing(false);
      setIsCamOn(true); // Assuming we go back to cam on
    } else {
      // Start screen share
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = stream.getVideoTracks()[0];

        screenTrack.onended = () => {
          shareScreen(); // Toggle back when user stops via browser UI
        };

        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          const sender = senders.find(s => s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        }

        // Note: We're replacing the whole stream track, but keeping audio from original if possible?
        // Usually simpler to just replace the video track in the existing stream or PC.

        setIsScreenSharing(true);
        setIsCamOn(true); // Screen is "video"
      } catch (e) {
        console.error("Screen share failed", e);
      }
    }
  }

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
      {/* CALL OVERLAY */}
      {callStatus !== 'idle' && (
        <div className="fixed inset-0 z-50 bg-[#131221] flex flex-col items-center justify-center animate-in fade-in duration-300">
          {/* Background / Remote Video */}
          <div className="absolute inset-0 flex items-center justify-center">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center animate-pulse">
                <div
                  className="w-32 h-32 rounded-full bg-cover bg-center mb-6 shadow-2xl border-4 border-[#272546]"
                  style={{ backgroundImage: `url(${selectedUser?.profile_image || "/profile_image.jpg"})` }}
                ></div>
                <h2 className="text-3xl font-bold text-white mb-2">{selectedUser?.name}</h2>
                <p className="text-slate-400 text-lg">
                  {callStatus === 'incoming' ? "Incoming Call..." :
                    callStatus === 'calling' ? "Calling..." : "Connecting..."}
                </p>
              </div>
            )}
          </div>

          {/* Local Video (PIP) */}
          {localStream && callType === 'video' && (
            <div className="absolute bottom-24 right-6 w-32 h-48 md:w-48 md:h-72 bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-[#272546]">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
            </div>
          )}

          {/* Incoming Call Actions */}
          {callStatus === 'incoming' && (
            <div className="absolute bottom-12 flex gap-8 z-50">
              <button
                onClick={() => endCall(true)}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full p-6 shadow-lg transition-transform hover:scale-110"
              >
                <span className="material-symbols-outlined text-[32px]">call_end</span>
              </button>
              <button
                onClick={answerCall}
                className="bg-green-500 hover:bg-green-600 text-white rounded-full p-6 shadow-lg transition-transform hover:scale-110 animate-bounce"
              >
                <span className="material-symbols-outlined text-[32px]">call</span>
              </button>
            </div>
          )}

          {/* Active Call Controls */}
          {(callStatus === 'connected' || callStatus === 'calling') && (
            <div className="absolute bottom-8 flex items-center gap-4 bg-[#272546]/80 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-2xl z-50">
              <button
                onClick={toggleMic}
                className={`p-4 rounded-full transition-all ${isMicOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-500'}`}
              >
                <span className="material-symbols-outlined text-[24px]">{isMicOn ? 'mic' : 'mic_off'}</span>
              </button>

              {callType === 'video' && (
                <>
                  <button
                    onClick={toggleCamera}
                    className={`p-4 rounded-full transition-all ${isCamOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-500'}`}
                  >
                    <span className="material-symbols-outlined text-[24px]">{isCamOn ? 'videocam' : 'videocam_off'}</span>
                  </button>
                  <button
                    onClick={shareScreen}
                    className={`p-4 rounded-full transition-all ${isScreenSharing ? 'bg-green-500/20 text-green-500' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                  >
                    <span className="material-symbols-outlined text-[24px]">screen_share</span>
                  </button>
                </>
              )}

              <button
                onClick={() => endCall(true)}
                className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 px-6 shadow-lg ml-4"
              >
                <span className="material-symbols-outlined text-[24px]">call_end</span>
              </button>
            </div>
          )}
        </div>
      )}

      {(!isMobile || !selectedUser) && <LeftNav onSelect={setActiveScreen} />}
      {(!isMobile || !selectedUser) && <Sidebar onSelectUser={setSelectedUser} selectedUser={selectedUser} currentUser={currentUser} />}

      {activeScreen === "profile" && <div className="flex-1 overflow-auto"><Settings initialTab="profile" onBack={() => setActiveScreen("chats")} /></div>}
      {activeScreen === "settings" && <div className="flex-1 overflow-auto"><Settings initialTab="general" onBack={() => setActiveScreen("chats")} /></div>}

      {activeScreen === "chats" && (!isMobile || selectedUser) && (
        <>
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
                      onClick={() => setShowThemeModal(true)}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-[#272546] text-slate-600 dark:text-white hover:bg-primary/20 hover:text-primary transition-all hidden sm:block"
                      title="Change Theme"
                    >
                      <span className="material-symbols-outlined text-[20px]">palette</span>
                    </button>
                    <button
                      onClick={() => startCall('video')}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-[#272546] text-slate-600 dark:text-white hover:bg-primary/20 hover:text-primary transition-all"
                    >
                      <span className="material-symbols-outlined text-[20px]">videocam</span>
                    </button>
                    <button
                      onClick={() => startCall('audio')}
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

                    if (msg.type !== 'system' && !msg.text) return null;

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
                            <div className={`flex items-baseline gap-2 mb-1 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{isMe ? "Me" : selectedUser.name}</span>
                              <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                {msg.time && !isNaN(new Date(msg.time).getTime())
                                  ? new Date(msg.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                                  : ""}
                              </span>
                            </div>

                            <div className={`bubble relative px-4 py-3 shadow-sm text-sm leading-relaxed break-words ${isMe
                              ? "bg-primary text-white rounded-2xl rounded-br-none shadow-primary/20"
                              : "bg-slate-100 dark:bg-[#272546] text-slate-900 dark:text-white rounded-2xl rounded-bl-none"
                              }`}>
                              {msg.replyTo && (
                                <div className={`text-xs mb-1 border-l-2 pl-2 opacity-80 truncate ${isMe ? "border-white/50" : "border-primary"}`}>
                                  {msg.replyTo.text}
                                </div>
                              )}
                              {msg.text}
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

                            {/* Tick Status Indicator */}
                            {isMe && (
                              <div className={`absolute bottom-1 right-2 flex items-center ${msg.seen ? "text-blue-500" : "text-slate-400 dark:text-slate-500" // Blue if seen, otherwise Gray
                                }`}>
                                <span className="material-symbols-outlined text-[14px]" style={{ fontSize: '14px' }}>
                                  {msg.seen
                                    ? "done_all" // 2 Blue Ticks (Seen)
                                    : selectedUser.online
                                      ? "done_all" // 2 Gray Ticks (Online/Delivered)
                                      : "check"}   {/* 1 Gray Tick (Offline/Sent) */}
                                </span>
                              </div>
                            )}
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
                    <div className="max-w-4xl mx-auto flex items-end gap-3 bg-slate-100 dark:bg-[#272546] rounded-xl p-2 pr-3 relative">
                      {showEmojiPicker && (
                        <div className="absolute bottom-full left-0 mb-2 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-[#272546]">
                          <Picker data={data} onEmojiSelect={(e) => setText((prev) => prev + e.native)} previewPosition="none" theme={currentTheme === 'dark' ? 'dark' : 'light'} />
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
                        onChange={(e) => { setText(e.target.value); setIsTyping(true); }}
                        onBlur={() => setIsTyping(false)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                      />

                      <div className="flex items-center gap-1 pb-1">
                        <button onClick={sendMessage} className="bg-primary text-white rounded-lg p-2 flex items-center justify-center hover:opacity-90 transition-opacity shadow-lg shadow-primary/25">
                          <span className="material-symbols-outlined text-[20px] font-bold">send</span>
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Reply Preview */}
                  {replyTo && (
                    <div className="max-w-4xl mx-auto mt-2 text-xs text-slate-500 flex justify-between items-center bg-slate-50 dark:bg-[#272546]/50 p-2 rounded-lg border border-slate-200 dark:border-[#272546]">
                      <span>Replying to: <b>{replyTo.text.substring(0, 50)}...</b></span>
                      <button onClick={() => setReplyTo(null)} className="hover:text-red-500"><span className="material-symbols-outlined text-[16px]">close</span></button>
                    </div>
                  )}
                </footer>
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
          </main>

          {/* Friend Profile Sidebar */}
          {selectedUser && showFriendProfile && (
            <FriendProfile
              user={selectedUser}
              onClose={() => setShowFriendProfile(false)}
              isBlocked={isBlocked}
              onBlock={handleBlock}
              onUnblock={handleUnblock}
              onClearChat={handleClearChat}
            />
          )}
        </>
      )}
    </div>
  );
};


export default Chat;
