import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../firebase";
import "./AuthSlider.css";

const AuthSlider = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Start on Sign Up panel if navigated to /register
    const [isSignUp, setIsSignUp] = useState(location.pathname === "/register");

    // Sign In state
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);
    const [showLoginPw, setShowLoginPw] = useState(false);

    // Sign Up state
    const [regName, setRegName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPassword, setRegPassword] = useState("");
    const [regError, setRegError] = useState("");
    const [regLoading, setRegLoading] = useState(false);
    const [showRegPw, setShowRegPw] = useState(false);

    const switchToSignUp = () => {
        setIsSignUp(true);
        setLoginError("");
    };

    const switchToSignIn = () => {
        setIsSignUp(false);
        setRegError("");
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError("");
        setLoginLoading(true);
        try {
            await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
            navigate("/discovery");
        } catch (err) {
            if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
                setLoginError("Invalid email or password.");
            } else if (err.code === "auth/wrong-password") {
                setLoginError("Incorrect password.");
            } else {
                setLoginError(err.message);
            }
        } finally {
            setLoginLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setRegError("");
        if (regPassword.length < 6) {
            setRegError("Password must be at least 6 characters.");
            return;
        }
        setRegLoading(true);
        try {
            const res = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
            await set(ref(db, `users/${res.user.uid}`), {
                name: regName,
                email: regEmail,
                online: true,
                profile_image: "",
                createdAt: Date.now(),
            });
            navigate("/discovery");
        } catch (err) {
            if (err.code === "auth/email-already-in-use") {
                setRegError("Email already in use. Please sign in.");
            } else {
                setRegError(err.message);
            }
        } finally {
            setRegLoading(false);
        }
    };

    return (
        <div className="slider-page">
            {/* Main wrapper */}
            <div className={`slider-wrapper ${isSignUp ? "slider-wrapper--signup" : ""}`}>

                {/* ===== SIGN IN FORM ===== */}
                <div className="slider-form slider-form--signin">
                    <h1 className="slider-heading">Sign In</h1>

                    <div className="slider-social-row">
                        {/* Facebook */}
                        <button className="slider-social-btn" title="Facebook">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                        </button>
                        {/* Google */}
                        <button className="slider-social-btn" title="Google">
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                        </button>
                        {/* LinkedIn */}
                        <button className="slider-social-btn" title="LinkedIn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A66C2">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                        </button>
                    </div>

                    <p className="slider-or">or use your account</p>

                    <form onSubmit={handleLogin} className="slider-form-inner">
                        <div className="slider-input-group">
                            <span className="material-symbols-outlined slider-input-icon">mail</span>
                            <input
                                className="slider-input"
                                type="email"
                                placeholder="Email"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="slider-input-group">
                            <span className="material-symbols-outlined slider-input-icon">lock</span>
                            <input
                                className="slider-input"
                                type={showLoginPw ? "text" : "password"}
                                placeholder="Password"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                required
                            />
                            <button type="button" className="slider-eye" onClick={() => setShowLoginPw(!showLoginPw)}>
                                <span className="material-symbols-outlined">{showLoginPw ? "visibility_off" : "visibility"}</span>
                            </button>
                        </div>

                        <a href="#" className="slider-forgot">Forgot your password?</a>

                        {loginError && <p className="slider-error">{loginError}</p>}

                        <button type="submit" disabled={loginLoading} className="slider-btn slider-btn--solid">
                            {loginLoading ? <span className="slider-spinner" /> : "SIGN IN"}
                        </button>
                    </form>
                </div>

                {/* ===== SIGN UP FORM ===== */}
                <div className="slider-form slider-form--signup">
                    <h1 className="slider-heading">Create Account</h1>

                    <div className="slider-social-row">
                        <button className="slider-social-btn" title="Facebook">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                        </button>
                        <button className="slider-social-btn" title="Google">
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                        </button>
                        <button className="slider-social-btn" title="LinkedIn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A66C2">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                        </button>
                    </div>

                    <p className="slider-or">or use your email for registration</p>

                    <form onSubmit={handleRegister} className="slider-form-inner">
                        <div className="slider-input-group">
                            <span className="material-symbols-outlined slider-input-icon">person</span>
                            <input
                                className="slider-input"
                                type="text"
                                placeholder="Full Name"
                                value={regName}
                                onChange={(e) => setRegName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="slider-input-group">
                            <span className="material-symbols-outlined slider-input-icon">mail</span>
                            <input
                                className="slider-input"
                                type="email"
                                placeholder="Email"
                                value={regEmail}
                                onChange={(e) => setRegEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="slider-input-group">
                            <span className="material-symbols-outlined slider-input-icon">lock</span>
                            <input
                                className="slider-input"
                                type={showRegPw ? "text" : "password"}
                                placeholder="Password"
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                                required
                            />
                            <button type="button" className="slider-eye" onClick={() => setShowRegPw(!showRegPw)}>
                                <span className="material-symbols-outlined">{showRegPw ? "visibility_off" : "visibility"}</span>
                            </button>
                        </div>

                        {regError && <p className="slider-error">{regError}</p>}

                        <button type="submit" disabled={regLoading} className="slider-btn slider-btn--solid">
                            {regLoading ? <span className="slider-spinner" /> : "SIGN UP"}
                        </button>
                    </form>
                </div>

                {/* ===== SLIDING OVERLAY PANEL ===== */}
                <div className="slider-overlay-container">
                    <div className="slider-overlay">

                        {/* Left overlay (shown when Sign Up is active) */}
                        <div className="slider-overlay-panel slider-overlay-panel--left">
                            <h2 className="slider-overlay-title">Welcome Back!</h2>
                            <p className="slider-overlay-text">
                                Stay connected by logging in with your credentials
                            </p>
                            <button
                                className="slider-btn slider-btn--ghost"
                                onClick={switchToSignIn}
                            >
                                SIGN IN
                            </button>
                        </div>

                        {/* Right overlay (shown when Sign In is active) */}
                        <div className="slider-overlay-panel slider-overlay-panel--right">
                            <h2 className="slider-overlay-title">Hey There!</h2>
                            <p className="slider-overlay-text">
                                Begin your amazing journey by creating an account with us today
                            </p>
                            <button
                                className="slider-btn slider-btn--ghost"
                                onClick={switchToSignUp}
                            >
                                SIGN UP
                            </button>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default AuthSlider;
