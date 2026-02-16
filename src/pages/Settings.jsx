import { signOut, updatePassword, updateProfile } from "firebase/auth";
import { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { get, ref, update } from "firebase/database";
import { uploadBytes, getDownloadURL, ref as sRef } from "firebase/storage";
import { SettingsContext } from "../context/SettingsContext";
import { ThemeContext } from "../context/ThemeContext";
import { auth, db, storage } from "../firebase";

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

  useEffect(() => {
    if (user) {
      setName(user.displayName || "");
      get(ref(db, `users/${user.uid}/about`)).then((snap) => {
        if (snap.exists()) setAbout(snap.val());
        else setAbout("Hey there! I'm using ChatApp");
      });
    }
  }, [user]);

  const handleCreateProfileImage = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    try {
      setSaving(true);
      const storageRef = sRef(storage, `profile_images/${user.uid}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await updateProfile(user, { photoURL: url });
      await update(ref(db, `users/${user.uid}`), {
        profile_image: url
      });
      setSaving(false);
      alert("Profile picture updated!");
    } catch (error) {
      console.error("Error updating profile picture:", error);
      setSaving(false);
      alert("Failed to update profile picture.");
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName: name });
      await update(ref(db, `users/${user.uid}`), {
        name,
        about,
      });
      setUnsavedChanges(false);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to update profile");
    }
    setSaving(false);
  };

  const logout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      await signOut(auth);
      navigate("/login");
    }
  };

  return (
    <div className="flex h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 overflow-hidden font-display">
      {/* Settings Sidebar */}
      <aside className="w-64 border-r border-slate-200 dark:border-[#272546] bg-white dark:bg-[#131221] flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#272546] text-slate-500 transition-colors"
                title="Go Back"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            )}
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 -mt-2">Manage your account</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {[
            { id: "profile", icon: "person", label: "Profile" },
            { id: "notifications", icon: "notifications", label: "Notifications" },
            { id: "security", icon: "shield", label: "Security" },
            { id: "general", icon: "settings", label: "General" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${activeTab === item.id
                ? "bg-primary text-white shadow-lg shadow-primary/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#272546]"
                }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-[#272546]">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-medium"
          >
            <span className="material-symbols-outlined">logout</span>
            Log out
          </button>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto p-8 md:p-12 relative">
        <div className="max-w-3xl mx-auto space-y-12 pb-24">

          {/* Profile Section */}
          <section id="profile" className={activeTab === 'profile' ? 'block' : 'hidden'}>
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-primary text-3xl">person</span>
              <h2 className="text-2xl font-bold">Profile Settings</h2>
            </div>

            <div className="bg-white dark:bg-[#1b1a2e] rounded-2xl border border-slate-200 dark:border-[#272546] p-8 shadow-sm">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="relative group mx-auto md:mx-0">
                  <div className="w-32 h-32 rounded-full border-4 border-slate-100 dark:border-[#272546] overflow-hidden bg-slate-100 dark:bg-[#272546]">
                    <img
                      src={user?.photoURL || "/profile_image.jpg"}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <label className="absolute bottom-0 right-0 bg-primary text-white p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer" title="Edit Profile Picture">
                    <span className="material-symbols-outlined text-xl">edit</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleCreateProfileImage} />
                  </label>
                </div>

                <div className="flex-1 w-full space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Display Name</label>
                      <input
                        className="w-full bg-slate-50 dark:bg-[#272546] border border-slate-200 dark:border-transparent rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setUnsavedChanges(true); }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                      <input
                        className="w-full bg-slate-100 dark:bg-[#131221] border border-transparent rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed"
                        disabled
                        type="email"
                        value={user?.email || ""}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Bio</label>
                    <textarea
                      className="w-full bg-slate-50 dark:bg-[#272546] border border-slate-200 dark:border-transparent rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none dark:text-white"
                      placeholder="Tell us a bit about yourself..."
                      rows="4"
                      value={about}
                      onChange={(e) => { setAbout(e.target.value); setUnsavedChanges(true); }}
                    ></textarea>
                    <p className="text-xs text-right text-slate-400">{about.length}/139</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Notifications Section */}
          <section id="notifications" className={activeTab === 'notifications' ? 'block' : 'hidden'}>
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-primary text-3xl">notifications</span>
              <h2 className="text-2xl font-bold">Notifications</h2>
            </div>

            <div className="bg-white dark:bg-[#1b1a2e] rounded-2xl border border-slate-200 dark:border-[#272546] divide-y divide-slate-100 dark:divide-[#272546] shadow-sm">
              {[
                { id: "notificationsEnabled", label: "Message Notifications", desc: "Show notifications for new messages" },
                { id: "soundEnabled", label: "Sound Effects", desc: "Play a sound for incoming messages" },
                { id: "messagePreview", label: "Message Preview", desc: "Show message content in notifications" }
              ].map((setting) => (
                <div key={setting.id} className="flex items-center justify-between p-6">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{setting.label}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{setting.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings[setting.id]}
                      onChange={() => updateSetting(setting.id, !settings[setting.id])}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-[#272546] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              ))}
            </div>
          </section>

          {/* Security Section */}
          <section id="security" className={activeTab === 'security' ? 'block' : 'hidden'}>
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-primary text-3xl">shield</span>
              <h2 className="text-2xl font-bold">Security</h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white dark:bg-[#1b1a2e] rounded-2xl border border-slate-200 dark:border-[#272546] p-8 shadow-sm space-y-6">
                <h3 className="font-bold flex items-center gap-2 text-lg">
                  <span className="material-symbols-outlined">key</span>
                  Change Password
                </h3>
                <div className="space-y-4">
                  <input className="w-full bg-slate-50 dark:bg-[#272546] border-slate-200 dark:border-transparent rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none dark:text-white" placeholder="Current Password" type="password" />
                  <input className="w-full bg-slate-50 dark:bg-[#272546] border-slate-200 dark:border-transparent rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none dark:text-white" placeholder="New Password" type="password" />
                  <button className="px-6 py-3 bg-slate-100 dark:bg-[#272546] hover:bg-slate-200 dark:hover:bg-[#343163] font-bold rounded-xl transition-colors text-slate-700 dark:text-white">Update Password</button>
                </div>
              </div>
            </div>
          </section>

          {/* General Section */}
          <section id="general" className={activeTab === 'general' ? 'block' : 'hidden'}>
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-primary text-3xl">settings</span>
              <h2 className="text-2xl font-bold">General</h2>
            </div>

            <div className="bg-white dark:bg-[#1b1a2e] rounded-2xl border border-slate-200 dark:border-[#272546] p-8 shadow-sm space-y-8">

              <div className="space-y-4">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Appearance Theme</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setDark(true)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${dark ? "border-primary bg-primary/5" : "border-slate-200 dark:border-[#272546]"}`}
                  >
                    <div className="h-16 w-full rounded-lg bg-[#1e293b] relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 w-1/3 bg-[#0f172a]"></div>
                    </div>
                    <span className="font-bold text-sm">Dark Theme</span>
                  </button>

                  <button
                    onClick={() => setDark(false)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${!dark ? "border-primary bg-primary/5" : "border-slate-200 dark:border-[#272546]"}`}
                  >
                    <div className="h-16 w-full rounded-lg bg-white border border-slate-200 relative overflow-hidden">
                      <div className="absolute inset-y-0 left-0 w-1/3 bg-slate-50"></div>
                    </div>
                    <span className="font-bold text-sm">Light Theme</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Enter to Send</label>
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-[#272546] rounded-xl">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Send message when pressing Enter key</p>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.enterToSend}
                      onChange={() => updateSetting("enterToSend", !settings.enterToSend)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none dark:bg-[#131221] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>

            </div>
          </section>

        </div>

        {/* Save Bar */}
        {unsavedChanges && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in">
            <div className="bg-white/90 dark:bg-[#1b1a2e]/90 backdrop-blur-md border border-slate-200 dark:border-[#272546] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">You have unsaved changes</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setUnsavedChanges(false)}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#272546] transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-6 py-2 rounded-lg text-sm font-bold bg-primary text-white hover:opacity-90 shadow-lg shadow-primary/25 transition-all"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
