import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { auth, db } from "../firebase";

const DEFAULT_AVATAR = "/profile_image.jpg";

export default function Sidebar({ onSelectUser, selectedUser, currentUser }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    if (!currentUser) return;

    // 1. Listen to Users
    const usersRef = ref(db, "users");
    const unsubUsers = onValue(usersRef, snap => {
      const data = snap.val() || {};
      const list = Object.keys(data)
        .filter(id => id !== currentUser.uid)
        .map(id => ({ uid: id, ...data[id] }));
      setUsers(list);
    });

    // 2. Listen to Unread Counts
    const unreadRef = ref(db, `unread/${currentUser.uid}`);
    const unsubUnread = onValue(unreadRef, snap => {
      setUnreadCounts(snap.val() || {});
    });

    return () => {
      unsubUsers();
      unsubUnread();
    };
  }, [currentUser]);

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-full md:w-80 border-r border-slate-200 dark:border-[#272546] flex flex-col bg-white dark:bg-[#131221] shrink-0 font-display">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-200 dark:border-[#272546]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-lg text-slate-900 dark:text-white">Messages</h1>
          </div>
          <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#272546] transition-colors text-slate-600 dark:text-slate-300">
            <span className="material-symbols-outlined text-[22px]">edit_square</span>
          </button>
        </div>
        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
          <input
            className="w-full bg-slate-100 dark:bg-[#272546] border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-slate-400 text-slate-900 dark:text-white"
            placeholder="Search people..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredUsers.map(u => {
          const isSelected = selectedUser?.uid === u.uid;
          return (
            <div
              key={u.uid}
              onClick={() => onSelectUser(u)}
              className={`flex items-center gap-3 p-4 cursor-pointer transition-colors border-r-4 ${isSelected
                ? "bg-primary/10 border-primary"
                : "hover:bg-slate-50 dark:hover:bg-[#272546]/50 border-transparent"
                }`}
            >
              <div className="relative shrink-0">
                <div
                  className="w-12 h-12 rounded-full bg-cover bg-center bg-slate-200 dark:bg-[#272546]"
                  style={{ backgroundImage: `url(${u.profile_image || DEFAULT_AVATAR})` }}
                ></div>
                {u.online && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#131221] rounded-full"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className={`font-semibold truncate ${isSelected ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-200"}`}>
                    {u.name}
                  </h3>
                  {/* Placeholder time - in real app would match last message time */}
                  {/* <span className="text-[11px] text-slate-500 dark:text-slate-400">12:45 PM</span> */}
                  {unreadCounts[u.uid] > 0 && (
                    <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                      {unreadCounts[u.uid]}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1">
                    {u.lastMessage
                      ? (u.lastMessage.startsWith("Missed Call") && unreadCounts[u.uid] > 0
                        ? <span className="text-red-500 font-medium">{u.lastMessage}</span>
                        : u.lastMessage)
                      : (u.online ? "Online" : "Offline")}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
