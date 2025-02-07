import "./App.css";
import HomePage from "./components/Homepage";
import LoginPage from "./components/LoginPage";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProfilePage from "./components/ProfilePage";
import ViewOldFilePage from "./components/ViewOldFilePage";
import TransferFilesPage from "./components/TransferFilesPage";
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
          {/* Protect this route with handshake authentication */}
          <Route element={<HandshakeProtectedRoute />}>
            <Route path="/transfer-files" element={<TransferFilesPage />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
