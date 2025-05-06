import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const TokenWrapper = ({ children }) => {
  const navigate = useNavigate();
  const [isTokenChecked, setIsTokenChecked] = useState(false);
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    const currentAccessToken = sessionStorage.getItem("accessToken");
    const currentRefreshToken = sessionStorage.getItem("refreshToken");

    const isTokenExpired = (token) => {
      if (!token) return true;
      try {
        const { exp } = jwtDecode(token);
        return Date.now() > exp * 1000;
      } catch {
        return true;
      }
    };

    const refreshTokens = async () => {
      try {
        const response = await fetch("http://localhost:8080/refresh_token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: currentRefreshToken }),
        });

        if (response.ok) {
          const { accessToken, refreshToken, privateKeyExists, roles } = await response.json();
          sessionStorage.setItem("accessToken", accessToken);
          sessionStorage.setItem("refreshToken", refreshToken);
          sessionStorage.setItem("data.privateKeyExists", privateKeyExists);
          sessionStorage.setItem("userRole", JSON.stringify(roles));
          console.log("✅ Tokens refreshed automatically");
        } else {
          console.warn("Token refresh failed, redirecting to login.");
          sessionStorage.clear();
          navigate("/login");
        }
      } catch (err) {
        console.error("Token refresh error:", err);
        sessionStorage.clear();
        navigate("/login");
      }
    };

    const checkAndRefresh = async () => {
      if (!currentAccessToken || isTokenExpired(currentAccessToken)) {
        console.log("Access token expired. Trying refresh...");
        if (currentRefreshToken && !isTokenExpired(currentRefreshToken)) {
          await refreshTokens();
        } else {
          console.warn("Refresh token invalid or missing.");
          sessionStorage.clear();
          navigate("/login");
          return;
        }
      }
      setIsTokenChecked(true);
    };

    checkAndRefresh();

    // Set up interval to refresh token periodically before expiry
    if (!refreshIntervalRef.current) {
      refreshIntervalRef.current = setInterval(() => {
        const token = sessionStorage.getItem("accessToken");
        if (token) {
          const { exp } = jwtDecode(token);
          const timeLeft = exp * 1000 - Date.now();
          // Refresh if less than 30 seconds left
          if (timeLeft < 30000) {
            console.log("⏳ Token expiring soon. Refreshing...");
            refreshTokens();
          }
        }
      }, 15000); // Check every 15s
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [navigate]);

  if (!isTokenChecked) return <div>Loading...</div>;
  return <>{children}</>;
};

export default TokenWrapper;
