import React, { useState } from "react";
import "../styles/PassphraseSetup.css";

const PassphraseSetup = ({ onPassphraseSubmit }) => {
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (passphrase !== confirmPassphrase) {
      setError("Passphrases do not match.");
      return;
    }
    if (passphrase.length < 8) {
      setError("Passphrase must be at least 8 characters long.");
      return;
    }

    setError("");
    onPassphraseSubmit(passphrase);
  };

  return (
    <div className="passphrase-page">
      <div className="passphrase-box">
        <img
          src="/logo-no-background.png"
          alt="Passphrase Logo"
          className="passphrase-logo"
        />
        <h2 className="passphrase-title">Set Up Your Passphrase</h2>
        <form onSubmit={handleSubmit} className="passphrase-form">
          <div className="passphrase-group">
            <input
              type="password"
              className="passphrase-input"
              placeholder="Enter Passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
            />
          </div>
          <div className="passphrase-group">
            <input
              type="password"
              className="passphrase-input"
              placeholder="Confirm Passphrase"
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
            />
          </div>

          {error && <p className="passphrase-error">{error}</p>}

          <button type="submit" className="passphrase-button">
            Save Passphrase
          </button>
        </form>
      </div>
    </div>
  );
};

export default PassphraseSetup;