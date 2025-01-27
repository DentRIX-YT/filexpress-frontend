import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const TokenWrapper = ({ children }) => {
  const navigate = useNavigate();
  const [isTokenChecked, setIsTokenChecked] = useState(false); // Tracks if token validation is complete

  useEffect(() => {
    const checkTokens = async () => {
      const currentAccessToken = sessionStorage.getItem("accessToken");
      const currentRefreshToken = sessionStorage.getItem("refreshToken");

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

      if (isTokenExpired(currentAccessToken)) {
        console.log("Access token expired. Attempting refresh...");
        if (currentRefreshToken && !isTokenExpired(currentRefreshToken)) {
          try {
            const response = await fetch("http://localhost:8080/refresh_token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ refreshToken: currentRefreshToken }),
            });

            if (response.ok) {
              const { accessToken, refreshToken, privateKeyExists, roles } = await response.json();
              console.log("Tokens refreshed successfully");

              // Store updated tokens
              sessionStorage.setItem("accessToken", accessToken);
              sessionStorage.setItem("refreshToken", refreshToken);
              sessionStorage.setItem("data.privateKeyExists", privateKeyExists);
              sessionStorage.setItem("userRole", JSON.stringify(roles));
            } else {
              console.error("Failed to refresh tokens:", response.status);
              sessionStorage.clear();
              navigate("/login");
            }
          } catch (error) {
            console.error("Error during token refresh:", error);
            sessionStorage.clear();
            navigate("/login");
          }
        } else {
          console.error("Refresh token expired or missing. Redirecting to login.");
          sessionStorage.clear();
          navigate("/login");
        }
      }
      setIsTokenChecked(true); // Mark token check as complete
    };

    checkTokens();
  }, [navigate]);

  if (!isTokenChecked) {
    // Render a loading state while tokens are being validated or refreshed
    return <div>Loading...</div>;
  }

  return <>{children}</>;
};

export default TokenWrapper;