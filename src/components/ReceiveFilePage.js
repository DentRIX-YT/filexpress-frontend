import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { startWebRTC } from "../utilities/WebRTCService";
import TokenWrapper from "../utilities/TokenWrapper";
import Navbar from "./Navbar";

const ReceiveFilePage = () => {
    const location = useLocation();
    const { senderUsername, receiverUsername } = location.state || {};
    const [receivedChunks, setReceivedChunks] = useState([]);

    useEffect(() => {
        if (senderUsername) {
            console.log("🎧 Receiver is waiting for file from:", senderUsername);
            startWebRTC("receiver", receiverUsername ,senderUsername, (chunk) => {
                console.log("📩 Received chunk:", chunk);
                setReceivedChunks((prevChunks) => [...prevChunks, chunk]);
            });
        } else {
            console.error("❌ senderUsername is missing! Check handshake flow.");
        }
    }, [senderUsername]);

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