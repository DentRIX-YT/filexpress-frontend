import React, { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/TransferFilesPage.css";
import TokenWrapper from "../utilities/TokenWrapper";
import Navbar from "./Navbar";

const TransferFilesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, receiverUsername, receiverPublicKey } = location.state || {}; // Get receiver data
  const [selectedFile, setSelectedFile] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  // Memoized function to avoid re-creation on each render
  const handleRemovaleOfHandshake = useCallback(async () => {
    const accessToken = sessionStorage.getItem("accessToken");

    if (!accessToken) {
      console.error("No access token found, authentication required.");
      return;
    }

    try {
      const response = await fetch(`http://localhost:8080/handshake/remove/${receiverUsername}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`, // Include JWT token
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Handshake removed:", data);
      } else {
        console.error("Failed to remove handshake:", await response.text());
      }
    } catch (error) {
      console.error("Error removing handshake:", error);
    }
  }, [receiverUsername]); // Only re-create if receiverUsername changes



  useEffect(() => {
    if (!role) {
      navigate("/HandshakePage");
    }

    // Remove handshake only for the sender
    if (role === "sender") {
      handleRemovaleOfHandshake();
    }
  }, [role, navigate, handleRemovaleOfHandshake]); // Now safe to include


  // Generate AES key
  const generateAESKey = async () => {
    return await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  };

  // Encrypt file using AES key
  const encryptFile = async (file, aesKey) => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // IV for AES-GCM
    const fileBuffer = await file.arrayBuffer();
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      fileBuffer
    );

    return {
      encryptedFile: new Blob([iv, new Uint8Array(encryptedBuffer)]),
      iv: iv,
    };
  };

  // Encrypt AES key using receiver's public key
  const encryptAESKey = async (aesKey, receiverPublicKey) => {
    const exportedKey = await window.crypto.subtle.exportKey("raw", aesKey);
    const publicKeyBuffer = Uint8Array.from(atob(receiverPublicKey), (c) => c.charCodeAt(0));

    const importedPublicKey = await window.crypto.subtle.importKey(
      "spki",
      publicKeyBuffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    );

    return await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, importedPublicKey, exportedKey);
  };

  // Handle file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setStatusMessage("");
    setUploadProgress(0);
  };

  // Handle transfer process
  const handleTransfer = async () => {
    if (!selectedFile) {
      setStatusMessage("Please select a file before transferring.");
      return;
    }

    setStatusMessage("Generating AES key...");
    const aesKey = await generateAESKey();

    setStatusMessage("Encrypting file...");
    const { encryptedFile, iv } = await encryptFile(selectedFile, aesKey);

    setStatusMessage("Encrypting AES key...");
    const encryptedAESKey = await encryptAESKey(aesKey, receiverPublicKey);

    setStatusMessage("Uploading encrypted file...");

    const formData = new FormData();
    formData.append("senderUsername", "YourUsername"); // Change to actual username
    formData.append("receiverUsername", receiverUsername);
    formData.append("encryptedFile", encryptedFile);
    formData.append("iv", btoa(String.fromCharCode(...iv)));
    formData.append("encryptedAESKey", btoa(String.fromCharCode(...new Uint8Array(encryptedAESKey))));

    try {
      const response = await fetch("http://localhost:8080/file/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setStatusMessage("File transferred successfully!");
      } else {
        setStatusMessage("Failed to transfer file.");
      }
    } catch (error) {
      console.error("File transfer error:", error);
      setStatusMessage("Error occurred during file transfer.");
    }
  };

  return (
    <TokenWrapper>
      <div className="transfer-page">
        <Navbar buttons={[{ label: "Home", path: "/home" }]} showUsername={true} />
        <div className="transfer-content">
          <h1>{role === "sender" ? "Send a File" : "Receive a File"}</h1>
          <p>
            {role === "sender"
              ? `Sending to: ${receiverUsername}`
              : "Waiting for the sender to transfer a file..."}
          </p>

          {role === "sender" && (
            <>
              <div className="file-upload-container">
                <input type="file" onChange={handleFileChange} className="file-input" />
              </div>

              {selectedFile && <p className="file-name">Selected File: {selectedFile.name}</p>}

              <button className="transfer-button" onClick={handleTransfer}>
                Start Transfer
              </button>

              {uploadProgress > 0 && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              )}
            </>
          )}

          {statusMessage && <p className="transfer-status">{statusMessage}</p>}
        </div>
      </div>
    </TokenWrapper>
  );
};

export default TransferFilesPage;