import { get, ref, update } from "firebase/database";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import "./Profile.css";

export default function Profile() {
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [saving, setSaving] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      setName(user.displayName || "");
      // Load about from Firebase
      get(ref(db, `users/${user.uid}/about`)).then((snap) => {
        if (snap.exists()) setAbout(snap.val());
        else setAbout("Hey there! I'm using ChatApp");
      });
    }
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await update(ref(db, `users/${user.uid}`), {
        name,
        about,
      });
      alert("Profile updated successfully!");
    } catch (error) {
      alert("Failed to update profile");
    }
    setSaving(false);
  };

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header">
        <span className="header-title">Profile</span>
      </div>

      {/* Content */}
      <div className="profile-content">
        {/* Profile Picture */}
        <div className="profile-pic-wrapper">
          <img
            src={user?.photoURL || "/profile_image.jpg"}
            alt="Profile"
            className="profile-pic"
          />
          <div className="change-photo">
            <span>📷</span> Change photo
          </div>
        </div>

        {/* Profile Info */}
        <div className="profile-info">
          <div className="info-block">
            <label>Your name</label>
            <div className="input-wrapper">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={25}
              />
              <span className="edit-icon">✏️</span>
            </div>
            <p className="hint">
              This is not your username. This will be visible to your contacts.
            </p>
          </div>

          <div className="info-block">
            <label>About</label>
            <div className="input-wrapper">
              <input
                type="text"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="Write something about yourself"
                maxLength={139}
              />
              <span className="edit-icon">✏️</span>
            </div>
            <p className="char-count">{about.length}/139</p>
          </div>

          <div className="info-block">
            <label>Email</label>
            <p className="readonly-field">{user?.email || "Not available"}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="profile-footer">
        <button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
