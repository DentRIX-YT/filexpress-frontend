// ReceiveFilePage.js
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "../styles/ReceiveFilePage.css"; // Styling specific to receive page
import { startWebRTC, closeWebRTCConnection } from "../utilities/WebRTCService"; // WebRTC logic for receiving files
import { validateHandshakeFromServer } from "../utilities/GuardUtils";
import { deletePrivateKey } from "../utilities/EncryptionUtilss";
import TokenWrapper from "../utilities/TokenWrapper"; // Authentication wrapper
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar"; // Top navigation component

const ReceiveFilePage = () => {
    const location = useLocation();
    const navigate = useNavigate();


    // Extract sender and receiver usernames from navigation state
    const { senderUsername, receiverUsername } = location.state || {};

    // State for file handling
    const [receivedChunks, setReceivedChunks] = useState([]); // Holds final file blob
    const [fileReady, setFileReady] = useState(false); // Indicates file is ready to download
    const [fileMetadata, setFileMetadata] = useState({ name: "", size: 0 }); // File name, size, type
    const [transferProgress, setTransferProgress] = useState(0);

    // Initiate WebRTC connection on component mount
    useEffect(() => {
        const validateAndStart = async () => {
            if (!location.state || !senderUsername || !receiverUsername) {
                navigate("/HandshakePage");
                return;
            }
    
            const isValid = await validateHandshakeFromServer(senderUsername, receiverUsername);
            if (!isValid) {
                console.warn("🚫 Invalid or missing handshake. Redirecting.");
                navigate("/HandshakePage");
                return;
            }
    
            console.log("Receiver is waiting for file from:", senderUsername);
    
            startWebRTC(
                "receiver",
                receiverUsername,
                senderUsername,
                ({ decryptedBuffer, metadata }) => {
                    const finalBlob = new Blob([decryptedBuffer], { type: metadata.type || "application/octet-stream" });
                    setReceivedChunks([finalBlob]);
                    setFileMetadata({
                        name: metadata.filename,
                        size: metadata.totalSize,
                        type: metadata.type || "application/octet-stream",
                        method: metadata.method
                    });
                    setFileReady(true);
                },
                null, // לא צריך onChannelOpen
                null, // לא צריך onTransferComplete
                (percent) => setTransferProgress(percent) 
            );
        };

        validateAndStart();

    }, [senderUsername, receiverUsername,location.state, navigate]);

    // Saves the received file using a temporary link
    const handleSaveFile = async () => {
        try {
            if (receivedChunks.length === 0) return;
    
            const receivedBuffer = new Blob(receivedChunks, { type: fileMetadata.type });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(receivedBuffer);
            link.download = fileMetadata.name;
            link.click();
    
            await logTransfer();
            closeWebRTCConnection();
            await deletePrivateKey();
            fetch(`http://localhost:8080/webrtc/disconnect?username=${receiverUsername}`, {
                method: "DELETE"
            });
            fetch(`http://localhost:8080/handshake/remove/${senderUsername}`, {
                method: "DELETE",
            });     
            navigate("/home"); // Redirect to home after saving
        } catch (err) {
            console.error("Failed to finalize transfer:", err);
        }
    };
    

    const logTransfer = async () => {
        const token = sessionStorage.getItem("accessToken");
    
        if (!token) {
            console.error("No token found. User may not be authenticated.");
            return;
        }
    
        try {
            const response = await fetch("http://localhost:8080/api/logs/add", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    senderUsername: senderUsername,
                    receiverUsername: receiverUsername,
                    filename: fileMetadata.name,
                    method: fileMetadata.method,
                    storedForLater: fileMetadata.storedForLater || false,
                }),
            });
    
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Transfer log save failed:", response.status, errorText);
            } else {
                console.log("Transfer log saved.");
            }
        } catch (err) {
            console.error("Transfer log save exception:", err);
        }
    };
    
    
    

    return (
        <TokenWrapper>
            <div className="receive-file-page">
                <Navbar buttons={[{ label: "Home", path: "/home" }]} showUsername={true} />

                <div className="receive-file-container">
                    <h1>Receive a File</h1>

                    {!fileReady ? (
                        <>
                            <p>
                                {receivedChunks.length > 0
                                    ? "Receiving file..."
                                    : "Waiting for file transfer..."}
                            </p>
                            <div className="progress-bar-wrapper">
                                <div
                                    className="progress-bar"
                                    style={{
                                        width: `${transferProgress}%`,
                                        height: "10px",
                                        backgroundColor: "#4caf50",
                                    }}
                                />
                                <p>{transferProgress}%</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <p><strong>File received successfully!</strong></p>
                            <p><strong>File name:</strong> {fileMetadata.name}</p>
                            <p><strong>Size:</strong> {(fileMetadata.size / 1024).toFixed(2)} KB</p>
                            <button onClick={handleSaveFile}>Save File</button>
                        </>
                    )}
                </div>
            </div>
        </TokenWrapper>
    );
};

export default ReceiveFilePage;
