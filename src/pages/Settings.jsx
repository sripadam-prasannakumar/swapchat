import { signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile } from "firebase/auth";
import { useContext, useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { get, ref, update, onValue } from "firebase/database";
import { uploadBytes, getDownloadURL, ref as sRef } from "firebase/storage";
import Cropper from "react-easy-crop";
import getCroppedImg from "../utils/cropImage";
import { SettingsContext } from "../context/SettingsContext";
import { ThemeContext } from "../context/ThemeContext";
import { auth, db, storage } from "../firebase";
import FullscreenImageViewer from "../Components/FullscreenImageViewer";

// Simple toast notification
function Toast({ msg, type = "success", onDone }) {
    useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
    return (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-bottom-4 fade-in ${type === "error" ? "bg-red-500" : "bg-green-500"}`}>
            <span className="material-symbols-outlined text-[18px]">{type === "error" ? "error" : "check_circle"}</span>
            {msg}
        </div>
    );
}

export default function Settings({ initialTab = "profile", onBack }) {
    const navigate = useNavigate();
    const { dark, setDark } = useContext(ThemeContext);
    const { settings, updateSetting } = useContext(SettingsContext);

    const user = auth.currentUser;
    const [activeTab, setActiveTab] = useState(initialTab);

    // Profile State
    const [name, setName] = useState(user?.displayName || "");
    const [about, setAbout] = useState("");
    const [saving, setSaving] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [toast, setToast] = useState(null);

    // Profile image
    const [savedProfileImage, setSavedProfileImage] = useState(user?.photoURL || "/profile_image.jpg");
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // Cropping State
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [showCropModal, setShowCropModal] = useState(false);

    // Profile Menu & Viewer State
    const [showPhotoMenu, setShowPhotoMenu] = useState(false);
    const [showFullscreenPhoto, setShowFullscreenPhoto] = useState(false);

    // Live Camera State
    const [showCamera, setShowCamera] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const videoRef = useRef(null);

    // Change Password
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pwLoading, setPwLoading] = useState(false);

    const showToast = (msg, type = "success") => setToast({ msg, type });

    useEffect(() => {
        if (!user) return;
        setName(user.displayName || "");
        get(ref(db, `users/${user.uid}/about`)).then(snap => {
            setAbout(snap.exists() ? snap.val() : "Hey there! I'm using ChatApp");
        });
        const imgRef = ref(db, `users/${user.uid}/profile_image`);
        const unsub = onValue(imgRef, snap => {
            if (snap.exists()) setSavedProfileImage(snap.val());
        });
        return () => unsub();
    }, [user]);

    const onCropComplete = useCallback((_area, areaPixels) => {
        setCroppedAreaPixels(areaPixels);
    }, []);

    const handleCreateProfileImage = (e) => {
        const file = e.target.files[0];
        if (!file || !user) return;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            setImageToCrop(reader.result);
            setShowCropModal(true);
        };
        e.target.value = ""; // Reset input
    };

    const handleCropSave = async () => {
        if (!imageToCrop || !user) {
            console.error("Upload aborted: No image content or no authorized user.");
            setShowCropModal(false);
            return;
        }

        console.log("Starting profile photo upload process...");
        setUploadingPhoto(true);
        setShowCropModal(false);

        // Emergency timeout - 45s hard reset
        const timeoutId = setTimeout(() => {
            console.error("CRITICAL ERROR: Profile upload process exceeded 45s timeout.");
            setUploadingPhoto(false);
            showToast("Upload timed out. Check your internet connection.", "error");
        }, 45000);

        try {
            console.log("Analyzing crop metadata...", croppedAreaPixels);
            const finalCrop = croppedAreaPixels || { x: 0, y: 0, width: 400, height: 400 };

            const croppedBlob = await getCroppedImg(imageToCrop, finalCrop);
            if (!croppedBlob) throw new Error("Image processing failed: no data returned.");

            console.log("Cropped image ready. Size:", (croppedBlob.size / 1024).toFixed(2), "KB");

            const filename = `profile_images/${user.uid}_${Date.now()}.jpg`;
            const storageRef = sRef(storage, filename);

            // Use a specific timeout for the storage upload to catch CORS issues quickly
            const uploadToStorage = async () => {
                console.log("Uploading bytes to Firebase Storage...");
                await uploadBytes(storageRef, croppedBlob);
                return await getDownloadURL(storageRef);
            };

            const storageTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("STORAGE_TIMEOUT")), 8000)
            );

            let url;
            try {
                // Race the upload against a 8s timeout to detect CORS blocks quickly
                url = await Promise.race([uploadToStorage(), storageTimeout]);
                console.log("Upload successful. Syncing profile...");
                await updateProfile(user, { photoURL: url });
                await update(ref(db, `users/${user.uid}`), { profile_image: url });
                setSavedProfileImage(url);
                showToast("Profile photo updated!");
            } catch (storageErr) {
                console.warn("Storage upload failed (likely CORS or Timeout). Falling back to Base64...", storageErr);

                const base64Url = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(croppedBlob);
                });

                // CRITICAL: Bypass updateProfile for Base64 strings (Firebase Auth has a length limit)
                await update(ref(db, `users/${user.uid}`), { profile_image: base64Url });
                setSavedProfileImage(base64Url);
                showToast("Profile updated (Secondary Storage)");

                if (storageErr.message === "STORAGE_TIMEOUT" || storageErr.name === "FirebaseError") {
                    console.info("TIP: If you see CORS errors in console, please apply the firebase_cors.json fix.");
                }
            }
        } catch (e) {
            console.error("Profile upload encountered a fatal error:", e);
            showToast(`Upload failed: ${e.message}`, "error");
        } finally {
            clearTimeout(timeoutId);
            setUploadingPhoto(false);
            setImageToCrop(null);
            console.log("Profile upload flow finalized. UI state reset.");
        }
    };

    // --- Camera Logic ---
    const handleStartCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720, facingMode: "user" }
            });
            setCameraStream(stream);
            setShowCamera(true);
            setShowPhotoMenu(false); // Close menu
        } catch (err) {
            console.error("Error accessing camera:", err);
            showToast("Could not access camera. Please check permissions.", "error");
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setShowCamera(false);
    };

    const handleCapturePhoto = () => {
        if (!videoRef.current) return;

        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0);

        canvas.toBlob((blob) => {
            if (!blob) return;
            const reader = new FileReader();
            reader.onload = () => {
                setImageToCrop(reader.result);
                setShowCropModal(true);
                stopCamera();
            };
            reader.readAsDataURL(blob);
        }, "image/jpeg", 0.95);
    };

    useEffect(() => {
        if (showCamera && cameraStream && videoRef.current) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [showCamera, cameraStream]);

    // Cleanup camera on unmount
    useEffect(() => {
        return () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [cameraStream]);

    const handleRemovePhoto = async () => {
        if (!window.confirm("Remove profile photo?")) return;
        setUploadingPhoto(true);
        try {
            await updateProfile(user, { photoURL: "" });
            await update(ref(db, `users/${user.uid}`), { profile_image: "" });
            setSavedProfileImage("/profile_image.jpg");
            showToast("Profile photo removed.");
        } catch (e) {
            showToast("Failed to remove photo.", "error");
        }
        setUploadingPhoto(false);
    };

    const saveProfile = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await updateProfile(user, { displayName: name });
            await update(ref(db, `users/${user.uid}`), { name, about });
            setUnsavedChanges(false);
            showToast("Profile updated successfully!");
        } catch {
            showToast("Failed to update profile.", "error");
        }
        setSaving(false);
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast("Please fill in all password fields.", "error"); return;
        }
        if (newPassword !== confirmPassword) {
            showToast("New passwords do not match.", "error"); return;
        }
        if (newPassword.length < 6) {
            showToast("Password must be at least 6 characters.", "error"); return;
        }
        setPwLoading(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
            showToast("Password changed successfully!");
        } catch (e) {
            if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
                showToast("Current password is incorrect.", "error");
            } else {
                showToast(e.message || "Failed to change password.", "error");
            }
        }
        setPwLoading(false);
    };

    const logout = async () => {
        if (window.confirm("Are you sure you want to logout?")) {
            await signOut(auth);
            navigate("/login");
        }
    };

    return (
        <div className="flex h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 overflow-hidden font-display">
            {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

            {/* Settings Side Navigation */}
            <aside className="w-80 border-r border-slate-100 dark:border-border-dark bg-white dark:bg-background-dark flex flex-col shrink-0">
                <div className="p-8">
                    <div className="flex items-center gap-4 mb-6">
                        {onBack && (
                            <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-surface-dark text-slate-400 transition-all border border-slate-100 dark:border-border-dark" title="Go Back">
                                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                            </button>
                        )}
                        <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
                    </div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Configure your personal preference</p>
                </div>

                <nav className="flex-1 px-6 flex flex-col gap-2">
                    {[
                        { id: "profile", icon: "person", label: "Account Profile" },
                        { id: "notifications", icon: "notifications", label: "Notifications" },
                        { id: "security", icon: "shield", label: "Security & Privacy" },
                        { id: "general", icon: "display_settings", label: "Appearance" },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-200 group font-bold
                                ${activeTab === item.id
                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                                }`}
                        >
                            <span className={`material-symbols-outlined text-[24px] ${activeTab === item.id ? "fill-current" : ""}`}>{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-6 border-t border-slate-50 dark:border-border-dark">
                    <button onClick={logout} className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all font-bold">
                        <span className="material-symbols-outlined text-[22px]">logout</span>
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto p-12 md:p-16 relative custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-12 pb-32">

                    {/* ── PROFILE ── */}
                    <section id="profile" className={activeTab === "profile" ? "block animate-in fade-in slide-in-from-bottom-5 duration-500" : "hidden"}>
                        <div className="pb-6 border-b border-slate-100 dark:border-slate-800 mb-8 text-left">
                            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Account Profile</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your public information and avatar</p>
                        </div>

                        <div className="settings-card p-10">
                            <div className="flex flex-col gap-8">
                                <div className="flex flex-col items-center">
                                    <div className="relative group">
                                        <div
                                            className="w-36 h-36 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-slate-800 ring-4 ring-primary/10 cursor-pointer transition-transform active:scale-95"
                                            onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                                        >
                                            <img
                                                src={savedProfileImage}
                                                alt="Profile"
                                                onError={(e) => {
                                                    console.warn("Profile image failed to load, falling back to default.");
                                                    e.target.src = "/profile_image.jpg";
                                                }}
                                                className={`w-full h-full object-cover transition-opacity duration-300 ${uploadingPhoto ? "opacity-30" : "opacity-100"}`}
                                            />
                                            {uploadingPhoto && (
                                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                                    <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                                </div>
                                            )}

                                            {/* Hover Overlay */}
                                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="material-symbols-outlined text-white text-3xl mb-1">photo_camera</span>
                                                <span className="text-white text-[10px] uppercase font-bold tracking-widest">Change photo</span>
                                            </div>
                                        </div>

                                        {/* Dropdown Menu */}
                                        {showPhotoMenu && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setShowPhotoMenu(false)}></div>
                                                <div className="absolute left-1/2 mt-2 -translate-x-1/2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                                    <button
                                                        onClick={() => { setShowFullscreenPhoto(true); setShowPhotoMenu(false); }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-slate-700 dark:text-slate-200 font-medium"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px] text-slate-400">visibility</span>
                                                        View photo
                                                    </button>
                                                    <button
                                                        onClick={handleStartCamera}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-slate-700 dark:text-slate-200 font-medium"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px] text-slate-400">photo_camera</span>
                                                        Take photo
                                                    </button>
                                                    <button
                                                        onClick={() => { document.getElementById('fileInput').click(); setShowPhotoMenu(false); }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-slate-700 dark:text-slate-200 font-medium"
                                                    >
                                                        <span className="material-symbols-outlined text-[20px] text-slate-400">image</span>
                                                        Upload photo
                                                    </button>
                                                    {savedProfileImage !== "/profile_image.jpg" && (
                                                        <button
                                                            onClick={() => { handleRemovePhoto(); setShowPhotoMenu(false); }}
                                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-red-500 font-medium border-t border-slate-50 dark:border-slate-700/50 mt-1"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                                            Remove photo
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        {/* Hidden Inputs */}
                                        <input id="fileInput" type="file" className="hidden" accept="image/*" onChange={handleCreateProfileImage} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Display Name</label>
                                        <input
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            type="text"
                                            value={name}
                                            placeholder="Your full name"
                                            onChange={e => { setName(e.target.value); setUnsavedChanges(true); }}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
                                        <div className="relative">
                                            <input className="w-full px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-500 cursor-not-allowed" disabled type="email" value={user?.email || ""} />
                                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">lock</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-end ml-1">
                                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">About Me</label>
                                            <span className={`text-[10px] font-bold ${about.length > 120 ? "text-orange-500" : "text-slate-400"}`}>{about.length}/139</span>
                                        </div>
                                        <textarea
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[100px] resize-none"
                                            placeholder="Share a little bit about yourself..."
                                            value={about}
                                            onChange={e => { setAbout(e.target.value); setUnsavedChanges(true); }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── NOTIFICATIONS ── */}
                    <section id="notifications" className={activeTab === "notifications" ? "block animate-in fade-in slide-in-from-bottom-5 duration-500" : "hidden"}>
                        <div className="section-header">
                            <h2 className="section-title-premium">Notifications</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">Choose what you want to be notified about</p>
                        </div>

                        <div className="settings-card divide-y divide-slate-50 dark:divide-border-dark">
                            {[
                                { id: "notificationsEnabled", label: "Desktop Notifications", desc: "Get real-time alerts on your computer", icon: "desktop_windows" },
                                { id: "soundEnabled", label: "Play Sound", desc: "Notification sounds for incoming messages", icon: "volume_up" },
                                { id: "messagePreview", label: "Show Preview", desc: "Display message content in notifications", icon: "visibility" },
                            ].map(s => (
                                <div key={s.id} className="settings-item-row group">
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-surface-dark flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                            <span className="material-symbols-outlined">{s.icon}</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white text-[15px]">{s.label}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{s.desc}</p>
                                        </div>
                                    </div>
                                    <label className="premium-switch">
                                        <input type="checkbox" checked={settings[s.id]} onChange={() => updateSetting(s.id, !settings[s.id])} />
                                        <span className="premium-slider" />
                                    </label>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ── SECURITY ── */}
                    <section id="security" className={activeTab === "security" ? "block animate-in fade-in slide-in-from-bottom-5 duration-500" : "hidden"}>
                        <div className="pb-6 border-b border-slate-100 dark:border-slate-800 mb-8">
                            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Security & Privacy</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">Update your password and manage session security</p>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-10 space-y-10">
                            <div className="flex items-center gap-4 border-b border-slate-50 dark:border-border-dark pb-6">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined font-bold">lock_reset</span>
                                </div>
                                <h3 className="text-xl font-extrabold tracking-tight">Update Password</h3>
                            </div>

                            <div className="grid grid-cols-1 gap-8">
                                <div className="space-y-3">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Current Password</label>
                                    <input
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        placeholder="Enter your current password" type="password"
                                        value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">New Password</label>
                                        <input
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            placeholder="Min. 6 characters" type="password"
                                            value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Confirm Password</label>
                                        <input
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                            placeholder="Repeat new password" type="password"
                                            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                            onKeyDown={e => e.key === "Enter" && handleChangePassword()}
                                        />
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <button
                                        onClick={handleChangePassword}
                                        disabled={pwLoading}
                                        className="flex items-center justify-center gap-3 bg-primary text-white font-bold py-4 px-10 rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
                                    >
                                        {pwLoading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined">security</span>
                                                Change Security Password
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ── GENERAL / APPEARANCE ── */}
                    <section id="general" className={activeTab === "general" ? "block animate-in fade-in slide-in-from-bottom-5 duration-500" : "hidden"}>
                        <div className="pb-6 border-b border-slate-100 dark:border-slate-800 mb-8">
                            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Appearance Settings</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">Customize the look and feel of your experience</p>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-10">
                                <label className="text-lg font-extrabold mb-8 block tracking-tight">System Theme</label>
                                <div className="grid grid-cols-2 gap-8">
                                    <button
                                        onClick={() => setDark(true)}
                                        className={`flex flex-col gap-5 p-6 rounded-3xl border-2 transition-all group ${dark
                                            ? "border-primary bg-primary/5 shadow-premium"
                                            : "border-slate-100 dark:border-border-dark hover:border-slate-200"}`}
                                    >
                                        <div className="aspect-video w-full rounded-2xl bg-[#0f172a] shadow-inner relative overflow-hidden ring-1 ring-white/5">
                                            <div className="absolute top-4 left-4 right-4 h-3 bg-[#1e293b] rounded-full opacity-50" />
                                            <div className="absolute top-10 left-4 w-1/2 h-2.5 bg-primary/40 rounded-full" />
                                            <div className="absolute bottom-4 right-4 w-12 h-12 bg-primary/20 rounded-2xl blur-xl" />
                                        </div>
                                        <div className="flex items-center justify-between w-full">
                                            <span className="font-bold">Dark Dimension</span>
                                            {dark && <span className="material-symbols-outlined text-primary font-black">check_circle</span>}
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setDark(false)}
                                        className={`flex flex-col gap-5 p-6 rounded-3xl border-2 transition-all group ${!dark
                                            ? "border-primary bg-primary/5 shadow-premium"
                                            : "border-slate-100 dark:border-border-dark hover:border-slate-300"}`}
                                    >
                                        <div className="aspect-video w-full rounded-2xl bg-slate-50 shadow-inner relative overflow-hidden ring-1 ring-black/5">
                                            <div className="absolute top-4 left-4 right-4 h-3 bg-slate-200 rounded-full opacity-50" />
                                            <div className="absolute top-10 left-4 w-1/2 h-2.5 bg-primary/20 rounded-full" />
                                            <div className="absolute bottom-4 right-4 w-12 h-12 bg-primary/10 rounded-2xl blur-xl" />
                                        </div>
                                        <div className="flex items-center justify-between w-full">
                                            <span className="font-bold">Light Aura</span>
                                            {!dark && <span className="material-symbols-outlined text-primary font-black">check_circle</span>}
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                <div className="flex items-center justify-between py-8 px-10">
                                    <div className="flex items-center gap-6">
                                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 flex items-center justify-center text-indigo-500 transition-colors">
                                            <span className="material-symbols-outlined text-[28px]">keyboard_return</span>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white text-lg">Enter to Send</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Send message instantly when pressing Enter</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => updateSetting("enterToSend", !settings.enterToSend)}
                                        className={`w-12 h-6 rounded-full relative transition-colors ${settings.enterToSend ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.enterToSend ? "left-7" : "left-1"}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                </div>

                {/* Floating Save Bar */}
                {unsavedChanges && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl p-4 flex items-center gap-8 animate-in slide-in-from-bottom-10 z-50">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-orange-500">
                                <span className="material-symbols-outlined">warning</span>
                            </div>
                            <p className="font-bold text-slate-700 dark:text-slate-200 tracking-tight">Unsaved changes</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => { setName(user?.displayName || ""); setUnsavedChanges(false); }} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">Discard</button>
                            <button onClick={saveProfile} disabled={saving} className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                                {saving ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : "Save Changes"}
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* ── CROP MODAL ── */}
            {showCropModal && (
                <div className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-start overflow-y-auto p-4 sm:p-8 animate-in fade-in duration-300">
                    <div className="w-full max-w-xl flex flex-col gap-6 my-auto">
                        <div className="flex items-center justify-between text-white">
                            <div>
                                <h3 className="text-xl font-bold tracking-tight">Crop Profile Photo</h3>
                                <p className="text-sm text-slate-400 mt-1">Drag to position, scroll to zoom</p>
                            </div>
                            <button onClick={() => setShowCropModal(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="relative aspect-square w-full max-h-[50vh] sm:max-h-[60vh] rounded-3xl overflow-hidden bg-slate-900 shadow-2xl ring-1 ring-white/10">
                            <Cropper
                                image={imageToCrop}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                cropShape="round"
                                showGrid={false}
                            />
                        </div>

                        <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 space-y-6">
                            <div className="flex items-center gap-6">
                                <span className="material-symbols-outlined text-white/50">zoom_in</span>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(e.target.value)}
                                    className="flex-1 accent-primary h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                                />
                                <span className="text-white font-mono text-sm w-8">{Math.round(zoom * 100)}%</span>
                            </div>

                            <div className="flex items-center gap-4 pt-2">
                                <button
                                    onClick={() => setShowCropModal(false)}
                                    className="flex-1 py-4 px-6 rounded-2xl font-bold text-white hover:bg-white/10 transition-all border border-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCropSave}
                                    className="flex-[2] py-4 px-6 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[20px]">check</span>
                                    Set as Profile Photo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── CAMERA MODAL ── */}
            {showCamera && (
                <div className="fixed inset-0 z-[15000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl flex flex-col gap-6">
                        <div className="flex items-center justify-between text-white">
                            <div>
                                <h3 className="text-xl font-bold tracking-tight text-white">Live Camera</h3>
                                <p className="text-sm text-slate-400 mt-1">Center yourself and snap a photo</p>
                            </div>
                            <button onClick={stopCamera} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="relative aspect-square sm:aspect-video w-full rounded-3xl overflow-hidden bg-slate-900 shadow-2xl ring-1 ring-white/10">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                                style={{ transform: 'scaleX(-1)' }} // Mirror the preview
                            />

                            {/* Shutter Button Overlay */}
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6">
                                <button
                                    onClick={handleCapturePhoto}
                                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center group active:scale-90 transition-all p-1"
                                >
                                    <div className="w-full h-full rounded-full bg-white group-hover:bg-slate-200 transition-colors" />
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-center pt-2">
                            <button onClick={stopCamera} className="text-white/60 hover:text-white font-bold transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── FULLSCREEN PHOTO VIEWER ── */}
            {showFullscreenPhoto && (
                <FullscreenImageViewer
                    src={savedProfileImage}
                    onClose={() => setShowFullscreenPhoto(false)}
                    title="Profile photo"
                    isMine={true}
                    onEdit={() => { document.getElementById('fileInput').click(); setShowFullscreenPhoto(false); }}
                    onDelete={handleRemovePhoto}
                />
            )}
        </div>
    );
}
