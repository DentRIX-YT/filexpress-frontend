import React, { useState, useEffect } from "react";
import "../styles/ViewOldFilePage.css";
import TokenWrapper from "../utilities/TokenWrapper";
import { fetchUsernameFromToken } from "../utilities/UsernameUtil";
import { downloadEncryptedFileViaWebSocket } from "../utilities/WebSocketDownloadService";
import { decryptAndCachePrivateKey } from "../utilities/EncryptionUtilss";
import PassphraseModal from "./PassphraseModal";
import Navbar from "./Navbar";

const ViewOldFilePage = () => {
  const [logs, setLogs] = useState([]);
  const [direction, setDirection] = useState("all");
  const [viewMode, setViewMode] = useState("logs"); // NEW: "logs" or "files"
  const [statusMessage, setStatusMessage] = useState("Loading logs...");
  const [serverFiles, setServerFiles] = useState([]);
  const [showPassModal, setShowPassModal] = useState(false);
  const [selectedFileForDownload, setSelectedFileForDownload] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = sessionStorage.getItem("accessToken");
      const username = await fetchUsernameFromToken(token);

      if (!username || !token) return;

      if (viewMode === "logs") {
        try {
          const response = await fetch("http://localhost:8080/api/logs/query", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              username: username,
              direction: direction,
              limit: 100,
            }),
          });

          const rawText = await response.text();
          const data = JSON.parse(rawText);

          if (data.status === "success") {
            setLogs(data.logs);
            setStatusMessage("");
          } else {
            setStatusMessage("Failed to load logs.");
          }
        } catch (error) {
          console.error("Log fetch error:", error);
          setStatusMessage("An error occurred while fetching logs.");
        }
      } else if (viewMode === "files") {
        try {
          const response = await fetch(
            `http://localhost:8080/api/files/${username}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const rawText = await response.text();
          const files = JSON.parse(rawText);
          setServerFiles(files);
        } catch (error) {
          console.error("Failed to fetch server files:", error);
        }
      }
    };

    fetchData();
  }, [viewMode, direction]);

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (sizeInBytes) => {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} B`;
    } else if (sizeInBytes < 1024 ** 2) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    } else if (sizeInBytes < 1024 ** 3) {
      return `${(sizeInBytes / 1024 ** 2).toFixed(1)} MB`;
    } else {
      return `${(sizeInBytes / 1024 ** 3).toFixed(2)} GB`;
    }
  };

  const buttons = [
    { label: "Home", path: "/home" },
    { label: "Transfer Files", path: "/HandshakePage" },
  ];

  return (
    <TokenWrapper>
      <div className="view-files-page">
        <Navbar buttons={buttons} showUsername={true} />

        <div className="view-files-content">
          <h1>Transfer History</h1>

          {/* Toggle View Mode */}
          <div className="toggle-mode-buttons">
            <button
              className={viewMode === "logs" ? "active" : ""}
              onClick={() => setViewMode("logs")}
            >
              Logs
            </button>
            <button
              className={viewMode === "files" ? "active" : ""}
              onClick={() => setViewMode("files")}
            >
              Server Files
            </button>
          </div>

          {viewMode === "logs" && (
            <>
              <div className="filter-buttons">
                <button
                  className={direction === "all" ? "active" : ""}
                  onClick={() => setDirection("all")}
                >
                  All
                </button>
                <button
                  className={direction === "sent" ? "active" : ""}
                  onClick={() => setDirection("sent")}
                >
                  Sent
                </button>
                <button
                  className={direction === "received" ? "active" : ""}
                  onClick={() => setDirection("received")}
                >
                  Received
                </button>
              </div>

              {statusMessage && <p>{statusMessage}</p>}

              <ul className="log-list">
                {logs.map((log, index) => (
                  <li key={index}>
                    <strong>From:</strong> {log.senderUsername} &nbsp;
                    <strong>To:</strong> {log.receiverUsername} &nbsp;
                    <strong>File:</strong> {log.filename} &nbsp;
                    <strong>Method:</strong> {log.method}
                  </li>
                ))}
              </ul>
            </>
          )}

          {viewMode === "files" && (
            <>
              <h2>Server-Saved Files</h2>

              {downloadProgress !== null && (
                <div className="progress-bar-wrapper">
                  <div
                    className="progress-bar"
                    style={{ width: `${downloadProgress}%` }}
                  />
                  <p>Downloading: {downloadProgress}%</p>
                </div>
              )}

              <ul className="server-file-list">
                {serverFiles.length === 0 && <p>No saved files found.</p>}
                {serverFiles.map((file) => (
                  <li key={file.id} className="file-item">
                    <strong>{file.originalFilename}</strong> – Size: {formatFileSize(file.size)} – Uploaded at:{" "}
                    <span className="upload-time">
                      {formatDate(file.uploadedAt)}
                    </span>{" "}
                    &nbsp;
                    <button
                      onClick={() => {
                        setSelectedFileForDownload(file);
                        setShowPassModal(true);
                      }}
                    >
                      Download
                    </button>{" "}
                    &nbsp;
                    <button
                      onClick={async () => {
                        const token = sessionStorage.getItem("accessToken");
                        try {
                          const res = await fetch(
                            `http://localhost:8080/api/files/delete/${file.id}`,
                            {
                              method: "DELETE",
                              headers: {
                                Authorization: `Bearer ${token}`,
                              },
                            }
                          );

                          if (res.ok) {
                            setServerFiles((prev) =>
                              prev.filter((f) => f.id !== file.id)
                            );
                          } else {
                            console.error("Failed to delete file.");
                          }
                        } catch (err) {
                          console.error("Delete error:", err);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {downloadStatus && (
            <p className="download-status">{downloadStatus}</p>
          )}
          {showPassModal && (
            <PassphraseModal
              onClose={() => setShowPassModal(false)}
              onSubmit={async (passphrase, setError) => {
                try {
                  const accessToken = sessionStorage.getItem("accessToken");
                  const username = await fetchUsernameFromToken();

                  const res = await fetch(
                    `http://localhost:8080/api/private-key/${username}`,
                    {
                      method: "GET",
                      headers: {
                        Authorization: `Bearer ${accessToken}`,
                      },
                    }
                  );

                  if (!res.ok) {
                    setError("Failed to retrieve encrypted private key.");
                    return;
                  }

                  const data = await res.json();
                  const encryptedKey = data.encryptedPrivateKey;

                  const privateKey = await decryptAndCachePrivateKey(
                    encryptedKey,
                    passphrase
                  );
                  if (!privateKey) {
                    setError(
                      "Failed to decrypt private key. Please check your passphrase."
                    );
                    return;
                  }

                  if (!selectedFileForDownload?.id) {
                    setError("No file selected for download.");
                    return;
                  }

                  await downloadEncryptedFileViaWebSocket(
                    selectedFileForDownload,
                    privateKey,
                    (progress) => {
                      setDownloadProgress(progress);
                      if (progress === 100) {
                        setTimeout(() => setDownloadProgress(null), 1500);
                      }
                    },
                    setDownloadStatus
                  );

                  setShowPassModal(false);
                } catch (err) {
                  console.error(
                    "Error during passphrase verification or file download:",
                    err
                  );
                  setError("A network error occurred. Please try again.");
                }
              }}
            />
          )}
        </div>
      </div>
    </TokenWrapper>
  );
};

export default ViewOldFilePage;
