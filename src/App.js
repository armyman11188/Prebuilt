// ============================================================================
// src/App.js
// ============================================================================
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import CVForm from "./pages/CVForm";
import ResultPage from "./pages/ResultPage";
import VoiceInterview from "./pages/VoiceInterview";
import AtsScore from "./pages/AtsScore";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<AuthPage />} />
		  <Route path="/profile" element={<ProfilePage />} />
          <Route path="/cv-form" element={<ProtectedRoute><CVForm /></ProtectedRoute>} />
          <Route path="/result" element={<ProtectedRoute><ResultPage /></ProtectedRoute>} />
          <Route path="/voice-interview" element={<ProtectedRoute><VoiceInterview /></ProtectedRoute>} />
          <Route path="/ats-score" element={<ProtectedRoute><AtsScore /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
