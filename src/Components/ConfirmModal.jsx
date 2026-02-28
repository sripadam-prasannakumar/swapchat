import React from "react";
import "./ConfirmModal.css";

/**
 * ConfirmModal – reusable replacement for window.confirm / window.alert
 *
 * Props:
 *  isOpen     – boolean
 *  title      – string
 *  message    – string
 *  onConfirm  – () => void
 *  onCancel   – () => void   (omit to make it an alert-only modal)
 *  confirmLabel – string (default "Confirm")
 *  cancelLabel  – string (default "Cancel")
 *  danger       – boolean – makes confirm button red
 */
export default function ConfirmModal({
    isOpen,
    title = "Are you sure?",
    message,
    onConfirm,
    onCancel,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    danger = false,
}) {
    if (!isOpen) return null;

    return (
        <div className="confirm-backdrop" onClick={(e) => e.target === e.currentTarget && onCancel?.()}>
            <div className="confirm-modal animate-in">
                <div className={`confirm-icon-wrap ${danger ? "danger" : ""}`}>
                    <span className="material-symbols-outlined">
                        {danger ? "warning" : "help"}
                    </span>
                </div>

                <h3 className="confirm-title">{title}</h3>
                {message && <p className="confirm-message">{message}</p>}

                <div className="confirm-actions">
                    {onCancel && (
                        <button className="confirm-btn cancel" onClick={onCancel}>
                            {cancelLabel}
                        </button>
                    )}
                    {onConfirm && (
                        <button
                            className={`confirm-btn ${danger ? "danger" : "primary"}`}
                            onClick={onConfirm}
                        >
                            {confirmLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
