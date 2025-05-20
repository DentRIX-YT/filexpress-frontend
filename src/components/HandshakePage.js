import React, { useState, useEffect } from "react";
import { decryptAndCachePrivateKey } from "../utilities/EncryptionUtilss";
import "../styles/HandshakePage.css";
import TokenWrapper from "../utilities/TokenWrapper"; // Auth wrapper component
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar"; // Top navigation bar component

const HandshakePage = () => {
  const navigate = useNavigate();

  // State variables
  const [username, setUsername] = useState("Loading...");
  const [role, setRole] = useState(null); // Either 'sender' or 'receiver'
  const [handshakeCode, setHandshakeCode] = useState(""); // 6-digit code for sender
  const [receiverCode, setReceiverCode] = useState(""); // Code entered by receiver
  const [passphrase, setPassphrase] = useState(""); // Passphrase for decrypting private key
  const [statusMessage, setStatusMessage] = useState(""); // UI message to show status
  const [animationClass, setAnimationClass] = useState(""); // For fade-in animation

  // Buttons to be passed to the Navbar
  const handshakeButtons = [
    { label: "View Old Files", path: "/view-old-files" },
  ];

  // Fetch username on component mount
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

    // Slight delay to ensure component renders smoothly
    const timer = setTimeout(() => {
      fetchUsername();
    }, 150);

    return () => clearTimeout(timer);
  }, [navigate]);

  // Generates a random 6-digit handshake code
  const generateHandshakeCode = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

  // Handler for selecting "Sender" role
  const handleSenderSelect = async () => {
    setRole("sender");
    const newHandshakeCode = generateHandshakeCode();
    setHandshakeCode(newHandshakeCode);

    try {
      const response = await fetch("http://localhost:8080/handshake/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderUsername: username,
          handshakeCode: newHandshakeCode,
        }),
      });

      const data = await response.json();
      if (data.handshakeCode === newHandshakeCode) {
        setAnimationClass("fade-in");

        // Polling backend every 3 seconds for handshake completion status
        const intervalId = setInterval(async () => {
          const statusResponse = await fetch(
            `http://localhost:8080/handshake/status/${username}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${sessionStorage.getItem("accessToken")}`,
              "Content-Type": "application/json"
            }
          }
          );
          const statusData = await statusResponse.json();

          if (statusData.status === "completed") {
            clearInterval(intervalId);
            sessionStorage.setItem("handshakeAuthenticated", "true");

            setStatusMessage("Handshake completed! Redirecting...");
            setTimeout(() => {
              navigate("/send-file", {
                state: {
                  role: "sender",
                  receiverUsername: statusData.receiverUsername,
                  senderUsername: username,
                  receiverPublicKey: statusData.receiverPublicKey,
                },
              });
            }, 2000);
          }
        }, 3000);
      }
    } catch (error) {
      console.error("Error generating handshake code:", error);
    }
  };

  // Handler for selecting "Receiver" role
  const handleReceiverSelect = () => {
    setRole("receiver");
    setAnimationClass("fade-in");
  };

  // Submit handler for the receiver's form
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
          Authorization: `Bearer ${sessionStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiverUsername: username,
          providedHandshakeCode: receiverCode,
          passphrase: passphrase,
        }),
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (response.ok) {
        if (data.status === "success") {
          handleHandshakeSuccess(data.encryptedPrivateKey, passphrase, data.senderUsername);
        } else {
          setStatusMessage("Unexpected response. Please try again.");
        }
      } else {
        if (data.status === "failed-passphrase") {
          setStatusMessage("Invalid passphrase. Please check and try again.");
        } else if (data.status === "failed") {
          setStatusMessage("Invalid handshake code. Please check and try again.");
        } else {
          setStatusMessage("An unknown error occurred. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error validating handshake:", error);
      setStatusMessage("A network error occurred. Check your connection and try again.");
    }
  };


  // Handles successful handshake after decrypting private key
  const handleHandshakeSuccess = async (encryptedPrivateKey, passphrase, senderUsername) => {
    const privateKey = await decryptAndCachePrivateKey(encryptedPrivateKey, passphrase);
    if (privateKey) {
      sessionStorage.setItem("handshakeAuthenticated", "true");
      setStatusMessage("Handshake successful! Redirecting...");

      setTimeout(() => {
        navigate("/receive-file", {
          state: {
            role: "receiver",
            senderUsername: senderUsername,
            receiverUsername: username,
          },
        });
      }, 2000);
    } else {
      console.error("Failed to decrypt private key.");
    }
  };

  // JSX rendering
  return (
    <TokenWrapper>
      <div className="handshake-page">
        <Navbar buttons={handshakeButtons} showUsername={true} />

        <div className={`handshake-content ${animationClass}`}>
          {!role && (
            <div className="handshake-choice">
              <div className="handshake-buttons-container">
                <button
                  onClick={handleSenderSelect}
                  className="handshake-button"
                >
                  I am the Sender
                </button>
                <button
                  onClick={handleReceiverSelect}
                  className="handshake-button"
                >
                  I am the Receiver
                </button>
              </div>
            </div>
          )}

          {role === "sender" && (
            <div className="handshake-sender">
              <h2>Share this code with the receiver:</h2>
              <div className="handshake-code">{handshakeCode}</div>
              <p>Wait for the receiver to enter this code.</p>
            </div>
          )}

          {role === "receiver" && (
            <div className="handshake-receiver">
              <div className="form-group">
                <input
                  type="text"
                  maxLength="6"
                  className="handshake-input"
                  placeholder="Enter 6-digit code"
                  value={receiverCode}
                  onChange={(e) => setReceiverCode(e.target.value)}
                />
              </div>
              <div className="form-group">
                <input
                  type="password"
                  className="handshake-input"
                  placeholder="Enter your passphrase"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                />
              </div>
              {statusMessage && (
                <p className="handshake-status">{statusMessage}</p>
              )}
              <button
                onClick={handleReceiverSubmit}
                className="handshake-button"
              >
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
