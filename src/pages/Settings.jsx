import { signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider, updateProfile } from "firebase/auth";
import { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, ref, update, onValue } from "firebase/database";
import { uploadBytes, getDownloadURL, ref as sRef } from "firebase/storage";
import { SettingsContext } from "../context/SettingsContext";
import { ThemeContext } from "../context/ThemeContext";
import { auth, db, storage } from "../firebase";

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
    const [profilePreview, setProfilePreview] = useState(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

    const handleCreateProfileImage = async (e) => {
        const file = e.target.files[0];
        if (!file || !user) return;
        const localUrl = URL.createObjectURL(file);
        setProfilePreview(localUrl);
        setUploadingPhoto(true);
        try {
            const storageRef = sRef(storage, `profile_images/${user.uid}_${Date.now()}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            await updateProfile(user, { photoURL: url });
            await update(ref(db, `users/${user.uid}`), { profile_image: url });
            setUploadingPhoto(false);
            setProfilePreview(null);
            showToast("Profile photo updated!");
        } catch (storageError) {
            console.warn("Firebase Storage upload failed, using base64 fallback:", storageError);
            try {
                const base64Url = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement("canvas");
                            const maxSize = 200;
                            let w = img.width, h = img.height;
                            if (w > h) { h = (h / w) * maxSize; w = maxSize; }
                            else { w = (w / h) * maxSize; h = maxSize; }
                            canvas.width = w; canvas.height = h;
                            canvas.getContext("2d").drawImage(img, 0, 0, w, h);
                            resolve(canvas.toDataURL("image/jpeg", 0.7));
                        };
                        img.onerror = reject;
                        img.src = reader.result;
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                await updateProfile(user, { photoURL: base64Url });
                await update(ref(db, `users/${user.uid}`), { profile_image: base64Url });
                showToast("Profile photo updated!");
            } catch {
                showToast("Failed to update profile picture.", "error");
            }
            setUploadingPhoto(false);
            setProfilePreview(null);
        }
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
        <div className="flex h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 overflow-hidden font-display">
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
                        <div className="pb-6 border-b border-slate-100 dark:border-slate-800 mb-8">
                            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Account Profile</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your public information and avatar</p>
                        </div>

                        <div className="settings-card p-10">
                            <div className="flex flex-col gap-8">
                                <div className="flex flex-col items-center">
                                    <div className="relative group">
                                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-slate-800">
                                            <img
                                                src={profilePreview || savedProfileImage}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                            {uploadingPhoto && (
                                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                                                    <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        <label className="absolute bottom-1 right-1 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform border-4 border-white dark:border-slate-900" title="Update Photo">
                                            <span className="material-symbols-outlined text-[20px]">camera_alt</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleCreateProfileImage} />
                                        </label>
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
        </div>
    );
}
