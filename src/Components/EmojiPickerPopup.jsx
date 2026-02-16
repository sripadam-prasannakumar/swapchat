import React from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

const EmojiPickerPopup = ({ onSelect, onClose }) => {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "90px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Picker
        data={data}
        onEmojiSelect={(e) => {
          onSelect(e.native);
          onClose();
        }}
        previewPosition="none"
      />
    </div>
  );
};

export default EmojiPickerPopup;
