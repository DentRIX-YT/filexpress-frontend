import React, { useState, useEffect } from "react";
import "../styles/SendFilePage.css"; // Styles specific to the SendFilePage component
import { useLocation, useNavigate } from "react-router-dom";
import { validateHandshakeFromServer } from "../utilities/guardUtils";
import {
    startWebRTC,
    sendFile,
    closeWebRTCConnection,
} from "../utilities/WebRTCService"; // WebRTC handling logic
import TokenWrapper from "../utilities/TokenWrapper"; // Ensures access token is valid
import Navbar from "./Navbar"; // Top navigation bar

const SendFilePage = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Extract necessary data passed via navigation state
    const { senderUsername, receiverUsername, receiverPublicKey } =
        location.state || {};

    // Component state variables
    const [selectedFile, setSelectedFile] = useState(null); // Stores the file to be sent
    const [statusMessage, setStatusMessage] = useState(""); // Display status to the user
    const [isDataChannelOpen, setIsDataChannelOpen] = useState(false); // Tracks DataChannel readiness
    const [transferProgress, setTransferProgress] = useState(0); // File transfer progress (0–100%)
    const [isTransferring, setIsTransferring] = useState(false); // Indicates ongoing transfer

    // Establish WebRTC connection on component mount
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
    
            console.log("📤 Sender is preparing connection to:", receiverUsername);
    
            // Notify backend to initiate WebRTC signaling
            fetch("http://localhost:8080/webrtc/start-webrtc", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sender: senderUsername,
                    receiver: receiverUsername,
                }),
            })
                .then((response) => response.text())
                .then((text) => {
                    try {
                        return JSON.parse(text);
                    } catch (error) {
                        throw new Error("Invalid JSON response from server: " + text);
                    }
                })
                .then((data) => {
                    console.log("WebRTC Session Started by Server:", data);
    
                    startWebRTC(
                        "sender",
                        senderUsername,
                        receiverUsername,
                        null,
                        () => {
                            setIsDataChannelOpen(true);
                            setStatusMessage("DataChannel is open. You may now send the file.");
                        },
                        () => {
                            console.log("Transfer confirmed by receiver. Cleaning up...");
                            closeWebRTCConnection();
                            fetch(`http://localhost:8080/webrtc/disconnect?username=${senderUsername}`, {
                                method: "DELETE",
                            });
                            fetch(`http://localhost:8080/handshake/remove/${senderUsername}`, {
                                method: "DELETE",
                            });
                            navigate("/home");
                        }
                    );
                })
                .catch((error) => console.error("WebRTC Session Failed:", error));
        };
    
        validateAndStart();
    
        return () => {
            // Prevent returning to the page after leaving
            window.history.replaceState({}, document.title);
        };
    }, [receiverUsername, senderUsername, location.state, navigate]);
    

    // Handles file input changes
    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    // Initiates the file transfer
    const handleTransfer = async () => {
        if (!selectedFile) {
            setStatusMessage("Please select a file before transferring.");
            return;
        }

        if (!isDataChannelOpen) {
            setStatusMessage("DataChannel is not ready yet. Please wait...");
            return;
        }

        setStatusMessage("Sending file...");
        try {
            setIsTransferring(true);
            setTransferProgress(0);

            // Send file with progress callback
            await sendFile(selectedFile, receiverPublicKey, (percent) => {
                setTransferProgress(percent);
            });

            setIsTransferring(false);
            setStatusMessage("File sent successfully!");

            
        } catch (error) {
            console.error("File transfer failed:", error);
            setStatusMessage("File transfer failed.");
        }
    };


    return (
        <TokenWrapper>
            <div className="transfer-page">
                {/* Navigation bar with home button */}
                <Navbar
                    buttons={[{ label: "Home", path: "/home" }]}
                    showUsername={true}
                />

                {/* File transfer content */}
                <div className="transfer-content">
                    <h1>Send a File</h1>
                    <p>Sending to: {receiverUsername}</p>

                    {/* File selection */}
                    <input
                        type="file"
                        onChange={handleFileChange}
                        className="file-input"
                    />

                    {/* Transfer button (disabled until DataChannel is open) */}
                    <button
                        className="transfer-button"
                        onClick={handleTransfer}
                        disabled={!isDataChannelOpen}
                    >
                        Start Transfer
                    </button>

                    {/* Progress bar and percent */}
                    {isTransferring && (
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
                    )}

                    {/* Status message */}
                    {statusMessage && <p className="transfer-status">{statusMessage}</p>}
                </div>
            </div>
        </TokenWrapper>
    );
};

export default SendFilePage;
