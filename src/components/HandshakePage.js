import React, { useState, useEffect } from "react";
import "../styles/HandshakePage.css";
import LogoutButton from "./LogoutButton";
import TokenWrapper from "../utilities/TokenWrapper";
import { useNavigate } from "react-router-dom";

const HandshakePage = () => {
  const navigate = useNavigate();
  const [isProfileDropdownVisible, setProfileDropdownVisible] = useState(false);
  const [username, setUsername] = useState("Loading...");
  const [role, setRole] = useState(null); // "sender" or "receiver"
  const [handshakeCode, setHandshakeCode] = useState("");
  const [receiverCode, setReceiverCode] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [animationClass, setAnimationClass] = useState("");

  useEffect(() => {
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
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
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

    // Delay the fetchUsername call by 100ms
    const timer = setTimeout(() => {
      fetchUsername();
    }, 100);

    // Cleanup the timeout if the component unmounts
    return () => clearTimeout(timer);
  }, [navigate]);

  const toggleProfileDropdown = () => {
    setProfileDropdownVisible((prevState) => !prevState);
  };

  const generateHandshakeCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSenderSelect = async () => {
    try {
      setRole("sender");
      const newHandshakeCode = generateHandshakeCode();
      setHandshakeCode(newHandshakeCode);

      const response = await fetch("http://localhost:8080/handshake/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderUsername: username,
          handshakeCode: newHandshakeCode,
        }),
      });

      console.log("Handshake code generated:", newHandshakeCode);
      const data = await response.json();

      if (data.handshakeCode === newHandshakeCode) {
        setHandshakeCode(newHandshakeCode);
        setAnimationClass("fade-in");

        // Start polling to check if handshake is completed
        const intervalId = setInterval(async () => {
          const statusResponse = await fetch(
            `http://localhost:8080/handshake/status/${username}`
          );
          const statusData = await statusResponse.json();

          if (statusData.status === "completed") {
            clearInterval(intervalId); // Stop polling
            setStatusMessage("Handshake completed! Redirecting...");
            setTimeout(() => navigate("/transfer-files"), 2000);
          }
        }, 3000); // Poll every 3 seconds
      }
    } catch (error) {
      console.error("Error generating handshake code:", error);
    }
  };

  const handleReceiverSelect = () => {
    setRole("receiver");
    setAnimationClass("fade-in");
  };

  const handleReceiverSubmit = async () => {
    if (receiverCode.length !== 6) {
      setStatusMessage("Handshake code must be 6 digits.");
      return;
    }

    if (passphrase.length < 6) {
      setStatusMessage("Passphrase must be at least 6 characters.");
      return;
    }

    try {
      const response = await fetch("http://localhost:8080/handshake/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiverUsername: username,
          providedHandshakeCode: receiverCode,
          passphrase: passphrase,
        }),
      });

      // 🔹 Check if the response is valid JSON
      const text = await response.text(); // Get raw text response
      console.log("Raw API Response:", text); // Debugging

      const data = text ? JSON.parse(text) : {}; // Parse JSON if not empty

      if (!response.ok) {
        setStatusMessage("Server error. Try again.");
        return;
      }

      if (data.status === "success") {
        setStatusMessage("Handshake successful! Redirecting...");
        setTimeout(() => navigate("/transfer-files"), 2000);
      } else if (data.status === "error") {
        setStatusMessage("Handshake failed. Check your code.");
      } else if (data.status === "error-passphrase") {
        setStatusMessage("Handshake failed. Check your passphrase.");
      } else {
        setStatusMessage("Unknown error occurred.");
      }
    } catch (error) {
      console.error("Error validating handshake:", error);
      setStatusMessage("An error occurred. Try again.");
    }
  };

  return (
    <TokenWrapper>
      <div className="tf-page">
        <nav className="tf-navbar">
          <img
            src="/logo-no-background-colored.png"
            alt="FileXpress Logo"
            className="tf-nav-logo"
            onClick={() => navigate("/home")}
          />
          <div className="tf-nav-links">
            <button onClick={() => navigate("/view-old-files")}>
              View Old Files
            </button>
            <div className="tf-nav-profile">
              <span onClick={toggleProfileDropdown} className="tf-profile-name">
                {username}
              </span>
              {isProfileDropdownVisible && (
                <div className="tf-profile-dropdown">
                  <button onClick={() => navigate("/profile")}>Profile</button>
                  <LogoutButton />
                </div>
              )}
            </div>
          </div>
        </nav>

        <div className={`tf-content ${animationClass}`}>
          {!role && (
            <div className="tf-choice">
              <button onClick={handleSenderSelect} className="tf-button">
                I am the Sender
              </button>
              <button onClick={handleReceiverSelect} className="tf-button">
                I am the Receiver
              </button>
            </div>
          )}

          {role === "sender" && (
            <div className="tf-sender">
              <h2>Share this code with the receiver:</h2>
              <div className="tf-code">{handshakeCode}</div>
              <p>Wait for the receiver to enter this code.</p>
            </div>
          )}

          {role === "receiver" && (
            <div className="tf-receiver">
              <input
                type="text"
                maxLength="6"
                className="tf-input"
                placeholder="Enter 6-digit code"
                value={receiverCode}
                onChange={(e) => setReceiverCode(e.target.value)}
              />
              <input
                type="password"
                className="tf-input"
                placeholder="Enter your passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
              />
              {statusMessage && <p className="tf-status">{statusMessage}</p>}
              <button onClick={handleReceiverSubmit} className="tf-button">
                Confirm Handshake
              </button>
            </div>
          )}
        </div>
      </div>
    </TokenWrapper>
  );
};

export default HandshakePage;
