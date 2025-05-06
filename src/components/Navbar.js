import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LogoutButton from "./LogoutButton"; // Reusable logout component
import "../styles/Navbar.css"; // Styling for the navbar

// Navbar component accepts navigation buttons, and optional flags for username display and styling
const Navbar = ({ buttons, showUsername = true, extraClasses = "" }) => {
  const navigate = useNavigate();
  const [isProfileDropdownVisible, setProfileDropdownVisible] = useState(false); // Controls dropdown visibility
  const [username, setUsername] = useState("Loading..."); // Stores the username fetched from backend

  useEffect(() => {
    // Skip fetching if username should not be shown
    if (!showUsername) return;

    const fetchUsername = async () => {
      const accessToken = sessionStorage.getItem("accessToken");

      // Redirect to login if token is missing
      if (!accessToken) {
        console.error("Access token is missing. Redirecting to login.");
        navigate("/login");
        return;
      }

      try {
        // Request the user's info from the backend
        const response = await fetch("http://localhost:8080/users/me", {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.ok) {
          const data = await response.json();
          setUsername(data.username); // Update state with fetched username
        } else {
          console.error("Failed to fetch username. Redirecting to login.");
          navigate("/login");
        }
      } catch (error) {
        console.error("Error while fetching username:", error);
        navigate("/login");
      }
    };

    // Add slight delay before fetching
    const timer = setTimeout(() => {
      fetchUsername();
    }, 200);

    return () => clearTimeout(timer);
  }, [navigate, showUsername]);

  // Toggles visibility of the profile dropdown menu
  const toggleProfileDropdown = () => {
    setProfileDropdownVisible((prevState) => !prevState);
  };

  return (
    <nav className={`navbar ${extraClasses}`}>
      {/* Logo redirects to homepage on click */}
      <img
        src="/logo-no-background-colored.png"
        alt="FileXpress Logo"
        className="nav-logo"
        onClick={() => navigate("/home")}
      />

      <div className="nav-links">
        {/* Render navigation buttons dynamically */}
        {buttons.map((button, index) => (
          <button key={index} onClick={() => navigate(button.path)}>
            {button.label}
          </button>
        ))}

        {/* Show profile section with username and dropdown, or logout button directly */}
        {showUsername ? (
          <div className="nav-profile">
            <span onClick={toggleProfileDropdown} className="profile-name">
              {username}
            </span>
            {isProfileDropdownVisible && (
              <div className="profile-dropdown">
                <button onClick={() => navigate("/profile")}>Profile</button>
                <LogoutButton />
              </div>
            )}
          </div>
        ) : (
          <LogoutButton />
        )}
      </div>
    </nav>
  );
};

export default Navbar;
