import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import logo from "../logo.svg";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const navigate = useNavigate();

  // Password validation rules
  const rules = [
    { label: "Minimum 8 characters", test: (p) => p.length >= 8 },
    { label: "One uppercase letter (A-Z)", test: (p) => /[A-Z]/.test(p) },
    { label: "One lowercase letter (a-z)", test: (p) => /[a-z]/.test(p) },
    { label: "One number (0-9)", test: (p) => /\d/.test(p) },
    { label: "One special character (@$!%*?&)", test: (p) => /[@$!%*?&]/.test(p) },
  ];

  const allRulesPassed = rules.every((rule) => rule.test(password));

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!agreedToTerms) {
      setError("You must agree to the Terms of Service.");
      return;
    }

    if (!allRulesPassed) {
      setError("Password rules not satisfied");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);

      await set(ref(db, `users/${res.user.uid}`), {
        name,
        email,
        online: true,
        profile_image: "",
        createdAt: Date.now(),
      });

      // alert("Registration successful! Please login.");
      navigate("/chat"); // Directly navigate to chat after registration
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("Email already in use. Please login.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display text-slate-900 dark:text-white">
      {/* Top Navigation Bar */}
      <header className="w-full border-b border-primary/20 bg-background-light/50 dark:bg-background-dark/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <img src={logo} alt="Logo" className="w-8 h-8" />
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">SwapChat</span>
          </div>
          <button onClick={() => navigate('/login')} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            Log In
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Branding & Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">Create Account</h1>
            <p className="text-slate-500 dark:text-white/60">Join the conversation and connect with others.</p>
          </div>

          {/* Registration Card */}
          <div className="bg-white dark:bg-primary/5 border border-slate-200 dark:border-primary/20 rounded-xl p-8 shadow-2xl backdrop-blur-sm">
            <form onSubmit={handleRegister} className="space-y-5">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-white/80 block">Full Name</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 text-xl">person</span>
                  <input
                    className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-300 dark:border-primary/20 rounded-lg py-3 pl-11 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    placeholder="Enter your full name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-white/80 block">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 text-xl">mail</span>
                  <input
                    className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-300 dark:border-primary/20 rounded-lg py-3 pl-11 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    placeholder="name@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-white/80 block">Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 text-xl">lock</span>
                  <input
                    className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-300 dark:border-primary/20 rounded-lg py-3 pl-11 pr-12 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    placeholder="Create a strong password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 hover:text-primary dark:hover:text-white transition-colors"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
                {/* Password Rules Indicators */}
                {password && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {rules.map((rule, index) => {
                      const passed = rule.test(password);
                      return (
                        <div key={index} className={`flex items-center gap-1 text-[10px] ${passed ? "text-green-500" : "text-slate-400"}`}>
                          <span className="material-symbols-outlined text-[12px]">{passed ? "check_circle" : "cancel"}</span>
                          <span>{rule.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-white/80 block">Confirm Password</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 text-xl">lock_reset</span>
                  <input
                    className="w-full bg-slate-50 dark:bg-background-dark/50 border border-slate-300 dark:border-primary/20 rounded-lg py-3 pl-11 pr-12 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    placeholder="Repeat your password"
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40 hover:text-primary dark:hover:text-white transition-colors"
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    <span className="material-symbols-outlined text-xl">{showConfirm ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3 py-2">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    type="checkbox"
                    className="w-4 h-4 rounded border-primary/20 bg-background-dark/50 text-primary focus:ring-primary/50 accent-primary"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                  />
                </div>
                <label className="text-xs text-slate-500 dark:text-white/60 leading-normal select-none cursor-pointer" htmlFor="terms">
                  By signing up, you agree to our <a className="text-primary hover:underline" href="#">Terms of Service</a> and <a className="text-primary hover:underline" href="#">Privacy Policy</a>.
                </label>
              </div>

              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

              {/* Sign Up Button */}
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary/20 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Sign Up"}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-primary/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-background-dark px-2 text-slate-400 dark:text-white/40">Or continue with</span>
              </div>
            </div>

            {/* Social Sign Up */}
            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-2 py-2.5 border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors text-slate-600 dark:text-white">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z" fill="#EA4335"></path>
                  <path d="M16.04 18.013c-1.09.582-2.38.927-3.79.927a7.07 7.07 0 0 1-6.953-4.842l-4.027 3.115C3.21 21.267 7.311 24 12 24c3.055 0 5.782-1.01 7.91-2.727l-3.87-3.26z" fill="#34A853"></path>
                  <path d="M23.49 12.273c0-.818-.073-1.609-.21-2.373H12v4.5h6.436c-.273 1.455-1.09 2.682-2.327 3.51l3.873 3.263c2.264-2.09 3.509-5.173 3.509-8.9z" fill="#4285F4"></path>
                  <path d="M5.266 14.235A7.05 7.05 0 0 1 4.909 12c0-.791.136-1.555.357-2.264L1.24 6.621a11.91 11.91 0 0 0 0 10.758l4.026-3.144z" fill="#FBBC05"></path>
                </svg>
                <span className="text-sm font-medium">Google</span>
              </button>
              <button className="flex items-center justify-center gap-2 py-2.5 border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors text-slate-600 dark:text-white">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm3 8h-1.35c-.538 0-.65.221-.65.778v1.222h2l-.209 2h-1.791v7h-3v-7h-2v-2h2v-2.308c0-1.769.931-2.692 3.029-2.692h1.971v3z"></path>
                </svg>
                <span className="text-sm font-medium">Facebook</span>
              </button>
            </div>
          </div>

          {/* Footer Login Link */}
          <p className="text-center mt-8 text-slate-500 dark:text-white/60 text-sm">
            Already have an account?
            <button onClick={() => navigate("/login")} className="ml-1 text-primary font-bold hover:underline transition-all">Log In</button>
          </p>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="w-full py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400 dark:text-white/40">
          <p>© 2024 ChatApp Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <a className="hover:text-primary transition-colors" href="#">Privacy</a>
            <a className="hover:text-primary transition-colors" href="#">Terms</a>
            <a className="hover:text-primary transition-colors" href="#">Help</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default Register;
