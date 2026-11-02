// ============================================================================
// src/pages/AuthPage.jsx  (nayi file) — Sign in / Create account, ek hi page par
// ============================================================================
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { FiFileText, FiMail, FiLock, FiPhone, FiEye, FiEyeOff, FiArrowLeft } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";

export default function AuthPage() {
  const { user, login, register, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/"; // seedha Sign In dabaya to home; kisi page se bheja gaya to wapas wahin

  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "reset"
  const [info, setInfo] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={redirectTo} replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (mode === "signup" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "reset") {
        await resetPassword(email);
        setInfo("If an account exists for this email, a reset link has been sent. Check your inbox and spam folder.");
        return;
      }
      if (mode === "signin") await login(email, password);
      else await register(email, password, phone);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-wrap">
        <Link to="/" className="auth-back"><FiArrowLeft /> Back to home</Link>
        <div className="auth-brand"><FiFileText /> <span><b>CV Pro</b><small>Build. Apply. Get Hired.</small></span></div>

        <div className="auth-card">
          <div className="auth-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "on" : ""} onClick={() => { setMode("signin"); setError(""); setInfo(""); }}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "on" : ""} onClick={() => { setMode("signup"); setError(""); setInfo(""); }}>Create account</button>
          </div>

          <h1>{mode === "signin" ? "Welcome back" : mode === "reset" ? "Reset your password" : "Create your free account"}</h1>
          <p className="auth-sub">
            {mode === "signin" ? "Sign in to open your saved CV." : mode === "reset" ? "Enter your email and we will send you a link to choose a new password." : "Save your CV and tailor it for every job you apply to."}
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <label className="auth-label" htmlFor="auth-email">Email</label>
            <div className="auth-field"><FiMail />
              <input id="auth-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            {mode === "signup" && (
              <>
                <label className="auth-label" htmlFor="auth-phone">Phone number <span className="auth-opt">(optional)</span></label>
                <div className="auth-field"><FiPhone />
                  <input id="auth-phone" type="tel" autoComplete="tel" placeholder="+92 300 1234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </>
            )}

            {mode !== "reset" && (<>
            <label className="auth-label" htmlFor="auth-pw">Password</label>
            <div className="auth-field"><FiLock />
              <input id="auth-pw" type={showPw ? "text" : "password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="auth-eye" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw((s) => !s)}>
                {showPw ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            </>)}

            {mode === "signin" && (
              <button type="button" className="auth-link" onClick={() => { setMode("reset"); setError(""); setInfo(""); }}>Forgot password?</button>
            )}
            {mode === "reset" && (
              <button type="button" className="auth-link" onClick={() => { setMode("signin"); setError(""); setInfo(""); }}>Back to sign in</button>
            )}

            {info && <div className="auth-info" role="status">{info}</div>}
            {error && <div className="auth-error" role="alert">{error}</div>}

            <button type="submit" className="auth-submit" disabled={busy || !email || (mode !== "reset" && !password)}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "reset" ? "Send reset link" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
