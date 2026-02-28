import { useState, useRef, useEffect } from "react";
import "./ChatLockModal.css";

/**
 * ChatLockModal
 * mode="set"   → asks for PIN + confirm to lock a chat
 * mode="enter" → asks for PIN to unlock a chat
 * mode="remove"→ asks for current PIN to remove the lock
 */
export default function ChatLockModal({ mode, userName, onConfirm, onCancel }) {
    const [step, setStep] = useState(1); // 1 = enter pin, 2 = confirm pin (only for "set")
    const [pin, setPin] = useState(["", "", "", ""]);
    const [firstPin, setFirstPin] = useState([]); // stores first entry for confirm step
    const [shake, setShake] = useState(false);
    const [error, setError] = useState("");
    const inputRefs = useRef([]);

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, [step]);

    const handleInput = (val, idx) => {
        if (!/^\d?$/.test(val)) return;
        const next = [...pin];
        next[idx] = val;
        setPin(next);
        setError("");

        if (val && idx < 3) {
            inputRefs.current[idx + 1]?.focus();
        }

        // Auto-submit when 4th digit entered
        if (val && idx === 3) {
            const fullPin = [...next].join("");
            if (fullPin.length === 4) {
                setTimeout(() => handleSubmit([...next]), 100);
            }
        }
    };

    const handleKeyDown = (e, idx) => {
        if (e.key === "Backspace" && !pin[idx] && idx > 0) {
            inputRefs.current[idx - 1]?.focus();
        }
    };

    const triggerShake = (msg) => {
        setError(msg);
        setShake(true);
        setPin(["", "", "", ""]);
        setTimeout(() => {
            setShake(false);
            inputRefs.current[0]?.focus();
        }, 600);
    };

    const handleSubmit = (digits) => {
        const entered = digits.join("");
        if (entered.length < 4) {
            triggerShake("Please enter all 4 digits.");
            return;
        }

        if (mode === "set") {
            if (step === 1) {
                setFirstPin(digits);
                setPin(["", "", "", ""]);
                setStep(2);
            } else {
                if (entered === firstPin.join("")) {
                    onConfirm(entered);
                } else {
                    setStep(1);
                    setFirstPin([]);
                    triggerShake("PINs don't match. Try again.");
                }
            }
        } else {
            // mode = "enter" or "remove"
            onConfirm(entered, (ok) => {
                if (!ok) triggerShake("Incorrect PIN. Try again.");
            });
        }
    };

    const title =
        mode === "set"
            ? step === 1 ? "Set a PIN" : "Confirm PIN"
            : mode === "remove"
                ? "Enter PIN to remove lock"
                : "Chat is locked 🔒";

    const subtitle =
        mode === "set"
            ? step === 1
                ? `Protect your chat with ${userName}`
                : "Re-enter your PIN to confirm"
            : mode === "remove"
                ? `Unlock and remove PIN for ${userName}`
                : `Enter PIN to open chat with ${userName}`;

    return (
        <div className="lock-backdrop" onClick={(e) => e.target.classList.contains("lock-backdrop") && onCancel()}>
            <div className={`lock-modal${shake ? " lock-shake" : ""}`}>
                {/* Icon */}
                <div className="lock-icon-wrap">
                    <span className="material-symbols-outlined lock-main-icon">
                        {mode === "set" ? "lock_add" : mode === "remove" ? "lock_open" : "lock"}
                    </span>
                </div>

                <h2 className="lock-title">{title}</h2>
                <p className="lock-subtitle">{subtitle}</p>

                {/* PIN dots */}
                <div className="lock-pin-row">
                    {pin.map((digit, i) => (
                        <input
                            key={i}
                            ref={(el) => (inputRefs.current[i] = el)}
                            className={`lock-dot${digit ? " lock-dot-filled" : ""}`}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleInput(e.target.value, i)}
                            onKeyDown={(e) => handleKeyDown(e, i)}
                        />
                    ))}
                </div>

                {error && <p className="lock-error">{error}</p>}

                {/* Buttons */}
                <div className="lock-actions">
                    <button className="lock-btn lock-btn-cancel" onClick={onCancel}>Cancel</button>
                    <button
                        className="lock-btn lock-btn-confirm"
                        onClick={() => handleSubmit(pin)}
                    >
                        {mode === "set" ? (step === 1 ? "Next" : "Set PIN") : "Unlock"}
                    </button>
                </div>
            </div>
        </div>
    );
}
