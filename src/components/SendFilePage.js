// SendFilePage.js
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { startWebRTC, sendFile } from "../utilities/WebRTCService";
import TokenWrapper from "../utilities/TokenWrapper";
import Navbar from "./Navbar";

const SendFilePage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    // Extract both senderUsername and receiverUsername
    const { senderUsername, receiverUsername, receiverPublicKey } = location.state || {};
    const [selectedFile, setSelectedFile] = useState(null);
    const [statusMessage, setStatusMessage] = useState("");

    useEffect(() => {
        if (receiverUsername && senderUsername) {
            console.log("📤 Sender is preparing connection to:", receiverUsername);
    
            fetch("http://localhost:8080/webrtc/start-webrtc", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sender: senderUsername, receiver: receiverUsername })
            })
            .then(response => response.text())
            .then(text => {
                try {
                    return JSON.parse(text);
                } catch (error) {
                    throw new Error("Invalid JSON response from server: " + text);
                }
            })
            .then(data => {
                console.log("✅ WebRTC Session Started by Server:", data);
                startWebRTC("sender", senderUsername, receiverUsername);
            })
            .catch(error => console.error("❌ WebRTC Session Failed:", error));
        } else {
            navigate("/HandshakePage");
        }
    }, [receiverUsername, senderUsername, navigate]);

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleTransfer = async () => {
        if (!selectedFile) {
            setStatusMessage("Please select a file before transferring.");
            return;
        }
    
        setStatusMessage("Waiting for DataChannel to open...");
        try {
            sendFile(selectedFile, receiverPublicKey);
            setStatusMessage("File sent successfully!");
        } catch (error) {
            console.error("File transfer failed:", error);
            setStatusMessage("File transfer failed.");
        }
    };

    return (
        <TokenWrapper>
            <div className="transfer-page">
                <Navbar buttons={[{ label: "Home", path: "/home" }]} showUsername={true} />
                <div className="transfer-content">
                    <h1>Send a File</h1>
                    <p>Sending to: {receiverUsername}</p>
                    <input type="file" onChange={handleFileChange} className="file-input" />
                    <button className="transfer-button" onClick={handleTransfer}>
                        Start Transfer
                    </button>
                    {statusMessage && <p className="transfer-status">{statusMessage}</p>}
                </div>
            </div>
        </TokenWrapper>
    );
};

export default SendFilePage;