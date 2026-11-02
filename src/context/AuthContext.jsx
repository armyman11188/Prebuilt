// ============================================================================
// src/context/AuthContext.jsx  (Firebase version — purani file replace karo)
// ROMAN URDU: Sign-in Firebase se hota hai; phir hamara server ek httpOnly
// cookie de deta hai, jisse baqi sab fetch() calls pehle jaise chalti hain.
// useAuth() kisi bhi component mein: const { user, logout } = useAuth();
// ============================================================================
import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";

const AuthContext = createContext(null);

// Firebase ke technical error codes -> insani zubaan
function friendly(err) {
  switch (err?.code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "This email is already registered. Try signing in.";
    case "auth/weak-password":
      return "Password must be at least 8 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Network problem. Check your internet connection and try again.";
    default:
      return err?.message && !err.code ? err.message : "Something went wrong. Please try again.";
  }
}

async function createServerSession(idToken, phone) {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, phone }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not sign you in. Please try again.");
  return data.user;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Page khulte hi: cookie valid hai?
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user || null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const u = await createServerSession(await cred.user.getIdToken());
      await signOut(auth); // ab cookie hi kaafi hai
      setUser(u);
    } catch (err) {
      throw new Error(friendly(err));
    }
  }

  async function register(email, password, phone) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      sendEmailVerification(cred.user).catch(() => {}); // verification email (free, built-in)
      const u = await createServerSession(await cred.user.getIdToken(), phone);
      await signOut(auth);
      setUser(u);
    } catch (err) {
      throw new Error(friendly(err));
    }
  }

  async function resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      if (err?.code === "auth/invalid-email") throw new Error(friendly(err));
      // baqi errors (jaise user nahi mila) par bhi same jawab — taake koi email guess na kar sake
    }
  }

  async function logout() {
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    // Privacy: is browser mein is user ka data chhor ke mat jao
    ["cvFormDraft", "cvTailoredHistory", "atsCheckData", "atsMissingItems", "voiceInterviewData"].forEach((k) => localStorage.removeItem(k));
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
