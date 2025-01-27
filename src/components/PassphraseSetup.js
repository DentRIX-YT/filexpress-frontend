import React, { useState } from "react";

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
        <div className="passphrase-setup">
            <h2>Setup Your Passphrase</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <input
                        type="password"
                        placeholder="Enter Passphrase"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <input
                        type="password"
                        placeholder="Confirm Passphrase"
                        value={confirmPassphrase}
                        onChange={(e) => setConfirmPassphrase(e.target.value)}
                    />
                </div>
                {error && <p className="error-message">{error}</p>}
                <button type="submit" className="submit-button">
                    Save Passphrase
                </button>
            </form>
        </div>
    );
};

export default PassphraseSetup;