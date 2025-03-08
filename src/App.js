import "./App.css";
import HomePage from "./components/Homepage";
import LoginPage from "./components/LoginPage";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProfilePage from "./components/ProfilePage";
import ViewOldFilePage from "./components/ViewOldFilePage";
import SendFilePage from "./components/SendFilePage";
import ReceiveFilePage from "./components/ReceiveFilePage";
import HandshakePage from "./components/HandshakePage";
import HandshakeProtectedRoute from "./utilities/HandshakeProtectedRoute";
function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/view-old-files" element={<ViewOldFilePage />} />
          <Route path="/HandshakePage" element={<HandshakePage />} />
          {/* Protect these routes with handshake authentication */}
          <Route element={<HandshakeProtectedRoute />}>
            <Route path="/send-file" element={<SendFilePage />} />
            <Route path="/receive-file" element={<ReceiveFilePage />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
