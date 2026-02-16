import React, { useState } from "react";
import EmojiPickerPopup from "./EmojiPickerPopup";
import "./EmojiReactionBar.css";

const quickEmojis = ["👍", "❤️", "😂", "😮", "😢"];

const EmojiReactionBar = ({ onReact }) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="reaction-bar">
      {quickEmojis.map((emoji) => (
        <span
          key={emoji}
          className="reaction-emoji"
          onClick={() => onReact(emoji)}
        >
          {emoji}
        </span>
      ))}

      {/* PLUS BUTTON */}
      <span
        className="reaction-emoji plus"
        onClick={() => setShowPicker(!showPicker)}
      >
        +
      </span>

      {showPicker && (
        <EmojiPickerPopup
          onSelect={(emoji) => {
            onReact(emoji);
            setShowPicker(false);
          }}
        />
      )}
    </div>
  );
};

export default EmojiReactionBar;
