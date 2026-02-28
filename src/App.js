import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AuthSlider from "./pages/AuthSlider";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import { AuthProvider } from "./context/AuthContext";
import { CallProvider, useCall } from "./context/CallContext";
import VideoCallOverlay from "./pages/VideoCallOverlay";

function AppContent() {
  const callProps = useCall();

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthSlider />} />
        <Route path="/register" element={<AuthSlider />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <VideoCallOverlay {...callProps} />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CallProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </CallProvider>
    </AuthProvider>
  );
}

