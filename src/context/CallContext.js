import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { ref, onValue, set, push, remove, update, get } from "firebase/database";
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
    const [callStatus, setCallStatus] = useState('idle');
    const [callType, setCallType] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [selectedUser, setSelectedUser] = useState(null);

    // --- Refs that shadow state so callbacks always see current values ---
    const callStatusRef = useRef('idle');
    const callTypeRef = useRef(null);
    const selectedUserRef = useRef(null);

    const peerConnectionRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const incomingCallDataRef = useRef(null);
    const isSettingUpCallRef = useRef(false);
    const candidateQueueRef = useRef([]);
    const callTimerRef = useRef(null);
    const activeChatIdRef = useRef(null);

    // Refs for per-session Firebase listeners (so we never miss answer/candidates)
    const unsubCallListenerRef = useRef(null);
    const unsubCandidatesListenerRef = useRef(null);
    const missedCallTimerRef = useRef(null);

    useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);
    useEffect(() => { callTypeRef.current = callType; }, [callType]);
    useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

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

    // ===== GLOBAL CALL LISTENER (fires when someone calls this user) =====
    useEffect(() => {
        if (!currentUser) return;

        const myCallRef = ref(db, `calls/${currentUser.uid}`);
        const unsub = onValue(myCallRef, async (snap) => {
            const data = snap.val();
            if (!data || callStatusRef.current !== 'idle') return;

            incomingCallDataRef.current = data;
            activeChatIdRef.current = data.chatId;
            setCallType(data.callType);

            const callerSnap = await get(ref(db, `users/${data.caller}`));
            if (callerSnap.exists()) {
                setSelectedUser({ uid: data.caller, ...callerSnap.val() });
            }

            setCallStatus('incoming');
        });

        return () => unsub();
    }, [currentUser]);

    // ===== HELPER: detach chat-level listeners =====
    const detachChatListeners = useCallback(() => {
        if (unsubCallListenerRef.current) {
            unsubCallListenerRef.current();
            unsubCallListenerRef.current = null;
        }
        if (unsubCandidatesListenerRef.current) {
            unsubCandidatesListenerRef.current();
            unsubCandidatesListenerRef.current = null;
        }
    }, []);

    // ===== HELPER: attach chat-level listeners for ONE call session =====
    //
    // KEY FIX: We call this function imperatively (not inside a useEffect that
    // depends on callStatus). That way the listeners are NOT torn down and
    // rebuilt whenever callStatus changes from 'calling' → 'connected'.
    //
    const attachChatListeners = useCallback((chatId) => {
        detachChatListeners();

        // --- call node listener (answer SDP arrives here) ---
        const callNodeRef = ref(db, `chats/${chatId}/call`);
        const unsubCall = onValue(callNodeRef, async (snap) => {
            const data = snap.val();

            if (!data) {
                // The call node was removed → other party ended/declined
                if (!isSettingUpCallRef.current && callStatusRef.current !== 'idle') {
                    endCall(false);
                }
                return;
            }

            // Caller side: receive answer
            if (
                data.type === 'answer' &&
                data.answerer !== currentUser?.uid &&
                callStatusRef.current === 'calling'
            ) {
                const pc = peerConnectionRef.current;
                if (pc && data.sdp) {
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                        // Cancel the missed-call timeout
                        if (missedCallTimerRef.current) {
                            clearTimeout(missedCallTimerRef.current);
                            missedCallTimerRef.current = null;
                        }
                        setCallStatus('connected');
                        processCandidateQueue();
                    } catch (e) {
                        console.error("Error setting remote description (answer):", e);
                    }
                }
            }
        });

        // --- ICE candidates listener ---
        const candidatesNodeRef = ref(db, `chats/${chatId}/candidates`);
        const unsubCandidates = onValue(candidatesNodeRef, (snap) => {
            const data = snap.val();
            if (!data) return;

            Object.values(data).forEach(async (candidateData) => {
                if (candidateData.sender === currentUser?.uid) return;

                const pc = peerConnectionRef.current;
                if (
                    candidateData.candidate &&
                    (candidateData.sdpMid !== undefined || candidateData.sdpMLineIndex !== undefined)
                ) {
                    const iceCandidate = new RTCIceCandidate({
                        candidate: candidateData.candidate,
                        sdpMid: candidateData.sdpMid,
                        sdpMLineIndex: candidateData.sdpMLineIndex,
                    });

                    if (pc && pc.remoteDescription) {
                        try {
                            await pc.addIceCandidate(iceCandidate);
                        } catch (e) {
                            console.error("Error adding ICE candidate:", e);
                        }
                    } else {
                        candidateQueueRef.current.push(iceCandidate);
                    }
                }
            });
        });

        unsubCallListenerRef.current = unsubCall;
        unsubCandidatesListenerRef.current = unsubCandidates;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, detachChatListeners]);

    // ===== PROCESS QUEUED CANDIDATES =====
    const processCandidateQueue = async () => {
        if (!peerConnectionRef.current || !candidateQueueRef.current.length) return;
        for (const candidate of candidateQueueRef.current) {
            try {
                await peerConnectionRef.current.addIceCandidate(candidate);
            } catch (e) {
                console.error("Error processing queued candidate:", e);
            }
        }
        candidateQueueRef.current = [];
    };

    // ===== SETUP PEER CONNECTION CALLBACKS =====
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
                    candidate,
                    sdpMid,
                    sdpMLineIndex,
                    sender: currentUser.uid,
                });
            }
        };

        pc.onconnectionstatechange = () => {
            console.log("PeerConnection state:", pc.connectionState);
            if (
                (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') &&
                callStatusRef.current === 'connected'
            ) {
                endCall(true);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    // ===== START CALL =====
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
                video: type === 'video'
                    ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
                    : false,
                audio: true,
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
                timestamp: Date.now(),
            };

            await set(ref(db, `chats/${chatId}/call`), offerPayload);
            await set(ref(db, `calls/${targetUser.uid}`), offerPayload);

            isSettingUpCallRef.current = false;

            // Attach listeners AFTER writing offer (so the first snapshot doesn't
            // incorrectly trigger the "call ended" branch)
            attachChatListeners(chatId);

            // 30-second missed-call timeout
            missedCallTimerRef.current = setTimeout(() => {
                if (callStatusRef.current === 'calling') {
                    console.log("No answer — ending call as missed");
                    endCall(true);
                }
            }, 30000);

        } catch (err) {
            console.error("Error starting call:", err);
            isSettingUpCallRef.current = false;
            endCall();
        }
    };

    // ===== ANSWER CALL =====
    const answerCall = async () => {
        const activeChatId = activeChatIdRef.current;
        if (!activeChatId || !currentUser) return;

        // Remove the incoming notification for this user
        await remove(ref(db, `calls/${currentUser.uid}`));

        const pc = new RTCPeerConnection(SERVERS);
        peerConnectionRef.current = pc;
        setupPeerConnection(pc, activeChatId);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: callTypeRef.current === 'video'
                    ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
                    : false,
                audio: true,
            });

            setLocalStream(stream);
            setIsCamOn(callTypeRef.current === 'video');
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            const offer = incomingCallDataRef.current;
            await pc.setRemoteDescription(new RTCSessionDescription(offer.sdp));

            // Process any candidates that arrived before we set remote description
            processCandidateQueue();

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await update(ref(db, `chats/${activeChatId}/call`), {
                type: 'answer',
                sdp: JSON.parse(JSON.stringify(answer)),
                answerer: currentUser.uid,
            });

            setCallStatus('connected');

            // Attach candidate listener so answerer also receives caller's ICE candidates
            attachChatListeners(activeChatId);

        } catch (err) {
            console.error("Error answering call:", err);
            endCall();
        }
    };

    // ===== END CALL =====
    const endCall = async (clearDb = true) => {
        const activeChatId = activeChatIdRef.current;

        // Stop the missed-call timer first
        if (missedCallTimerRef.current) {
            clearTimeout(missedCallTimerRef.current);
            missedCallTimerRef.current = null;
        }

        // Detach Firebase listeners immediately to prevent re-entrant calls
        detachChatListeners();

        // Write missed-call message only when the CALLER ends while still ringing
        if (callStatusRef.current === 'calling' && activeChatId && currentUser) {
            push(ref(db, `chats/${activeChatId}/messages`), {
                text: "Missed Call",
                sender: currentUser.uid,
                type: 'missed_call',
                callType: callTypeRef.current,
                time: Date.now(),
                seen: false,
            });
            const lastMsgData = { lastMessage: "Missed Call", lastMessageTime: Date.now() };
            update(ref(db, "users/" + currentUser.uid), lastMsgData);
            if (selectedUserRef.current) {
                update(ref(db, "users/" + selectedUserRef.current.uid), lastMsgData);
            }
        }

        if (clearDb && activeChatId && currentUser) {
            remove(ref(db, `chats/${activeChatId}/call`));
            remove(ref(db, `chats/${activeChatId}/candidates`));
            if (selectedUserRef.current) remove(ref(db, `calls/${selectedUserRef.current.uid}`));
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
        incomingCallDataRef.current = null;
        candidateQueueRef.current = [];
        isSettingUpCallRef.current = false;
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
        if (localStream && callTypeRef.current === 'video') {
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
            if (sender) sender.replaceTrack(videoTrack);
            setLocalStream(stream);
            setIsScreenSharing(false);
        } else {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const videoTrack = stream.getVideoTracks()[0];
            const sender = peerConnectionRef.current.getSenders().find(s => s.track.kind === 'video');
            if (sender) sender.replaceTrack(videoTrack);
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
            shareScreen, formatCallDuration,
            setActiveChatId: (id) => { activeChatIdRef.current = id; },
        }}>
            {children}
        </CallContext.Provider>
    );
};
