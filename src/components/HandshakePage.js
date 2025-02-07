import React, { useState, useEffect } from "react";
import { openDB } from "idb";
import "../styles/HandshakePage.css";
import TokenWrapper from "../utilities/TokenWrapper";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

const HandshakePage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("Loading...");
  const [role, setRole] = useState(null);
  const [handshakeCode, setHandshakeCode] = useState("");
  const [receiverCode, setReceiverCode] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [animationClass, setAnimationClass] = useState("");

  const handshakeButtons = [
    { label: "View Old Files", path: "/view-old-files" },
  ];

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

    const timer = setTimeout(() => {
      fetchUsername();
    }, 150);

    return () => clearTimeout(timer);
  }, [navigate]);

  const generateHandshakeCode = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

  const handleSenderSelect = async () => {
    setRole("sender");
    const newHandshakeCode = generateHandshakeCode();
    setHandshakeCode(newHandshakeCode);

    try {
      const response = await fetch("http://localhost:8080/handshake/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderUsername: username,
          handshakeCode: newHandshakeCode,
        }),
      });

      const data = await response.json();
      if (data.handshakeCode === newHandshakeCode) {
        setAnimationClass("fade-in");

        const intervalId = setInterval(async () => {
          const statusResponse = await fetch(
            `http://localhost:8080/handshake/status/${username}`
          );
          const statusData = await statusResponse.json();

          if (statusData.status === "completed") {
            clearInterval(intervalId);
            setStatusMessage("Handshake completed! Redirecting...");
            setTimeout(() => navigate("/transfer-files"), 2000);
          }
        }, 3000);
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverUsername: username,
          providedHandshakeCode: receiverCode,
          passphrase: passphrase,
        }),
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (!response.ok) {
        setStatusMessage("Server error. Try again.");
        return;
      }

      if (data.status === "success") {
        handleHandshakeSuccess(data.encryptedPrivateKey, passphrase);

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

  const decryptPrivateKey = async (encryptedKey, passphrase) => {
    try {
      // Split salt, IV, and encrypted data
      const [saltBase64, ivBase64, encryptedBase64] = encryptedKey.split(":");
  
      const salt = new Uint8Array(
        atob(saltBase64)
          .split("")
          .map((c) => c.charCodeAt(0))
      );
      const iv = new Uint8Array(
        atob(ivBase64)
          .split("")
          .map((c) => c.charCodeAt(0))
      );
      const encryptedData = new Uint8Array(
        atob(encryptedBase64)
          .split("")
          .map((c) => c.charCodeAt(0))
      );
  
      const encoder = new TextEncoder();
      const passphraseKey = encoder.encode(passphrase);
  
      // Derive AES key using PBKDF2
      const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        passphraseKey,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
      );
  
      const aesKey = await window.crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: 100000,
          hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );
  
      // Decrypt private key
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        encryptedData
      );
  
      const decryptedPrivateKey = new TextDecoder().decode(decryptedBuffer);
  
      // Store in IndexedDB
      const db = await openDB("filexpressDB", 1, {
        upgrade(db) {
          db.createObjectStore("keys");
        },
      });
  
      await db.put("keys", decryptedPrivateKey, "privateKey");
  
      console.log("Private key stored temporarily in IndexedDB.");
  
      return decryptedPrivateKey;
    } catch (error) {
      console.error("Decryption error:", error);
      return null;
    }
  };

  const handleHandshakeSuccess = async (encryptedPrivateKey, passphrase) => {
    const privateKey = await decryptPrivateKey(encryptedPrivateKey, passphrase);
    if (privateKey) {
      sessionStorage.setItem("handshakeAuthenticated", "true"); // Set authentication flag
      setStatusMessage("Handshake successful! Redirecting...");
      setTimeout(() => navigate("/transfer-files"), 2000);
    } else {
      console.error("Failed to decrypt private key.");
    }
  };

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
