import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const TokenWrapper = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkTokens = async () => {
      const accessToken = sessionStorage.getItem("accessToken");
      const refreshToken = sessionStorage.getItem("refreshToken");

      const isTokenExpired = (token) => {
        if (!token) return true;
        try {
          const { exp } = jwtDecode(token);
          const expiryTime = exp * 1000; // Convert to milliseconds
          return new Date().getTime() > expiryTime;
        } catch (error) {
          console.error("Error decoding token:", error);
          return true;
        }
      };

      if (isTokenExpired(accessToken)) {
        if (refreshToken && !isTokenExpired(refreshToken)) {
          try {
            const response = await fetch("http://localhost:8080/refresh_token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ token: refreshToken }),
            });

            if (response.ok) {
              const { newAccessToken, newRefreshToken, role } = await response.json();

              // Store updated tokens
              sessionStorage.setItem("accessToken", newAccessToken);
              sessionStorage.setItem("refreshToken", newRefreshToken);
              sessionStorage.setItem("userRole", role);

              // Navigate based on user role
              if (role === "ROLE_ADMIN") {
                navigate("/admin/users");
              } else {
                navigate("/home");
              }
            } else {
              // Clear session and redirect to login if refresh fails
              sessionStorage.clear();
              navigate("/login");
            }
          } catch (error) {
            console.error("Token refresh failed:", error);
            sessionStorage.clear();
            navigate("/login");
          }
        } else {
          // If refresh token is also expired, clear session and redirect to login
          sessionStorage.clear();
          navigate("/login");
        }
      }
    };

    checkTokens();
  }, [navigate]);

  return <>{children}</>;
};

export default TokenWrapper;