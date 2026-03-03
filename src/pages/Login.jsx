import { signInWithEmailAndPassword } from "firebase/auth";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import "./Auth.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(null);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setNotFound(false);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/chat");
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setNotFound(true);
        setError("");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect email or password.");
      } else if (err.code === "auth/invalid-credential") {
        setError("Invalid credentials. Please try again.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Animated background orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />

      {/* Grid overlay */}
      <div className="auth-grid" />

      <div className="auth-container">
        {/* Left branding panel */}
        <div className="auth-brand-panel">
          <div className="auth-brand-content">
            <div className="auth-logo-wrap">
              <span className="material-symbols-outlined auth-logo-icon">chat_bubble</span>
            </div>
            <h1 className="auth-brand-title">SwapChat</h1>
            <p className="auth-brand-subtitle">
              Connect instantly with friends and colleagues. Secure, fast, and beautiful messaging.
            </p>
            <div className="auth-brand-features">
              {[
                { icon: "lock", label: "End-to-end encrypted" },
                { icon: "bolt", label: "Real-time messaging" },
                { icon: "videocam", label: "HD Video calls" },
              ].map((f) => (
                <div key={f.icon} className="auth-feature-item">
                  <span className="material-symbols-outlined auth-feature-icon">{f.icon}</span>
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="auth-brand-glow" />
        </div>

        {/* Right form panel */}
        <div className="auth-form-panel">
          <div className="auth-card">
            {/* Card glow border */}
            <div className="auth-card-glow" />

            <div className="auth-card-inner">
              <div className="auth-card-header">
                <h2 className="auth-card-title">Welcome back</h2>
                <p className="auth-card-subtitle">Sign in to continue your conversations</p>
              </div>

              <form onSubmit={handleLogin} className="auth-form">
                {/* Email field */}
                <div className={`auth-field ${focused === 'email' ? 'auth-field--focused' : ''} ${email ? 'auth-field--filled' : ''}`}>
                  <label className="auth-label">Email address</label>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">mail</span>
                    <input
                      className="auth-input"
                      placeholder="name@example.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocused('email')}
                      onBlur={() => setFocused(null)}
                      required
                    />
                    <div className="auth-input-line" />
                  </div>
                </div>

                {/* Password field */}
                <div className={`auth-field ${focused === 'password' ? 'auth-field--focused' : ''} ${password ? 'auth-field--filled' : ''}`}>
                  <div className="auth-label-row">
                    <label className="auth-label">Password</label>
                    <a className="auth-forgot" href="#">Forgot password?</a>
                  </div>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">lock</span>
                    <input
                      className="auth-input"
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocused('password')}
                      onBlur={() => setFocused(null)}
                      required
                    />
                    <button
                      type="button"
                      className="auth-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                    <div className="auth-input-line" />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="auth-error">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                    {error}
                  </div>
                )}

                {/* Not-registered error with register link */}
                {notFound && (
                  <div className="auth-error" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_off</span>
                      No account found with this email.
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/register")}
                      style={{
                        background: 'none', border: 'none', padding: 0,
                        color: '#818cf8', fontWeight: 600, fontSize: 13,
                        cursor: 'pointer', textDecoration: 'underline', marginLeft: 22
                      }}
                    >
                      👉 Register first — it's free!
                    </button>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit-btn"
                >
                  {loading ? (
                    <span className="auth-spinner" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </>
                  )}
                  <div className="auth-btn-glow" />
                </button>
              </form>

              {/* Divider */}
              <div className="auth-divider">
                <span className="auth-divider-line" />
                <span className="auth-divider-text">or continue with</span>
                <span className="auth-divider-line" />
              </div>

              {/* Social buttons */}
              <div className="auth-social-row">
                <button className="auth-social-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span>Google</span>
                </button>
                <button className="auth-social-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                  </svg>
                  <span>GitHub</span>
                </button>
              </div>

              {/* Register link */}
              <p className="auth-switch">
                Don't have an account?{" "}
                <button onClick={() => navigate("/register")} className="auth-switch-link">
                  Register first
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
