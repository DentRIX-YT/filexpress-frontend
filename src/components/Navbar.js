import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LogoutButton from "./LogoutButton";
import "../styles/Navbar.css";

const Navbar = ({ buttons, showUsername = true, extraClasses = "" }) => {
  const navigate = useNavigate();
  const [isProfileDropdownVisible, setProfileDropdownVisible] = useState(false);
  const [username, setUsername] = useState("Loading...");

  useEffect(() => {
    if (!showUsername) return; // Skip fetching username if not required
    
    const fetchUsername = async () => {
      const accessToken = sessionStorage.getItem("accessToken");
      if (!accessToken) {
        console.error("Access token is missing. Redirecting to login.");
        navigate("/login");
        return;
      }

      try {
        const response = await fetch("http://localhost:8080/users/me", {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (response.ok) {
          const data = await response.json();
          setUsername(data.username);
        } else {
          console.error("Failed to fetch username. Redirecting to login.");
          navigate("/login");
        }
      } catch (error) {
        console.error("Error while fetching username:", error);
        navigate("/login");
      }
    };

    const timer = setTimeout(() => {
      fetchUsername();
    }, 100);

    return () => clearTimeout(timer);
  }, [navigate, showUsername]);

  const toggleProfileDropdown = () => {
    setProfileDropdownVisible((prevState) => !prevState);
  };

  return (
    <nav className={`navbar ${extraClasses}`}>
      <img
        src="/logo-no-background-colored.png"
        alt="FileXpress Logo"
        className="nav-logo"
        onClick={() => navigate("/home")}
      />
      <div className="nav-links">
        {buttons.map((button, index) => (
          <button key={index} onClick={() => navigate(button.path)}>
            {button.label}
          </button>
        ))}
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
        ) : (<LogoutButton />)}
      </div>
    </nav>
  );
};

export default Navbar;