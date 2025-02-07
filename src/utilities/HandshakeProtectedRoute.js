import { Navigate, Outlet } from "react-router-dom";

const HandshakeProtectedRoute = () => {
  const isAuthenticated = sessionStorage.getItem("handshakeAuthenticated") === "true";

  return isAuthenticated ? <Outlet /> : <Navigate to="/HandshakePage" replace />;
};

export default HandshakeProtectedRoute;