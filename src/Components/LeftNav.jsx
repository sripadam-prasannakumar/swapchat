import { useContext, useState, useEffect } from "react";
import { ThemeContext } from "../context/ThemeContext";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import logo from "../logo.svg";

const LeftNav = ({ onSelect, activeScreen, currentUser }) => {
    const { dark, setDark } = useContext(ThemeContext);
    const [profileImage, setProfileImage] = useState("/profile_image.jpg");

    // Listen for real-time profile image updates from Firebase
    useEffect(() => {
        if (!currentUser?.uid) return;
        const userRef = ref(db, `users/${currentUser.uid}/profile_image`);
        const unsub = onValue(userRef, (snap) => {
            if (snap.exists()) setProfileImage(snap.val());
            else setProfileImage(currentUser.photoURL || "/profile_image.jpg");
        });
        return () => unsub();
    }, [currentUser]);

    const navBtn = (screen, icon, label) => (
        <button
            onClick={() => onSelect(screen)}
            className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300
        ${activeScreen === screen
                    ? "bg-primary/10 text-primary shadow-premium"
                    : "text-slate-400 hover:bg-slate-50 dark:hover:bg-surface-dark hover:text-slate-600 dark:hover:text-slate-200"
                }`}
            title={label}
        >
            <span className={`material-symbols-outlined text-[26px] ${activeScreen === screen ? "font-bold" : ""}`}>{icon}</span>
        </button>
    );

    return (
        <div className="w-[64px] bg-[#eae6df] dark:bg-[#111b21] flex flex-col items-center py-6 justify-between shrink-0 z-20 border-r border-slate-200 dark:border-white/5">
            <div className="flex flex-col gap-6 w-full items-center relative">
                {/* Dynamic Active Indicator */}
                <div
                    className="absolute left-0 w-1 bg-primary rounded-r-lg transition-all duration-300 ease-in-out"
                    style={{
                        height: "40px",
                        top: activeScreen === "chats" ? "0px" : activeScreen === "ai" ? "64px" : "128px",
                        opacity: ["chats", "ai", "settings"].includes(activeScreen) ? 1 : 0
                    }}
                />

                {/* Logo / Chats */}
                <button
                    onClick={() => onSelect("chats")}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95
            ${activeScreen === "chats"
                            ? "bg-[#00a884] text-white shadow-md shadow-[#00a884]/20"
                            : "text-slate-500 dark:text-slate-400 hover:bg-black/5"
                        }`}
                    title="Chats"
                >
                    <span className="material-symbols-outlined text-[24px]">chat</span>
                </button>

                {/* AI Bot */}
                <button
                    onClick={() => onSelect("ai")}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all relative group hover:scale-105 active:scale-95
            ${activeScreen === "ai"
                            ? "bg-[#0ea5e9] text-white shadow-md shadow-[#0ea5e9]/20"
                            : "text-slate-500 dark:text-slate-400 hover:bg-black/5"
                        }`}
                    title="AI Chatbot"
                >
                    <span className="material-symbols-outlined text-[24px]">smart_toy</span>
                    {activeScreen !== "ai" && (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#0ea5e9] border border-[#eae6df] dark:border-[#111b21]" />
                    )}
                </button>

                {/* Settings */}
                <button
                    onClick={() => onSelect("settings")}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95
            ${activeScreen === "settings"
                            ? "bg-slate-300 dark:bg-white/20 text-slate-800 dark:text-white"
                            : "text-slate-500 dark:text-slate-400 hover:bg-black/5"
                        }`}
                    title="Settings"
                >
                    <span className="material-symbols-outlined text-[24px]">settings</span>
                </button>
            </div>

            <div className="flex flex-col gap-8 w-full items-center">
                <button
                    onClick={() => setDark(!dark)}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 hover:bg-slate-50 dark:hover:bg-surface-dark hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                    title="Toggle Theme"
                >
                    <span className="material-symbols-outlined text-[26px]">
                        {dark ? "light_mode" : "dark_mode"}
                    </span>
                </button>

                <div className="relative cursor-pointer group p-1 rounded-2xl border-2 border-transparent hover:border-primary/30 transition-all" onClick={() => onSelect("profile")}>
                    <img
                        src={profileImage}
                        className="w-10 h-10 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform"
                        alt="profile"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-background-dark rounded-full shadow-sm"></div>
                </div>
            </div>
        </div>
    );
};

export default LeftNav;
