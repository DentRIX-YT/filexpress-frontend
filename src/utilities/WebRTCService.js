// WebRTCService.js
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

let peerConnection;
let dataChannel;
let stompClient;
let onDataChannelOpen = () => { };
let onDataReceivedCallback = () => { };
let isStompConnected = false; // Track STOMP connection status

export const startWebRTC = (role, username, peerUsername, onDataReceived) => {
    onDataReceivedCallback = onDataReceived;

    console.log(`🔗 WebRTC Role: ${role}, Peer: ${peerUsername}`);

    const socket = new SockJS("http://localhost:8080/webrtc-signaling");
    stompClient = new Client({
        webSocketFactory: () => socket,
        debug: (msg) => console.log("STOMP Debug:", msg),
        reconnectDelay: 5000,
    });

    stompClient.onConnect = () => {
        console.log("✅ Connected to WebSocket signaling server.");
        isStompConnected = true;

        stompClient.subscribe("/topic/signaling", (message) => {
            const data = JSON.parse(message.body);
            console.log("📩 Received signaling message:", data);
            // Debug: output the intended recipient and local username
            console.log(`Received message with "to": "${data.to}"; Local username: "${username}"`);

            if (data.type === "offer") {
                // Check if the offer message is intended for the current user
                if (data.to !== username) {
                    console.log("Offer message not for me, ignoring.");
                    return;
                }
                console.log("📡 Applying SDP offer...");
                peerConnection
                    .setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: data.sdp }))
                    .then(() => peerConnection.createAnswer())
                    .then((answer) => {
                        peerConnection.setLocalDescription(answer);
                        stompClient.publish({
                            destination: "/app/signal",
                            body: JSON.stringify({
                                type: "answer",
                                sdp: answer.sdp,
                                from: username,   // current user sending the answer
                                to: data.from,    // original sender of the offer
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
                    console.log("Remote description already set, ignoring duplicate answer.");
                    return;
                }
                console.log("📡 Applying SDP answer...");
                peerConnection.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: data.sdp }));
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

const initializePeerConnection = (role, peerUsername, username) => {
    const config = {
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" }, // Public STUN server
            {
                urls: "turn:turnserver.metered.ca:80",  // Free TURN server
                username: "open",
                credential: "open",
            },
        ],
    };

    peerConnection = new RTCPeerConnection(config);

    // Log ICE candidates for debugging
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log("New ICE candidate:", event.candidate);
            // Optionally send candidate via signaling if your implementation requires it.
        } else {
            console.log("All ICE candidates have been sent.");
        }
    };

    // Monitor ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", peerConnection.iceConnectionState);
    };

    if (role === "sender") {
        console.log("📡 Sender: Creating DataChannel...");
        dataChannel = peerConnection.createDataChannel("fileTransfer");

        dataChannel.onopen = () => {
            console.log("✅ Sender: DataChannel Opened!");
            onDataChannelOpen();
        };

        dataChannel.onerror = (error) => console.error("DataChannel error:", error);

        createAndSendOffer(peerUsername, username);
    } else if (role === "receiver") {
        console.log("🎧 Receiver: Waiting for DataChannel...");
        peerConnection.ondatachannel = (event) => {
            dataChannel = event.channel;

            dataChannel.onopen = () => {
                console.log("✅ Receiver: DataChannel Opened!");
            };

            dataChannel.onmessage = (event) => {
                console.log("📩 Receiver: Received DataChunk!");
                onDataReceivedCallback(event.data);
            };

            dataChannel.onerror = (error) => console.error("DataChannel error:", error);
        };
    }
};

const createAndSendOffer = (peerUsername, username) => {
    if (!isStompConnected) {
        console.error("❌ STOMP is not connected yet, retrying...");
        setTimeout(() => createAndSendOffer(peerUsername, username), 500);
        return;
    }

    peerConnection
        .createOffer()
        .then((offer) => {
            peerConnection.setLocalDescription(offer);
            console.log("📡 Sending SDP Offer...");
            stompClient.publish({
                destination: "/app/signal",
                body: JSON.stringify({
                    type: "offer",
                    sdp: offer.sdp,
                    from: username,
                    to: peerUsername,
                }),
            });
        })
        .catch((error) => console.error("🚨 Error creating SDP Offer:", error));
};

export const sendFile = (file) => {
    if (!dataChannel || dataChannel.readyState !== "open") {
        console.error("❌ DataChannel is not open yet.");
        return;
    }

    console.log(`📤 Sending file: ${file.name}`);

    const chunkSize = 16384; // 16 KB per chunk
    let offset = 0;

    const reader = new FileReader();
    reader.onload = (event) => {
        const fileBuffer = event.target.result;
        const totalChunks = Math.ceil(fileBuffer.byteLength / chunkSize);
        console.log(`📦 Splitting file into ${totalChunks} chunks`);

        while (offset < fileBuffer.byteLength) {
            const chunk = fileBuffer.slice(offset, offset + chunkSize);
            dataChannel.send(chunk);
            offset += chunkSize;
        }
        console.log("✅ File sent successfully.");
    };

    reader.readAsArrayBuffer(file);
};