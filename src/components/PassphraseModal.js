import React, { useState } from "react";
import "../styles/PassphraseModal.css";

const PassphraseModal = ({ onClose, onSubmit }) => {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (passphrase.length < 8) {
      setError("Passphrase must be at least 8 characters.");
      return;
    }

    setError("");
    setIsLoading(true);
    try {
      await onSubmit(passphrase, setError);
    } catch (e) {
      console.error("Passphrase submit failed:", e);
      setError("Unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2>Enter Your Passphrase</h2>
        <input
          type="password"
          placeholder="Passphrase"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          disabled={isLoading}
        />
        {error && <p className="error-text">{error}</p>}
        <div className="modal-buttons">
          <button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Verifying..." : "Confirm"}
          </button>
          <button onClick={onClose} className="cancel" disabled={isLoading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PassphraseModal;