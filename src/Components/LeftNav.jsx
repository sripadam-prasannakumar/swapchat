import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";
import logo from "../logo.svg";

const LeftNav = ({ onSelect }) => {
  const { dark, setDark } = useContext(ThemeContext);

  return (
    <div className="w-[72px] bg-background-light dark:bg-[#202c33] border-r border-slate-200 dark:border-[#2a3942] flex flex-col items-center py-6 justify-between shrink-0 z-20">
      <div className="flex flex-col gap-6 w-full items-center">
        <button
          onClick={() => onSelect("chats")}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 shadow-lg shadow-primary/30 transition-all hover:scale-105"
          title="Chats"
        >
          <img src={logo} alt="Logo" className="w-8 h-8" />
        </button>
        <button
          onClick={() => onSelect("settings")}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-[#2a3942] dark:text-slate-400 transition-all"
          title="Settings"
        >
          <span className="material-symbols-outlined text-[24px]">settings</span>
        </button>
      </div>

      <div className="flex flex-col gap-6 w-full items-center">
        <button
          onClick={() => setDark(!dark)}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-[#2a3942] dark:text-slate-400 transition-all"
          title="Toggle Theme"
        >
          <span className="material-symbols-outlined text-[24px]">
            {dark ? "light_mode" : "dark_mode"}
          </span>
        </button>

        <div className="relative cursor-pointer group" onClick={() => onSelect("profile")}>
          <img
            src="/profile_image.jpg"
            className="w-10 h-10 rounded-xl object-cover border-2 border-white dark:border-[#2a3942] shadow-sm group-hover:border-primary transition-colors"
            alt="profile"
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#202c33] rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default LeftNav;

