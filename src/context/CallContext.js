import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { ref, onValue, set, push, remove, update, get, runTransaction } from "firebase/database";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";

const CallContext = createContext();

export const useCall = () => useContext(CallContext);

const SERVERS = {
    iceServers: [
        {
            urls: [
                "stun:stun1.l.google.com:19302",
                "stun:stun2.l.google.com:19302",
                "stun:stun.relay.metered.ca:80",
            ],
        },
        {
            urls: "turn:global.relay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
        {
            urls: "turn:global.relay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
        },
    ],
};

export const CallProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [callStatus, setCallStatus] = useState('idle'); // idle, calling, incoming, connected
    const [callType, setCallType] = useState(null); // video, audio
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [selectedUser, setSelectedUser] = useState(null); // The other party

    const callStatusRef = useRef('idle');
    const peerConnectionRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const incomingCallDataRef = useRef(null);
    const isSettingUpCallRef = useRef(false);
    const candidateQueueRef = useRef([]);
    const callTimerRef = useRef(null);
    const activeChatIdRef = useRef(null);

    useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);

    // ===== STREAM ATTACHMENT =====
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, callStatus]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(e => console.error("Remote video play error:", e));
        }
    }, [remoteStream, callStatus]);

    // ===== TIMER =====
    useEffect(() => {
        if (callStatus === 'connected') {
            callTimerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (callTimerRef.current) clearInterval(callTimerRef.current);
            setCallDuration(0);
        }
        return () => clearInterval(callTimerRef.current);
    }, [callStatus]);

    // ===== GLOBAL CALL LISTENER =====
    useEffect(() => {
        if (!currentUser) return;

        const myCallRef = ref(db, `calls/${currentUser.uid}`);
        const unsubGlobal = onValue(myCallRef, async (snap) => {
            const data = snap.val();
            if (!data || callStatusRef.current !== 'idle') return;

            incomingCallDataRef.current = data;
            activeChatIdRef.current = data.chatId;
            setCallType(data.callType);

            // Fetch caller info
            const callerSnap = await get(ref(db, `users/${data.caller}`));
            if (callerSnap.exists()) {
                setSelectedUser({ uid: data.caller, ...callerSnap.val() });
            }

            setCallStatus('incoming');
        });

        return () => unsubGlobal();
    }, [currentUser]);

    // ===== CHAT-SPECIFIC LISTENERS (Offer/Answer/Candidates) =====
    useEffect(() => {
        if (!currentUser || !activeChatIdRef.current) return;
        const chatId = activeChatIdRef.current;

        const callRef = ref(db, `chats/${chatId}/call`);
        const candidatesRef = ref(db, `chats/${chatId}/candidates`);

        const unsubCall = onValue(callRef, async (snap) => {
            const data = snap.val();
            if (!data) {
                if (isSettingUpCallRef.current) return;
                if (callStatusRef.current !== 'idle') endCall(false);
                return;
            }

            if (data.type === 'offer' && data.caller !== currentUser.uid && callStatusRef.current === 'idle') {
                incomingCallDataRef.current = data;
                activeChatIdRef.current = data.chatId || chatId;
                setCallType(data.callType);
                setCallStatus('incoming');
            }

            if (data.type === 'answer' && callStatusRef.current === 'calling') {
                if (peerConnectionRef.current) {
                    await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
                    setCallStatus('connected');
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
                    if (candidateData.candidate && (candidateData.sdpMid !== undefined || candidateData.sdpMLineIndex !== undefined)) {
                        const iceCandidate = new RTCIceCandidate({
                            candidate: candidateData.candidate,
                            sdpMid: candidateData.sdpMid,
                            sdpMLineIndex: candidateData.sdpMLineIndex
                        });

                        if (pc && pc.remoteDescription) {
                            try { await pc.addIceCandidate(iceCandidate); } catch (e) { console.error("Error adding ice candidate", e); }
                        } else {
                            candidateQueueRef.current.push(iceCandidate);
                        }
                    }
                }
            });
        });

        return () => {
            unsubCall();
            unsubCandidates();
        };
    }, [currentUser, callStatus]); // Recalculate when status changes to ensure listeners stay relevant

    const processCandidateQueue = async () => {
        if (!peerConnectionRef.current || !candidateQueueRef.current.length) return;
        for (const candidate of candidateQueueRef.current) {
            try { await peerConnectionRef.current.addIceCandidate(candidate); } catch (e) { console.error("Error processing candidate", e); }
        }
        candidateQueueRef.current = [];
    };

    const setupPeerConnection = useCallback((pc, targetChatId) => {
        pc.ontrack = (event) => {
            setRemoteStream((prev) => {
                const newStream = new MediaStream(prev ? prev.getTracks() : []);
                if (!newStream.getTracks().some(t => t.id === event.track.id)) {
                    newStream.addTrack(event.track);
                }
                return newStream;
            });
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                const { candidate, sdpMid, sdpMLineIndex } = event.candidate;
                push(ref(db, `chats/${targetChatId}/candidates`), {
                    candidate, sdpMid, sdpMLineIndex, sender: currentUser.uid
                });
            }
        };
    }, [currentUser]);

    const startCall = async (targetUser, type) => {
        if (!currentUser || !targetUser) return;
        const chatId = [currentUser.uid, targetUser.uid].sort().join("_");

        isSettingUpCallRef.current = true;
        activeChatIdRef.current = chatId;
        setSelectedUser(targetUser);
        setCallType(type);
        setCallStatus('calling');
        setIsCamOn(type === 'video');

        const pc = new RTCPeerConnection(SERVERS);
        peerConnectionRef.current = pc;
        setupPeerConnection(pc, chatId);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
                audio: true
            });

            setLocalStream(stream);
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            await remove(ref(db, `chats/${chatId}/candidates`));

            const offerPayload = {
                type: 'offer',
                sdp: JSON.parse(JSON.stringify(offer)),
                caller: currentUser.uid,
                callType: type,
                chatId,
                timestamp: Date.now()
            };

            await set(ref(db, `chats/${chatId}/call`), offerPayload);
            await set(ref(db, `calls/${targetUser.uid}`), offerPayload);

            isSettingUpCallRef.current = false;
        } catch (err) {
            console.error("Error starting call:", err);
            isSettingUpCallRef.current = false;
            endCall();
        }
    };

    const answerCall = async () => {
        const activeChatId = activeChatIdRef.current;
        if (!activeChatId || !currentUser) return;

        await remove(ref(db, `calls/${currentUser.uid}`));

        const pc = new RTCPeerConnection(SERVERS);
        peerConnectionRef.current = pc;
        setupPeerConnection(pc, activeChatId);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: callType === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
                audio: true
            });

            setLocalStream(stream);
            setIsCamOn(callType === 'video');
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            const offer = incomingCallDataRef.current;
            await pc.setRemoteDescription(new RTCSessionDescription(offer.sdp));

            processCandidateQueue();

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await update(ref(db, `chats/${activeChatId}/call`), {
                type: 'answer',
                sdp: JSON.parse(JSON.stringify(answer)),
                answerer: currentUser.uid
            });

            setCallStatus('connected');
        } catch (err) {
            console.error("Error answering call:", err);
            endCall();
        }
    };

    const endCall = async (clearDb = true) => {
        const activeChatId = activeChatIdRef.current;

        // Missed call logic
        if (callStatusRef.current === 'calling' && activeChatId && currentUser) {
            push(ref(db, `chats/${activeChatId}`), {
                text: "Missed Call",
                sender: currentUser.uid,
                type: 'missed_call',
                callType: callType,
                time: Date.now(),
                seen: false
            });
            const lastMsgData = { lastMessage: "Missed Call", lastMessageTime: Date.now() };
            update(ref(db, "users/" + currentUser.uid), lastMsgData);
            if (selectedUser) update(ref(db, "users/" + selectedUser.uid), lastMsgData);
        }

        if (clearDb && activeChatId && currentUser) {
            remove(ref(db, `chats/${activeChatId}/call`));
            remove(ref(db, `chats/${activeChatId}/candidates`));
            if (selectedUser) remove(ref(db, `calls/${selectedUser.uid}`));
            remove(ref(db, `calls/${currentUser.uid}`));
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
        activeChatIdRef.current = null;
        // Don't reset selectedUser immediately so overlay can fade out if needed
    };

    const toggleMic = () => {
        if (localStream) {
            const track = localStream.getAudioTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setIsMicOn(track.enabled);
            }
        }
    };

    const toggleCamera = () => {
        if (localStream && callType === 'video') {
            const track = localStream.getVideoTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setIsCamOn(track.enabled);
            }
        }
    };

    const shareScreen = async () => {
        if (isScreenSharing) {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const videoTrack = stream.getVideoTracks()[0];
            const sender = peerConnectionRef.current.getSenders().find(s => s.track.kind === 'video');
            sender.replaceTrack(videoTrack);
            setLocalStream(stream);
            setIsScreenSharing(false);
        } else {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const videoTrack = stream.getVideoTracks()[0];
            const sender = peerConnectionRef.current.getSenders().find(s => s.track.kind === 'video');
            sender.replaceTrack(videoTrack);
            setLocalStream(stream);
            setIsScreenSharing(true);
        }
    };

    const formatCallDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <CallContext.Provider value={{
            callStatus, callType, localStream, remoteStream,
            isMicOn, isCamOn, isScreenSharing, callDuration,
            selectedUser, localVideoRef, remoteVideoRef,
            startCall, answerCall, endCall, toggleMic, toggleCamera,
            shareScreen, formatCallDuration, setActiveChatId: (id) => { activeChatIdRef.current = id; }
        }}>
            {children}
        </CallContext.Provider>
    );
};
