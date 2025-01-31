import React, { useEffect, useState } from "react";
import "../styles/ProfilePage.css";
import TokenWrapper from "../utilities/TokenWrapper";
import { useNavigate } from "react-router-dom";
import LogoutButton from "./LogoutButton";

const ProfilePage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("Loading..."); // Placeholder for username
    const [email, setEmail] = useState("Loading..."); // Placeholder for email

    useEffect(() => {
        const fetchUsernameAndEmail = async () => {
          const accessToken = sessionStorage.getItem("accessToken"); // Get access token from session storage
          if (!accessToken) {
            console.error("Access token is missing. Redirecting to login.");
            navigate("/login");
            return;
          }
    
          try {
            const response = await fetch("http://localhost:8080/users/me", {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accessToken}`, // Pass the token in the Authorization header
              },
            });
    
            if (response.ok) {
              const data = await response.json();
              setUsername(data.username); // Update the username state
              setEmail(data.email); // Update the email state
            } else {
              console.error("Failed to fetch username and email. Redirecting to login.");
              navigate("/login");
            }
          } catch (error) {
            console.error("Error while fetching username and email:", error);
            navigate("/login");
          }
        };
    
        // Delay the fetchUsername call by 100ms
        const timer = setTimeout(() => {
            fetchUsernameAndEmail();
        }, 100);
    
        // Cleanup the timeout if the component unmounts
        return () => clearTimeout(timer);
        
      }, [navigate]);

  return (
    <TokenWrapper>
      <div className="profile-page">
        <nav className="profile-navbar">
          <img
            src="/logo-no-background-colored.png" // Update with your logo's path
            alt="FileXpress Logo"
            className="nav-logo"
            onClick={() => navigate("/home")}
          />
          <div className="profile-nav-links">
            <button onClick={() => navigate("/transfer-files")}>
              Transfer Files
            </button>
            <button onClick={() => navigate("/view-old-files")}>
              View Old Files
            </button>
            <LogoutButton/>
          </div>
        </nav>

        <div className="profile-container">
          <h1 className="profile-title">Profile</h1>
          <div className="profile-card">
            <img
              src="/profile_pic_template.jpg"
              alt="Profile Avatar"
              className="profile-avatar"
            />
            <p>
              <strong>Username:</strong> {username}
            </p>
            <p>
              <strong>Email:</strong> {email}
            </p>
          </div>
        </div>
      </div>
    </TokenWrapper>
  );
};

export default ProfilePage;
