// ReceiveFilePage.js
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { startWebRTC } from "../utilities/WebRTCService";
import TokenWrapper from "../utilities/TokenWrapper";
import Navbar from "./Navbar";

const ReceiveFilePage = () => {
    const location = useLocation();
    // Expect both senderUsername and receiverUsername from navigation state
    const { senderUsername, receiverUsername } = location.state || {};
    const [receivedChunks, setReceivedChunks] = useState([]);

    useEffect(() => {
        if (senderUsername && receiverUsername) {
            console.log("🎧 Receiver is waiting for file from:", senderUsername);
            // For receiver, the local username is the receiverUsername,
            // and the peer (the sender) is senderUsername.
            startWebRTC("receiver", receiverUsername, senderUsername, (chunk) => {
                console.log("📩 Received chunk:", chunk);
                setReceivedChunks((prev) => [...prev, chunk]);
            });
        } else {
            console.error("❌ senderUsername or receiverUsername is missing! Check handshake flow.");
        }
    }, [senderUsername, receiverUsername]);

    const handleSaveFile = () => {
        if (receivedChunks.length === 0) return;
        const receivedBuffer = new Blob(receivedChunks);
        const link = document.createElement("a");
        link.href = URL.createObjectURL(receivedBuffer);
        link.download = "received_file";
        link.click();
        console.log("💾 File saved successfully.");
    };

    return (
        <TokenWrapper>
            <div className="receive-file-page">
                <Navbar buttons={[{ label: "Home", path: "/home" }]} showUsername={true} />
                <div className="receive-file-container">
                    <h1>Receive a File</h1>
                    <p>{receivedChunks.length > 0 ? "Receiving file..." : "Waiting for file transfer..."}</p>
                    {receivedChunks.length > 0 && <button onClick={handleSaveFile}>Save File</button>}
                </div>
            </div>
        </TokenWrapper>
    );
};

export default ReceiveFilePage;