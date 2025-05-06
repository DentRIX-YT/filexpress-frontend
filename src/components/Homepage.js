import React from "react";
import "../styles/HomePage.css"; // Styles specific to the HomePage component
import TokenWrapper from "../utilities/TokenWrapper"; // Wrapper to validate and enforce token-based access
import Navbar from "./Navbar"; // Navigation bar component

const HomePage = () => {
  // Define navigation buttons to be shown in the Navbar
  const homeButtons = [
    { label: "Transfer Files", path: "/HandshakePage" },
    { label: "View Old Files", path: "/view-old-files" },
  ];

  return (
    <TokenWrapper>
      <div className="home-page">
        {/* Top navigation bar with available routes and username display */}
        <Navbar buttons={homeButtons} showUsername={true} />

        {/* Main content area - About section */}
        <div className="home-content">
          <h1>About FileXpress</h1>
          <div className="about-details">
            <p>
              FileXpress is your secure and user-friendly platform for managing
              and transferring files. It provides a reliable, seamless, and
              secure solution tailored for both professional and casual users.
            </p>

            {/* Key features list */}
            <ul className="features-list">
              <li>
                <strong>Secure Transfers:</strong> Your files are encrypted
                during transfer and storage, ensuring complete privacy and
                protection.
              </li>
              <li>
                <strong>Robust Storage:</strong> Easily access your files
                anytime with scalable and reliable storage options.
              </li>
              <li>
                <strong>Easy Collaboration:</strong> Share files with teammates,
                set permissions, and track activities effortlessly.
              </li>
              <li>
                <strong>User-Centric Design:</strong> FileXpress is intuitive
                and easy to use, regardless of your technical expertise.
              </li>
            </ul>

            {/* Closing paragraph */}
            <p>
              Whether you're managing personal files or collaborating on work
              projects, FileXpress adapts to your needs and keeps your data
              secure.
            </p>
          </div>
        </div>
      </div>
    </TokenWrapper>
  );
};

export default HomePage;
