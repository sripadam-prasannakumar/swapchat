import { useEffect, useRef, useState } from "react";
import { ref, onValue } from "firebase/database";
import { auth, db } from "../firebase";
import CreateGroupModal from "./CreateGroupModal";

const DEFAULT_AVATAR = "/profile_image.jpg";

// Format last-message time
function formatLastTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === yesterday.toDateString())
    return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

// Initials avatar for groups
function GroupAvatar({ group }) {
  return (
    <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm flex-shrink-0">
      {group.emoji || "👥"}
    </div>
  );
}

const FILTERS = ["All", "Personal", "Groups", "Unread"];

export default function Sidebar({ onSelectUser, selectedUser, currentUser }) {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [groupUnread, setGroupUnread] = useState({});

  // Long-press selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  // Long-press timer ref
  const pressTimerRef = useRef(null);
  const didLongPress = useRef(false);

  /* ─── Live listeners ─── */
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Users (All contacts)
    const usersRef = ref(db, "users");
    const unsubUsers = onValue(usersRef, (snap) => {
      const data = snap.val() || {};
      const list = Object.keys(data)
        .filter(id => id !== currentUser.uid)
        .map(id => ({ uid: id, ...data[id] }));
      setUsers(list);
    }, (err) => console.error("Users listener error:", err));

    // Unread P2P
    const unreadRef = ref(db, `unread/${currentUser.uid}`);
    const unsubUnread = onValue(unreadRef, snap => {
      setUnreadCounts(snap.val() || {});
    });

    // Groups where user is member
    const groupsRef = ref(db, "groups");
    const unsubGroups = onValue(groupsRef, snap => {
      const d = snap.val() || {};
      const myGroups = Object.keys(d)
        .filter(gid => d[gid]?.members?.[currentUser.uid])
        .map(gid => ({ groupId: gid, isGroup: true, ...d[gid] }));
      setGroups(myGroups);
    });

    // Group unread
    const gUnreadRef = ref(db, "groupUnread");
    const unsubGUnread = onValue(gUnreadRef, snap => {
      const d = snap.val() || {};
      const myGroupUnread = {};
      Object.keys(d).forEach(gid => {
        myGroupUnread[gid] = d[gid]?.[currentUser.uid] || 0;
      });
      setGroupUnread(myGroupUnread);
    });

    return () => {
      unsubUsers();
      unsubUnread();
      unsubGroups();
      unsubGUnread();
    };
  }, [currentUser?.uid]);

  /* ─── Derived lists ─── */
  const searchLower = search.toLowerCase();

  const filteredUsers = users.filter(u =>
    (u.name || "").toLowerCase().includes(searchLower)
  );
  const filteredGroups = groups.filter(g =>
    (g.name || "").toLowerCase().includes(searchLower)
  );

  let displayItems = [];
  if (filter === "All") displayItems = [...filteredUsers, ...filteredGroups];
  if (filter === "Personal") displayItems = filteredUsers;
  if (filter === "Groups") displayItems = filteredGroups;
  if (filter === "Unread") displayItems = [
    ...filteredUsers.filter(u => (unreadCounts[u.uid] || 0) > 0),
    ...filteredGroups.filter(g => (groupUnread[g.groupId] || 0) > 0),
  ];

  // Sort by lastMessageTime descending
  displayItems = [...displayItems].sort((a, b) => {
    const tA = a.lastMessageTime || 0;
    const tB = b.lastMessageTime || 0;
    return tB - tA;
  });

  /* ─── Long press handlers ─── */
  const handlePressStart = (item) => {
    didLongPress.current = false;
    pressTimerRef.current = setTimeout(() => {
      didLongPress.current = true;
      setSelectionMode(true);
      const id = item.isGroup ? item.groupId : item.uid;
      setSelectedIds([id]);
    }, 600);
  };

  const handlePressEnd = (item) => {
    clearTimeout(pressTimerRef.current);
    if (didLongPress.current) return; // handled by long press
    // Normal click
    if (selectionMode) {
      const id = item.isGroup ? item.groupId : item.uid;
      setSelectedIds(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    } else {
      onSelectUser(item);
    }
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  /* ─── All P2P users for CreateGroupModal ─── */
  const selectedUserObjects = users.filter(u => selectedIds.includes(u.uid));

  /* ─── Render ─── */
  return (
    <aside className="w-full md:w-[380px] border-r border-slate-200/60 dark:border-white/10 flex flex-col bg-slate-50 dark:bg-[#0a0f16] shrink-0 font-display relative z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">

      {/* ===== HEADER ===== */}
      <div className="px-6 py-5 border-b border-white/40 dark:border-white/5 space-y-4 bg-white/70 dark:bg-[#0a0f16]/70 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center justify-between">
          {selectionMode ? (
            <>
              <span className="font-bold text-sm text-slate-700 dark:text-slate-200 bg-white/50 px-3 py-1 rounded-full shadow-sm">
                {selectedIds.length} selected
              </span>
              <button onClick={cancelSelection} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </>
          ) : (
            <>
              <h1 className="font-extrabold text-[24px] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">Chats</h1>
              <div className="flex gap-2">
                <button
                  title="New Chat"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-white/5 shadow-sm border border-slate-200/50 dark:border-white/5 hover:scale-105 hover:shadow-md transition-all text-indigo-600 dark:text-indigo-400"
                  onClick={() => setSearch("")}
                >
                  <span className="material-symbols-outlined text-[20px]">edit_square</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Search */}
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-3 transition-colors group-focus-within:text-indigo-500">
            <span className="material-symbols-outlined text-slate-400/80 group-focus-within:text-indigo-500 text-[20px] transition-colors">search</span>
          </div>
          <input
            className="w-full bg-white/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-2xl pl-12 pr-4 py-3 text-[14px] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/40 transition-all placeholder:text-slate-400 text-slate-900 dark:text-white shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-white/20"
            placeholder="Search or start new chat..."
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* ===== FILTER TABS ===== */}
        <div className="flex gap-2.5 pb-1 overflow-x-auto no-scrollbar scroll-smooth">
          {FILTERS.map(f => {
            const isActive = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all duration-300 border ${isActive
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 scale-105 border-transparent"
                  : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 hover:-translate-y-0.5 shadow-sm"
                  }`}
              >
                {f}
                {f === "Unread" && (() => {
                  const total = users.reduce((s, u) => s + (unreadCounts[u.uid] || 0), 0)
                    + groups.reduce((s, g) => s + (groupUnread[g.groupId] || 0), 0);
                  return total > 0
                    ? <span className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? "bg-white/30" : "bg-indigo-100 text-indigo-600"}`}>{total}</span>
                    : null;
                })()}
              </button>
            )
          })}
        </div>
      </div>

      {/* ===== CHAT LIST ===== */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-2 pb-24">
        {displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center opacity-80 mt-12 animate-in fade-in flex-1">
            <div className="w-20 h-20 bg-white dark:bg-surface-dark shadow-xl shadow-slate-200/50 dark:shadow-none rounded-3xl flex items-center justify-center mb-6 border border-slate-100 dark:border-white/5 transform rotate-3">
              <span className="material-symbols-outlined text-4xl bg-clip-text text-transparent bg-gradient-to-br from-slate-400 to-slate-600">
                {search ? "search_off" : filter === "Unread" ? "mark_chat_read" : "chat_bubble"}
              </span>
            </div>
            <h3 className="text-slate-800 dark:text-white font-extrabold text-lg mb-2">
              {search ? "No results found" : filter === "Unread" ? "You're all caught up!" : "No chats yet"}
            </h3>
            <p className="text-sm text-slate-500">
              {search ? "Try a different spelling." : "Start a new conversation to connect."}
            </p>
          </div>
        ) : (
          displayItems.map(item => {
            const isGroup = item.isGroup;
            const id = isGroup ? item.groupId : item.uid;
            const isSelected = selectedUser?.uid === item.uid || selectedUser?.groupId === item.groupId;
            const isChecked = selectedIds.includes(id);
            const unread = isGroup ? (groupUnread[item.groupId] || 0) : (unreadCounts[item.uid] || 0);
            const lastTime = formatLastTime(item.lastMessageTime);

            return (
              <div
                key={id}
                onMouseDown={() => handlePressStart(item)}
                onMouseUp={() => handlePressEnd(item)}
                onMouseLeave={() => clearTimeout(pressTimerRef.current)}
                className={`flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer transition-all duration-300 relative group/item border ${isSelected
                  ? "bg-white dark:bg-white/10 border-indigo-200 dark:border-indigo-500/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-indigo-500/10 scale-[1.02] z-10"
                  : selectionMode && isChecked
                    ? "bg-indigo-50/80 border-indigo-200"
                    : "bg-transparent border-transparent hover:bg-white dark:hover:bg-white/5 hover:border-slate-200 dark:hover:border-white/10 hover:shadow-sm hover:-translate-y-0.5"
                  }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className="w-14 h-14 rounded-[1.25rem] bg-cover bg-center bg-slate-100 dark:bg-surface-dark shadow-sm group-hover/item:shadow-md transition-all duration-300 ring-2 ring-transparent group-hover/item:ring-indigo-500/20"
                    style={{ backgroundImage: `url(${item.profile_image || (isGroup ? "/group_avatar.png" : DEFAULT_AVATAR)})` }}
                  />
                  {!isGroup && item.online && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-[#0a0f16] rounded-full shadow-sm animate-in zoom-in" />
                  )}
                  {selectionMode && isChecked && (
                    <div className="absolute inset-0 bg-indigo-500/20 rounded-[1.25rem] flex items-center justify-center backdrop-blur-[1px] auto-anim">
                      <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg text-white">
                        <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 py-1">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`font-bold truncate text-[15px] transition-colors ${isSelected ? "text-indigo-900 dark:text-indigo-100" : "text-slate-800 dark:text-slate-100 group-hover/item:text-indigo-600 dark:group-hover/item:text-indigo-400"}`}>
                      {item.name}
                    </h3>
                    <span className={`text-[11px] whitespace-nowrap ml-2 font-medium tracking-wide ${unread > 0 ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`}>
                      {lastTime}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-3">
                    <p className={`text-[13px] truncate flex-1 leading-relaxed ${unread > 0 ? "text-slate-900 dark:text-slate-100 font-semibold" : "text-slate-500 dark:text-slate-400"}`}>
                      {(item.lastMessage || (isGroup ? `${Object.keys(item.members || {}).length} members` : "No messages yet"))}
                    </p>
                    {unread > 0 && (
                      <span className="bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white text-[11px] font-bold h-[22px] px-2 min-w-[22px] flex items-center justify-center rounded-full shadow-md shadow-indigo-500/30 animate-in zoom-in-95">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ===== CREATE GROUP FLOATING BUTTON ===== */}
      {selectionMode && selectedIds.filter(id => !groups.find(g => g.groupId === id)).length >= 2 && (
        <div className="absolute bottom-6 left-6 right-6 z-30 animate-in slide-in-from-bottom-5">
          <button
            className="flex items-center gap-3 bg-primary text-white px-6 py-4 rounded-2xl shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:scale-[1.02] transition-all font-bold text-sm w-full justify-center"
            onClick={() => setShowCreateGroup(true)}
          >
            <span className="material-symbols-outlined text-[22px]">group_add</span>
            Create New Group
          </button>
        </div>
      )}

      {/* ===== CREATE GROUP MODAL ===== */}
      {showCreateGroup && (
        <CreateGroupModal
          selectedMembers={selectedIds.filter(id => !groups.find(g => g.groupId === id))}
          allUsers={users}
          onClose={() => setShowCreateGroup(false)}
          onGroupCreated={(newGroup) => {
            cancelSelection();
            onSelectUser(newGroup);
          }}
        />
      )}
    </aside>
  );
}
