// src/components/ProtectedRoute.jsx
// Jo page iske andar ho, woh sirf logged-in user dekh sakta hai.
// Warna user ko /login par bhej dete hain.
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#475569" }}>Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}