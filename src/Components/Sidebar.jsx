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
    <aside className="w-full md:w-[380px] border-r border-slate-200 dark:border-border-dark flex flex-col bg-white dark:bg-background-dark shrink-0 font-display relative">

      {/* ===== HEADER ===== */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-border-dark space-y-3 bg-white/50 dark:bg-background-dark/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center justify-between">
          {selectionMode ? (
            <>
              <span className="font-bold text-sm text-slate-700 dark:text-slate-200">
                {selectedIds.length} selected
              </span>
              <button onClick={cancelSelection} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-full">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </>
          ) : (
            <>
              <h1 className="font-bold text-xl text-slate-900 dark:text-white tracking-tight">Chats</h1>
              <div className="flex gap-2">
                <button
                  title="New Chat"
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-surface-dark transition-all text-slate-600 dark:text-slate-300"
                  onClick={() => setSearch("")}
                >
                  <span className="material-symbols-outlined text-[20px]">edit_square</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-3">
            <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
          </div>
          <input
            className="w-full bg-slate-100 dark:bg-surface-dark border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-slate-500 text-slate-900 dark:text-white"
            placeholder="Search or start new chat"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* ===== FILTER TABS (More like WhatsApp Desktop) ===== */}
        <div className="flex gap-2 pb-1 overflow-x-auto no-scrollbar">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${filter === f
                ? "bg-primary/10 border-primary/20 text-primary"
                : "bg-slate-100 dark:bg-surface-dark border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
            >
              {f}
              {f === "Unread" && (() => {
                const total = users.reduce((s, u) => s + (unreadCounts[u.uid] || 0), 0)
                  + groups.reduce((s, g) => s + (groupUnread[g.groupId] || 0), 0);
                return total > 0
                  ? <span className="ml-1.5 opacity-70">({total})</span>
                  : null;
              })()}
            </button>
          ))}
        </div>
      </div>

      {/* ===== CHAT LIST ===== */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-50 dark:divide-border-dark">
        {displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center opacity-60 mt-10">
            <div className="w-16 h-16 bg-slate-50 dark:bg-surface-dark rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-slate-300">
                {search ? "search_off" : filter === "Unread" ? "mark_chat_read" : "chat_bubble"}
              </span>
            </div>
            <h3 className="text-slate-900 dark:text-white font-bold mb-1">
              {search ? "No results found" : filter === "Unread" ? "No unread messages" : "No chats yet"}
            </h3>
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
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-150 relative group/item ${isSelected
                  ? "bg-[#f0f2f5] dark:bg-[#2a3942]"
                  : selectionMode && isChecked
                    ? "bg-primary/5"
                    : "hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]"
                  }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className="w-12 h-12 rounded-full bg-cover bg-center bg-slate-100 dark:bg-surface-dark ring-1 ring-black/5 dark:ring-white/5"
                    style={{ backgroundImage: `url(${item.profile_image || (isGroup ? "/group_avatar.png" : DEFAULT_AVATAR)})` }}
                  />
                  {!isGroup && item.online && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-background-dark rounded-full" />
                  )}
                </div>

                {/* Info (WhatsApp Style) */}
                <div className="flex-1 min-w-0 py-1">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`font-bold truncate text-[15px] ${isSelected ? "text-slate-900 dark:text-white" : "text-slate-900 dark:text-slate-100"}`}>
                      {item.name}
                    </h3>
                    <span className={`text-[11px] whitespace-nowrap ml-2 ${unread > 0 ? "text-green-500 font-bold" : "text-slate-400 dark:text-slate-500"}`}>
                      {lastTime}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <p className={`text-[13px] truncate flex-1 ${unread > 0 ? "text-slate-900 dark:text-slate-100 font-medium" : "text-slate-500 dark:text-slate-400"}`}>
                      {(item.lastMessage || (isGroup ? `${Object.keys(item.members || {}).length} members` : "No messages yet"))}
                    </p>
                    {unread > 0 && (
                      <span className="bg-green-500 text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full">
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
