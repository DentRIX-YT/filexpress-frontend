import {
    generateAESKey,
    encryptFile,
    encryptAESKeyWithPublicKey,
} from "./EncryptionUtilss";

export const sendFileViaWebSocket = async (
    file,
    senderUsername,
    receiverUsername,
    recipientPublicKeyPem,
    onProgress,
    onComplete
) => {
    try {
        const aesKey = await generateAESKey();
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const fileBuffer = await file.arrayBuffer();
        const encryptedFile = await encryptFile(fileBuffer, aesKey, iv);
        const encryptedAESKey = await encryptAESKeyWithPublicKey(aesKey, recipientPublicKeyPem);

        const hashBuffer = await crypto.subtle.digest("SHA-256", encryptedFile);
        const hashArray = Array.from(new Uint8Array(hashBuffer));

        const metadata = {
            type: "metadata",
            metadata: {
                sender: senderUsername,
                receiver: receiverUsername,
                filename: file.name,
                iv: btoa(String.fromCharCode(...iv)),
                encryptedAESKey: btoa(String.fromCharCode(...new Uint8Array(encryptedAESKey))),
                sha256: JSON.stringify(hashArray),
                totalSize: encryptedFile.byteLength,
            },
        };

        const socket = new WebSocket("ws://localhost:8080/file-upload");
        socket.binaryType = "arraybuffer";

        socket.onopen = () => {
            console.log("WebSocket connection to server opened.");
            socket.send(JSON.stringify(metadata));
        };

        socket.onmessage = (event) => {
            if (event.data === "ACK_METADATA") {
                console.log("Received ACK_METADATA, starting file upload.");
                sendChunks(socket, encryptedFile, onProgress, onComplete);
            }
        };

        socket.onerror = (err) => {
            console.error("WebSocket error:", err);
        };

        socket.onclose = () => {
            console.log("WebSocket connection closed.");
        };
    } catch (err) {
        console.error("Failed to send file via WebSocket:", err);
    }
};

function sendChunks(socket, encryptedFile, onProgress, onComplete) {
    const chunkSize = 16384;
    const totalSize = encryptedFile.byteLength;
    const encryptedUint8 = new Uint8Array(encryptedFile);
    let offset = 0;
    let chunkCounter = 0;
    const totalChunks = Math.ceil(totalSize / chunkSize);
    const updateFrequency = Math.max(50, Math.floor(totalChunks / 100));

    const sendChunk = () => {
        if (offset < totalSize) {
            // const chunk = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // Hello
            // socket.send(chunk);
            const chunk = encryptedUint8.slice(offset, offset + chunkSize);
            const buffer = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
            socket.send(buffer); 
            offset += chunkSize;
            chunkCounter++;

            if (onProgress && chunkCounter % updateFrequency === 0) {
                const percent = Math.floor((offset / totalSize) * 100);
                onProgress(percent);
            }

            setTimeout(sendChunk, 0);
        } else {
            setTimeout(() => {
                socket.send(JSON.stringify({ type: "EOF" }));
                console.log("EOF sent");
                if (onProgress) onProgress(100);
                if (onComplete) onComplete();
            }, 200);
        }
    };

    sendChunk();
}