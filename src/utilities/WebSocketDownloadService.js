import { decryptAESKeyWithPrivateKey, decryptFile } from "./EncryptionUtilss";

export const downloadEncryptedFileViaWebSocket = async (
    fileMeta,
    decryptedPrivateKey,
    onProgress,
    setDownloadStatus
) => {
    const { id: fileID, originalFilename: filename } = fileMeta;

    const socket = new WebSocket("ws://localhost:8080/file-download");
    socket.binaryType = "arraybuffer";

    let encryptedAESKey = null;
    let iv = null;
    let totalSize = 0;
    let fileChunks = [];
    let received = 0;

    socket.onopen = () => {
        if (!fileID) {
            console.error("fileID is missing or undefined");
            return;
        }

        socket.send(JSON.stringify({ type: "downloadRequest", fileID }));
    };

    socket.onmessage = async (event) => {
        if (typeof event.data === "string") {
            const msg = JSON.parse(event.data);

            if (msg.type === "downloadMetadata") {
                encryptedAESKey = msg.metadata.encryptedAESKey;
                iv = Uint8Array.from(atob(msg.metadata.iv), (c) => c.charCodeAt(0));
                totalSize = msg.metadata.totalSize;
            } else if (msg.type === "EOF") {
                try {
                    const encryptedBuffer = new Blob(fileChunks);
                    const arrayBuffer = await encryptedBuffer.arrayBuffer();

                    if (!encryptedAESKey) {
                        console.error("Encrypted AES key is missing from metadata.");
                        socket.close();
                        return;
                    }

                    const encryptedKeyBuffer = Uint8Array.from(
                        atob(encryptedAESKey),
                        (c) => c.charCodeAt(0)
                    );

                    const rawAESKey = await decryptAESKeyWithPrivateKey(
                        encryptedKeyBuffer,
                        decryptedPrivateKey
                    );

                    const decryptedFileBuffer = await decryptFile(
                        arrayBuffer,
                        rawAESKey,
                        iv
                    );

                    const blob = new Blob([decryptedFileBuffer]);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(url);

                    if (setDownloadStatus) {
                        setDownloadStatus(`"${filename}" downloaded successfully.`);
                        setTimeout(() => setDownloadStatus(""), 5000);
                    }
                } catch (err) {
                    console.error("Download decryption failed:", err);
                    if (setDownloadStatus) {
                        setDownloadStatus("Download failed due to decryption error.");
                    }
                } finally {
                    socket.close();
                }
            }
        } else {
            fileChunks.push(event.data);
            received += event.data.byteLength;

            if (onProgress && totalSize > 0) {
                const percent = Math.floor((received / totalSize) * 100);
                onProgress(percent);

                if (percent === 100) {
                    setTimeout(() => onProgress(null), 1000);
                }
            }
        }
    };

    socket.onerror = (err) => {
        console.error("WebSocket download error:", err);
        if (setDownloadStatus) {
            setDownloadStatus("WebSocket error occurred during download.");
        }
    };
};
