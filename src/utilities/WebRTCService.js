// WebRTCService.js
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import {
    generateAESKey,
    encryptFile,
    decryptFile,
    encryptAESKeyWithPublicKey,
    decryptAESKeyWithPrivateKey,
} from "../utilities/EncryptionUtilss.js";

// This file handles WebRTC connections and file transfers between users.
// It uses STOMP over WebSocket for signaling and IDB for local storage.
// The WebRTC connection is established based on the role (sender/receiver) and the peer's username.
let peerConnection;
let dataChannel;
let stompClient;
let onDataChannelOpen = () => { };
let onDataReceivedCallback = () => { };
let onTransferCompleteCallback = () => { };
let onProgressReceiverCallback = () => {};
let isStompConnected = false; // Track STOMP connection status
let receivedChunks = [];
let receivedMetadata = null;

// Function to start WebRTC connection
export const startWebRTC = (
    role,
    username,
    peerUsername,
    onDataReceived,
    onChannelOpenCallback,
    onTransferComplete,
    onProgressReceiver
) => {
    onDataReceivedCallback = onDataReceived;
    if (onTransferComplete) {
        onTransferCompleteCallback = onTransferComplete;
    }
    if (onChannelOpenCallback) {
        onDataChannelOpen = onChannelOpenCallback;
    }
    if (onProgressReceiver) {
        onProgressReceiverCallback = onProgressReceiver;
    }
    // Initialize STOMP client
    console.log(`WebRTC Role: ${role}, Peer: ${peerUsername}`);

    const socket = new SockJS("http://localhost:8080/webrtc-signaling");
    stompClient = new Client({
        webSocketFactory: () => socket,
        debug: (msg) => console.log("STOMP Debug:", msg),
        reconnectDelay: 5000,
    });

    // Connect to STOMP server
    stompClient.onConnect = () => {
        console.log("Connected to WebSocket signaling server.");
        isStompConnected = true;

        stompClient.subscribe("/topic/signaling", (message) => {
            const data = JSON.parse(message.body);
            console.log("Received signaling message:", data);
            // Debug: output the intended recipient and local username
            console.log(
                `Received message with "to": "${data.to}"; Local username: "${username}"`
            );

            if (data.type === "offer") {
                // Check if the offer message is intended for the current user
                if (data.to !== username) {
                    console.log("Offer message not for me, ignoring.");
                    return;
                }
                console.log("Applying SDP offer...");
                peerConnection
                    .setRemoteDescription(
                        new RTCSessionDescription({ type: "offer", sdp: data.sdp })
                    )
                    .then(() => peerConnection.createAnswer())
                    .then((answer) => {
                        peerConnection.setLocalDescription(answer);
                        stompClient.publish({
                            destination: "/app/signal",
                            body: JSON.stringify({
                                type: "answer",
                                sdp: answer.sdp,
                                from: username, // current user sending the answer
                                to: data.from, // original sender of the offer
                            }),
                        });
                    })
                    .catch((error) => console.error("Error handling offer:", error));
            } else if (data.type === "answer") {
                // Only process the answer if it is meant for me.
                if (data.to !== username) {
                    console.log("Answer message not for me, ignoring.");
                    return;
                }
                if (peerConnection.remoteDescription) {
                    console.log(
                        "Remote description already set, ignoring duplicate answer."
                    );
                    return;
                }
                console.log("Applying SDP answer...");
                peerConnection.setRemoteDescription(
                    new RTCSessionDescription({ type: "answer", sdp: data.sdp })
                );
            }
        });
    };

    stompClient.activate(); // Starts STOMP connection asynchronously

    // Wait for STOMP to be ready before proceeding
    const checkStompReady = setInterval(() => {
        if (isStompConnected) {
            clearInterval(checkStompReady);
            initializePeerConnection(role, peerUsername, username);
        }
    }, 100);
};

// Function to initialize the PeerConnection and DataChannel
// This function is called after the STOMP connection is established
// It sets up the ICE candidate handling and DataChannel events
// Depending on the role (sender/receiver), it creates a DataChannel or waits for one
const initializePeerConnection = (role, peerUsername, username) => {
    const config = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" }, // Public STUN server
            {
                urls: "turn:global.relay.metered.ca:80", // Free TURN server
                username: "0761e8061a1e5890b6aa1b79",
                credential: "ZJd1um/lC9LIoo9f",
            },
        ],
    };

    peerConnection = new RTCPeerConnection(config);

    // Log ICE candidates for debugging
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            const candidateStr = event.candidate.candidate;
            const protocolMatch = candidateStr.match(/(udp|tcp)/i);
            const typeMatch = candidateStr.match(/typ (\w+)/i);

            const protocol = protocolMatch ? protocolMatch[1] : "unknown";
            const candidateType = typeMatch ? typeMatch[1] : "unknown";

            console.log(
                `📡 ICE candidate: protocol=${protocol}, type=${candidateType}`
            );
            console.log("📥 Full candidate string:", candidateStr);
        } else {
            console.log("✅ All ICE candidates have been sent.");
        }
    };

    // Monitor ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", peerConnection.iceConnectionState);
    };

    //if the role is sender, create a data channel
    // and send an offer to the receiver
    if (role === "sender") {
        console.log("Sender: Creating DataChannel...");
        dataChannel = peerConnection.createDataChannel("fileTransfer");

        dataChannel.onopen = () => {
            console.log("Sender: DataChannel Opened!");
            onDataChannelOpen();
        };

        dataChannel.onerror = (error) => console.error("DataChannel error:", error);

        dataChannel.onmessage = (event) => {
            if (typeof event.data === "string") {
                try {
                    const parsed = JSON.parse(event.data);
                    if (parsed.type === "transfer-complete") {
                        console.log("✅ Transfer confirmed by receiver.");
                        onTransferCompleteCallback(); // ← קריאה ל-callback
                    }
                } catch (e) {
                    console.error("Invalid message format:", event.data);
                }
            }
        };
        

        createAndSendOffer(peerUsername, username);
        //if the role is receiver, wait for the data channel to be created
    } else if (role === "receiver") {
        console.log("Receiver: Waiting for DataChannel...");
        peerConnection.ondatachannel = (event) => {
            dataChannel = event.channel;

            dataChannel.onopen = () => {
                console.log("Receiver: DataChannel Opened!");
            };

            // Handle incoming messages
            dataChannel.onmessage = async (event) => {
                if (typeof event.data === "string") {
                    const parsed = JSON.parse(event.data);
                    if (parsed.type === "metadata") {
                        receivedMetadata = parsed.metadata;
                        receivedChunks = [];
                        console.log("Received metadata:", receivedMetadata);
                    }
                } else {
                    // Handle binary data (file chunks)
                    console.log("Receiver: Received DataChunk!");
                    receivedChunks.push(event.data);

                    // מחשב גודל כולל שהתקבל
                    const receivedSize = receivedChunks.reduce(
                        (acc, chunk) => acc + chunk.size,
                        0
                    );
                    
                    // עדכון progress
                    if (receivedMetadata && onProgressReceiverCallback) {
                        const percent = Math.floor((receivedSize / receivedMetadata.totalSize) * 100);
                        onProgressReceiverCallback(percent);
                    }
                    
                    if (receivedMetadata && receivedSize >= receivedMetadata.totalSize) {
                        const encryptedBlob = new Blob(receivedChunks);
                        const arrayBuffer = await encryptedBlob.arrayBuffer();

                        const privateKeyPem = window.sessionPrivateKey;


                        // Check if privateKeyPem is null
                        if (!privateKeyPem) {
                            console.error("Private key not found in IndexedDB.");
                            alert("File transfer failed: Private key not found.");
                            return;
                        }
                        // Decrypt the AES key using the private key
                        // and the encrypted AES key received in the metadata
                        const decryptedAESKey = await decryptAESKeyWithPrivateKey(
                            new Uint8Array(receivedMetadata.encryptedAESKey),
                            privateKeyPem
                        );

                        // Check if decryptedAESKey is null
                        if (!decryptedAESKey) {
                            console.error("Failed to decrypt AES key.");
                            alert("File transfer failed: Unable to decrypt AES key.");
                            return;
                        }
                        const aesKeyBytes =
                            typeof decryptedAESKey === "string"
                                ? new TextEncoder().encode(decryptedAESKey)
                                : decryptedAESKey;

                        // Verify the file integrity using SHA-256 hash
                        // Calculate the hash of the received file
                        // and compare it with the hash in the metadata
                        const receivedHashBuffer = await crypto.subtle.digest(
                            "SHA-256",
                            arrayBuffer
                        );
                        const receivedHashArray = Array.from(
                            new Uint8Array(receivedHashBuffer)
                        );
                        const originalHash = receivedMetadata.sha256;
                        const hashesMatch =
                            JSON.stringify(receivedHashArray) ===
                            JSON.stringify(originalHash);

                        if (!hashesMatch) {
                            console.error("File hash mismatch – file corrupted or tampered!");
                            alert("File transfer failed due to hash mismatch.");
                            return;
                        }

                        const decryptedBuffer = await decryptFile(
                            arrayBuffer,
                            aesKeyBytes,
                            new Uint8Array(receivedMetadata.iv)
                        );

                        onDataReceivedCallback({
                            decryptedBuffer,
                            metadata: receivedMetadata,
                        });

                        window.sessionPrivateKey = null;

                        // Signal to sender that the transfer is complete
                        dataChannel.send(JSON.stringify({ type: "transfer-complete" }));
                    }
                }
            };

            dataChannel.onerror = (error) =>
                console.error("DataChannel error:", error);
        };
    }
};

// Function to create and send an SDP offer
// This function is called by the sender after creating the DataChannel
const createAndSendOffer = async (peerUsername, username) => {
    if (!isStompConnected) {
        console.error("STOMP is not connected yet, retrying...");
        setTimeout(() => createAndSendOffer(peerUsername, username), 500);
        return;
    }
    // Create an SDP offer and set it as the local description
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        console.log("Waiting for ICE gathering to complete...");

        // Wait until ICE gathering is complete
        const waitForIceGathering = new Promise((resolve) => {
            if (peerConnection.iceGatheringState === "complete") {
                resolve();
            } else {
                const checkState = () => {
                    if (peerConnection.iceGatheringState === "complete") {
                        peerConnection.removeEventListener(
                            "icegatheringstatechange",
                            checkState
                        );
                        resolve();
                    }
                };
                peerConnection.addEventListener("icegatheringstatechange", checkState);
            }
        });

        // Wait for ICE gathering to complete
        await waitForIceGathering;

        console.log("Sending SDP Offer...");
        stompClient.publish({
            destination: "/app/signal",
            body: JSON.stringify({
                type: "offer",
                sdp: peerConnection.localDescription.sdp,
                from: username,
                to: peerUsername,
            }),
        });
    } catch (error) {
        console.error("🚨 Error creating or sending SDP Offer:", error);
    }
};

// function to send a file over the DataChannel
// This function encrypts the file using AES encryption
export const sendFile = async (file, recipientPublicKeyPem, onProgress, transferMethod = "CLIENT_TO_CLIENT") => {
    if (!dataChannel || dataChannel.readyState !== "open") {
        console.error("DataChannel is not open yet.");
        return;
    }

    const fileBuffer = await file.arrayBuffer();
    const aesKey = await generateAESKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await encryptFile(fileBuffer, aesKey, iv);
    const encryptedAESKey = await encryptAESKeyWithPublicKey(aesKey, recipientPublicKeyPem);

    console.log(`Sending file: ${file.name}`);

    const hashBuffer = await crypto.subtle.digest("SHA-256", encrypted);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    const metadata = {
        filename: file.name,
        iv: Array.from(iv),
        encryptedAESKey: Array.from(new Uint8Array(encryptedAESKey)),
        totalSize: encrypted.byteLength,
        sha256: hashArray,
    };
    dataChannel.send(JSON.stringify({ type: "metadata", metadata }));

    const encryptedUint8 = new Uint8Array(encrypted);
    const totalSize = encryptedUint8.byteLength;
    const chunkSize = 16384;
    let offset = 0;
    let chunkCounter = 0;

    // חישוב דינמי כמה צ'אנקים לדלג בין עדכונים, מ־50 עד 500 צ'אנקים
    const totalChunks = Math.ceil(totalSize / chunkSize);
    const updateFrequency = Math.max(50, Math.floor(totalChunks / 100));

    while (offset < totalSize) {
        const chunk = encryptedUint8.slice(offset, offset + chunkSize);
        dataChannel.send(chunk);
        offset += chunkSize;
        chunkCounter++;

        if (onProgress && chunkCounter % updateFrequency === 0) {
            const percent = Math.floor((offset / totalSize) * 100);
            onProgress(percent);
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
    }

    if (onProgress) onProgress(100);
    console.log("File sent successfully.");
};



export const closeWebRTCConnection = () => {
    try {
        if (dataChannel) {
            dataChannel.close();
            dataChannel = null;
        }
        if (peerConnection) {
            peerConnection.getSenders().forEach((sender) => {
                if (sender.track) sender.track.stop();
            });
            peerConnection.close();
            peerConnection = null;
        }
        if (stompClient && stompClient.connected) {
            stompClient.deactivate();
            stompClient = null;
        }
        receivedChunks = [];
        receivedMetadata = null;
        console.log("WebRTC connection and resources cleaned up.");
    } catch (err) {
        console.error("Error while closing WebRTC connection:", err);
    }
};
