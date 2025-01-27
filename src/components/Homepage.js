import React, { useState } from "react";
import "../styles/HomePage.css";
import LogoutButton from "./LogoutButton";
import TokenWrapper from "../utilities/TokenWrapper";
import { useNavigate } from "react-router-dom";

const HomePage = () => {
  const navigate = useNavigate();
  const [isProfileDropdownVisible, setProfileDropdownVisible] = useState(false);

  const toggleProfileDropdown = () => {
    setProfileDropdownVisible((prevState) => !prevState);
  };

  return (
    <TokenWrapper>
      <div className="home-page">
        {/* Navigation Bar */}
        <nav className="navbar">
          <img
            src="/logo-no-background-colored.png" // Update with your logo's path
            alt="FileXpress Logo"
            className="nav-logo"
            onClick={() => navigate("/home")}
          />
          <div className="nav-links">
            <button onClick={() => navigate("/transfer-files")}>Transfer Files</button>
            <button onClick={() => navigate("/view-old-files")}>View Old Files</button>
            <div className="nav-profile">
              <span onClick={toggleProfileDropdown} className="profile-name">
                Nadav2005
              </span>
              {isProfileDropdownVisible && (
                <div className="profile-dropdown">
                  <button onClick={() => navigate("/profile")}>Profile</button>
                  <LogoutButton />
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* About Section */}
        <div className="home-content">
          <h1>About FileXpress</h1>
          <div className="about-details">
            <p>
              FileXpress is your secure and user-friendly platform for managing and transferring files. It provides a reliable, seamless, and secure solution tailored for both professional and casual users.
            </p>
            <ul className="features-list">
              <li>
                <strong>Secure Transfers:</strong> Your files are encrypted during transfer and storage, ensuring complete privacy and protection.
              </li>
              <li>
                <strong>Robust Storage:</strong> Easily access your files anytime with scalable and reliable storage options.
              </li>
              <li>
                <strong>Easy Collaboration:</strong> Share files with teammates, set permissions, and track activities effortlessly.
              </li>
              <li>
                <strong>User-Centric Design:</strong> FileXpress is intuitive and easy to use, regardless of your technical expertise.
              </li>
            </ul>
            <p>
              Whether you're managing personal files or collaborating on work projects, FileXpress adapts to your needs and keeps your data secure.
            </p>
          </div>
        </div>
      </div>
    </TokenWrapper>
  );
};

export default HomePage;