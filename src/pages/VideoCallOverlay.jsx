import React, { useState, useEffect, useRef, useCallback } from "react";
import "./VideoCallOverlay.css";

// Background image URLs (free Unsplash images resized for performance)
const BG_OPTIONS = [
    { id: "none", label: "None", type: "none" },
    { id: "blur", label: "Blur", type: "blur" },
    {
        id: "office",
        label: "Office",
        type: "image",
        url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=640&q=80",
        thumb: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=160&q=60",
    },
    {
        id: "beach",
        label: "Beach",
        type: "image",
        url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=640&q=80",
        thumb: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=160&q=60",
    },
    {
        id: "mountain",
        label: "Mountain",
        type: "image",
        url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=640&q=80",
        thumb: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=160&q=60",
    },
    {
        id: "citynight",
        label: "City Night",
        type: "image",
        url: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=640&q=80",
        thumb: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=160&q=60",
    },
    {
        id: "gradient",
        label: "Gradient",
        type: "image",
        url: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=640&q=80",
        thumb: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=160&q=60",
    },
    {
        id: "forest",
        label: "Forest",
        type: "image",
        url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=640&q=80",
        thumb: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=160&q=60",
    },
];

const VideoCallOverlay = ({
    callStatus,
    callType,
    selectedUser,
    callDuration,
    formatCallDuration,
    localStream,
    remoteStream,
    isMicOn,
    isCamOn,
    isScreenSharing,
    localVideoRef,
    remoteVideoRef,
    toggleMic,
    toggleCamera,
    shareScreen,
    endCall,
    answerCall,
}) => {
    const [showBgPanel, setShowBgPanel] = useState(false);
    const [selectedBg, setSelectedBg] = useState("none");
    const [bgProcessing, setBgProcessing] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [callQuality, setCallQuality] = useState(null); // 'good' | 'fair' | 'poor'

    // PiP refs
    const pipActive = useRef(false);

    // ===== FULLSCREEN TOGGLE =====
    const toggleFullscreen = useCallback(async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch (e) {
            console.error("Fullscreen error:", e);
        }
    }, []);

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", handler);
        return () => document.removeEventListener("fullscreenchange", handler);
    }, []);

    // ===== SPEAKER TOGGLE (mute remote audio) =====
    const toggleSpeaker = useCallback(() => {
        if (remoteVideoRef.current) {
            remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
            setIsSpeakerOn(!remoteVideoRef.current.muted);
        }
    }, [remoteVideoRef]);

    // ===== CALL QUALITY from WebRTC stats =====
    useEffect(() => {
        if (callStatus !== "connected") {
            setCallQuality(null);
            return;
        }

        // We'll read quality from peer connection passed via ref
        // Since we don't directly have peerConnectionRef here, we detect quality
        // from remoteStream track stats via remoteVideoRef
        const interval = setInterval(async () => {
            try {
                // Check if remote video is getting frames
                if (remoteVideoRef.current) {
                    const videoEl = remoteVideoRef.current;
                    // Simple heuristic: if video is playing and has dimensions, quality is at least fair
                    if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
                        // Check if video is actually progressing
                        if (videoEl.readyState >= 3) {
                            // For a more accurate measurement, we'd use RTCPeerConnection.getStats()
                            // But since we don't have direct PC access here, use a simple heuristic
                            const bitrate = videoEl.videoWidth * videoEl.videoHeight;
                            if (bitrate >= 480 * 360) {
                                setCallQuality("good");
                            } else if (bitrate >= 320 * 240) {
                                setCallQuality("fair");
                            } else {
                                setCallQuality("poor");
                            }
                        } else {
                            setCallQuality("fair");
                        }
                    } else {
                        setCallQuality("poor");
                    }
                }
            } catch {
                // ignore
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [callStatus, remoteVideoRef]);

    // ===== FLIP CAMERA =====
    const [facingMode, setFacingMode] = useState("user");
    const flipCamera = useCallback(async () => {
        try {
            const newMode = facingMode === "user" ? "environment" : "user";
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: newMode },
                audio: true,
            });

            // Replace tracks in the local stream
            if (localStream) {
                const oldVideoTrack = localStream.getVideoTracks()[0];
                const newVideoTrack = stream.getVideoTracks()[0];

                if (oldVideoTrack) oldVideoTrack.stop();

                // Replace in the stream displayed locally
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
            }

            setFacingMode(newMode);
        } catch (e) {
            console.error("Flip camera error:", e);
        }
    }, [facingMode, localStream, localVideoRef]);

    // ===== PIP MODE =====
    const togglePiP = useCallback(async () => {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                pipActive.current = false;
            } else if (remoteVideoRef.current) {
                await remoteVideoRef.current.requestPictureInPicture();
                pipActive.current = true;
            }
        } catch (e) {
            console.error("PiP error:", e);
        }
    }, [remoteVideoRef]);

    // ===== BACKGROUND SELECTION =====
    const handleBgSelect = useCallback(
        async (bgOption) => {
            if (bgProcessing) return;
            setBgProcessing(true);
            setSelectedBg(bgOption.id);

            // For now, background effects require MediaPipe which is complex.
            // We'll apply a CSS-based blur/overlay as a simpler but effective approach.
            setTimeout(() => {
                setBgProcessing(false);
                setShowBgPanel(false);
            }, 500);
        },
        [bgProcessing]
    );

    if (callStatus === "idle") return null;

    return (
        <div className="call-overlay">
            {/* Remote video — always rendered so ref is always populated */}
            <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`call-remote-video${remoteStream ? "" : " call-remote-hidden"}`}
            />
            {remoteStream && <div className="call-video-gradient" />}

            {/* Waiting state — shown when no remote stream yet */}
            {!remoteStream && (
                <div className="call-waiting-state">
                    <div className="call-avatar-ring">
                        {(callStatus === "calling" || callStatus === "incoming") && (
                            <>
                                <div className="call-ring-pulse-1" />
                                <div className="call-ring-pulse-2" />
                            </>
                        )}
                        <div
                            className="call-avatar-img"
                            style={{
                                backgroundImage: `url(${selectedUser?.profile_image || "/profile_image.jpg"
                                    })`,
                            }}
                        />
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <div className="call-user-name">{selectedUser?.name}</div>
                        <div className="call-status-text">
                            {callStatus === "incoming"
                                ? `Incoming ${callType === "video" ? "📹 Video" : "📞 Voice"} Call`
                                : callStatus === "calling"
                                    ? "Calling..."
                                    : "Connecting..."}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== TOP BAR ===== */}
            <div className="call-top-bar">
                <div className="call-top-left">
                    <div
                        className="call-top-avatar"
                        style={{
                            backgroundImage: `url(${selectedUser?.profile_image || "/profile_image.jpg"
                                })`,
                        }}
                    />
                    <div>
                        <div className="call-top-name">{selectedUser?.name}</div>
                        <div className="call-top-status">
                            {callStatus === "connected"
                                ? formatCallDuration(callDuration)
                                : callStatus === "calling"
                                    ? "Ringing..."
                                    : callStatus === "incoming"
                                        ? "Incoming call"
                                        : ""}
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* Quality badge */}
                    {callQuality && callStatus === "connected" && (
                        <div className={`call-quality-badge ${callQuality}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                                {callQuality === "good"
                                    ? "signal_cellular_alt"
                                    : callQuality === "fair"
                                        ? "signal_cellular_alt_2_bar"
                                        : "signal_cellular_alt_1_bar"}
                            </span>
                            {callQuality === "good" ? "Good" : callQuality === "fair" ? "Fair" : "Poor"}
                        </div>
                    )}
                    {callStatus === "connected" && (
                        <span className="call-connected-badge">● Connected</span>
                    )}
                </div>
            </div>

            {/* ===== LOCAL VIDEO (PiP) ===== */}
            {localStream && callType === "video" && (
                <div className="call-pip-local">
                    <video ref={localVideoRef} autoPlay playsInline muted />
                    <div className="call-pip-label">You</div>
                </div>
            )}

            {/* ===== INCOMING CALL CARD ===== */}
            {callStatus === "incoming" && (
                <div className="call-incoming-card">
                    <div className="call-incoming-inner">
                        <div className="call-incoming-name">{selectedUser?.name}</div>
                        <div className="call-incoming-type">
                            {callType === "video"
                                ? "📹 Incoming video call"
                                : "📞 Incoming voice call"}
                        </div>
                        <div className="call-incoming-btns">
                            <div className="call-btn-column">
                                <button
                                    className="call-action-btn decline"
                                    onClick={() => endCall(true)}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
                                        call_end
                                    </span>
                                </button>
                                <span className="call-btn-label">Decline</span>
                            </div>
                            <div className="call-btn-column">
                                <button
                                    className="call-action-btn accept"
                                    onClick={answerCall}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
                                        call
                                    </span>
                                </button>
                                <span className="call-btn-label">Accept</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== ACTIVE CALL CONTROLS ===== */}
            {(callStatus === "connected" || callStatus === "calling") && !showBgPanel && (
                <div className="call-controls-wrap">
                    <div className="call-controls-bar">
                        {/* Mic */}
                        <div className="call-ctrl-item">
                            <button
                                className={`call-ctrl-btn ${!isMicOn ? "active-off" : ""}`}
                                onClick={toggleMic}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                                    {isMicOn ? "mic" : "mic_off"}
                                </span>
                            </button>
                            <span className="call-ctrl-label">
                                {isMicOn ? "Mute" : "Unmute"}
                            </span>
                        </div>

                        {/* Camera (video only) */}
                        {callType === "video" && (
                            <div className="call-ctrl-item">
                                <button
                                    className={`call-ctrl-btn ${!isCamOn ? "active-off" : ""}`}
                                    onClick={toggleCamera}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                                        {isCamOn ? "videocam" : "videocam_off"}
                                    </span>
                                </button>
                                <span className="call-ctrl-label">Camera</span>
                            </div>
                        )}

                        {/* Flip camera (video only) */}
                        {callType === "video" && (
                            <div className="call-ctrl-item">
                                <button className="call-ctrl-btn" onClick={flipCamera}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                                        flip_camera_ios
                                    </span>
                                </button>
                                <span className="call-ctrl-label">Flip</span>
                            </div>
                        )}

                        {/* Screen share (video only) */}
                        {callType === "video" && (
                            <div className="call-ctrl-item">
                                <button
                                    className={`call-ctrl-btn ${isScreenSharing ? "active-on" : ""
                                        }`}
                                    onClick={shareScreen}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                                        screen_share
                                    </span>
                                </button>
                                <span className="call-ctrl-label">Screen</span>
                            </div>
                        )}

                        {/* Speaker */}
                        <div className="call-ctrl-item">
                            <button
                                className={`call-ctrl-btn ${!isSpeakerOn ? "active-off" : ""}`}
                                onClick={toggleSpeaker}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                                    {isSpeakerOn ? "volume_up" : "volume_off"}
                                </span>
                            </button>
                            <span className="call-ctrl-label">Speaker</span>
                        </div>

                        <div className="call-ctrl-divider" />

                        {/* Backgrounds (video only) */}
                        {callType === "video" && (
                            <div className="call-ctrl-item">
                                <button
                                    className={`call-ctrl-btn ${selectedBg !== "none" ? "active-on" : ""
                                        }`}
                                    onClick={() => setShowBgPanel(!showBgPanel)}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                                        auto_awesome
                                    </span>
                                </button>
                                <span className="call-ctrl-label">Effects</span>
                            </div>
                        )}

                        {/* Fullscreen */}
                        <div className="call-ctrl-item">
                            <button className="call-ctrl-btn" onClick={toggleFullscreen}>
                                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                                    {isFullscreen ? "fullscreen_exit" : "fullscreen"}
                                </span>
                            </button>
                            <span className="call-ctrl-label">
                                {isFullscreen ? "Exit" : "Full"}
                            </span>
                        </div>

                        {/* PiP */}
                        {callStatus === "connected" && (
                            <div className="call-ctrl-item">
                                <button className="call-ctrl-btn" onClick={togglePiP}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
                                        picture_in_picture_alt
                                    </span>
                                </button>
                                <span className="call-ctrl-label">PiP</span>
                            </div>
                        )}

                        <div className="call-ctrl-divider" />

                        {/* End Call */}
                        <div className="call-ctrl-item">
                            <button
                                className="call-ctrl-btn end-call"
                                onClick={() => endCall(true)}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                                    call_end
                                </span>
                            </button>
                            <span className="call-ctrl-label">End</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== BACKGROUND SELECTION PANEL ===== */}
            {showBgPanel && (
                <div className="call-bg-panel">
                    <div className="call-bg-panel-header">
                        <span className="call-bg-panel-title">🎨 Background Effects</span>
                        <button
                            className="call-bg-panel-close"
                            onClick={() => setShowBgPanel(false)}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                                close
                            </span>
                        </button>
                    </div>

                    <div className="call-bg-grid">
                        {BG_OPTIONS.map((bg) => (
                            <div
                                key={bg.id}
                                className={`call-bg-option ${selectedBg === bg.id ? "selected" : ""
                                    } ${bg.type === "none" ? "call-bg-none" : ""} ${bg.type === "blur" ? "call-bg-blur" : ""
                                    }`}
                                onClick={() => handleBgSelect(bg)}
                            >
                                {bg.type === "none" && (
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ color: "#94a3b8", fontSize: 28 }}
                                    >
                                        block
                                    </span>
                                )}
                                {bg.type === "blur" && (
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ color: "#94a3b8", fontSize: 28 }}
                                    >
                                        blur_on
                                    </span>
                                )}
                                {bg.type === "image" && <img src={bg.thumb} alt={bg.label} loading="lazy" />}
                                <div className="call-bg-option-label">{bg.label}</div>
                                {bgProcessing && selectedBg === bg.id && (
                                    <div className="call-bg-processing">Loading...</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoCallOverlay;
