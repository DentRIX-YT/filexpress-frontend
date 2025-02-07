import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LoginPage.css";
import PassphraseSetup from "./PassphraseSetup";

const LoginPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);

  const [isNewUser, setIsNewUser] = useState(false);

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpUsername, setSignUpUsername] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpDOB, setSignUpDOB] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:8080/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to log in");
      }
      const data = await response.json();
      sessionStorage.setItem("accessToken", data.accessToken);
      sessionStorage.setItem("refreshToken", data.refreshToken);
      sessionStorage.setItem("userRole", data.roles);
      sessionStorage.setItem("data.privateKeyExists", data.privateKeyExists);

      if (data.privateKeyExists === false) {
        setIsNewUser(true);
        sessionStorage.setItem("isNewUser", isNewUser); // Backend should provide this info
      } else {
        // Clear the login input fields
        setLoginUsername("");
        setLoginPassword("");

        navigate("/home");
      }
    } catch (err) {
      setError("Login failed. Please check your username and password.");
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        email: signUpEmail,
        username: signUpUsername,
        password: signUpPassword,
        dateOfBirth: signUpDOB,
        roles: ["ROLE_USER"], // Default role for new users
      };

      const response = await fetch("http://localhost:8080/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to sign up");
      }

      const data = await response.json();
      sessionStorage.setItem("accessToken", data.accessToken);
      sessionStorage.setItem("refreshToken", data.refreshToken);
      sessionStorage.setItem("userRole", data.roles);

      // Clear the signup input fields
      setSignUpEmail("");
      setSignUpUsername("");
      setSignUpPassword("");
      setSignUpDOB("");

      setIsSignUp(false);
    } catch (err) {
      setError("Sign up failed. Please try again.");
    }
  };

  const encryptPrivateKey = async (privateKeyBase64, passphrase) => {
    try {
      // Encode the passphrase
      const encoder = new TextEncoder();
      const passphraseKey = encoder.encode(passphrase);

      // Generate a random salt
      const salt = window.crypto.getRandomValues(new Uint8Array(16));

      // Derive AES key using PBKDF2
      const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        passphraseKey,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
      );

      const aesKey = await window.crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: 100000,
          hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
      );

      // Generate a random IV (Initialization Vector)
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Encrypt the private key
      const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        encoder.encode(privateKeyBase64)
      );

      // Convert all parts to Base64 for storage
      const encryptedBase64 = btoa(
        String.fromCharCode(...new Uint8Array(encrypted))
      );
      const ivBase64 = btoa(String.fromCharCode(...iv));
      const saltBase64 = btoa(String.fromCharCode(...salt));

      return `${saltBase64}:${ivBase64}:${encryptedBase64}`; // Format: salt:iv:encryptedData
    } catch (error) {
      console.error("Encryption error:", error);
      return null;
    }
  };

  const handlePassphraseSubmit = async (passphrase) => {
    try {
      // 1. Generate RSA Key Pair
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
      );

      // 2. Export Keys
      const publicKey = await window.crypto.subtle.exportKey(
        "spki",
        keyPair.publicKey
      );
      const privateKey = await window.crypto.subtle.exportKey(
        "pkcs8",
        keyPair.privateKey
      );

      // 3. Convert to Base64 Strings
      const publicKeyBase64 = btoa(
        String.fromCharCode(...new Uint8Array(publicKey))
      );
      const privateKeyBase64 = btoa(
        String.fromCharCode(...new Uint8Array(privateKey))
      );

      // 4. Encrypt the Private Key with the Passphrase (Fixed AES-GCM)
      const encryptedKey = await encryptPrivateKey(
        privateKeyBase64,
        passphrase
      );

      // 5. Save Public Key to Backend
      await fetch("http://localhost:8080/api/public-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername,
          publicKeyValue: publicKeyBase64,
        }),
      });

      // 6. Save Encrypted Private Key to Backend
      await fetch("http://localhost:8080/api/private-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername,
          encryptedPrivateKey: encryptedKey, // Now includes salt, IV, and encrypted data
        }),
      });

      // 7. Mark User as Not New and Navigate to Home
      setIsNewUser(false);
      navigate("/home");
    } catch (error) {
      console.error("Error generating or saving keys:", error);
      alert("An error occurred while setting up your keys. Please try again.");
    }
  };

  return (
    <div>
      {isNewUser ? (
        <PassphraseSetup onPassphraseSubmit={handlePassphraseSubmit} />
      ) : (
        <div className="login-page">
          <div className={`login-content ${isSignUp ? "sign-up-mode" : ""}`}>
            <div className="form-container login-form">
              <div className="logo-container">
                <img
                  src="/logo-no-background.png"
                  alt="FileXpress Logo"
                  className="login-logo"
                />
              </div>
              <h2>Welcome Back</h2>
              {error && !isSignUp && <p style={{ color: "red" }}>{error}</p>}
              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <input
                    type="password"
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
                <button type="submit" className="login-button">
                  Login
                </button>
                <p>
                  Don't have an account?{" "}
                  <span
                    className="toggle-link"
                    onClick={() => {
                      setError(null);
                      setIsSignUp(true);
                    }}
                  >
                    Sign Up
                  </span>
                </p>
              </form>
            </div>
            {isSignUp && (
              <div className="signup-form">
                <div className="large-logo-container">
                  <img
                    src="/logo-no-background.png"
                    alt="FileXpress Logo"
                    className="large-logo"
                  />
                </div>
                <h2>Create Account</h2>
                {error && isSignUp && <p style={{ color: "red" }}>{error}</p>}
                <form onSubmit={handleSignUp}>
                  <div className="form-group">
                    <input
                      type="email"
                      placeholder="Email"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      placeholder="Username"
                      value={signUpUsername}
                      onChange={(e) => setSignUpUsername(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="password"
                      placeholder="Password"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="date"
                      placeholder="Date of Birth"
                      value={signUpDOB}
                      onChange={(e) => setSignUpDOB(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="login-button">
                    Sign Up
                  </button>
                  <p>
                    Already have an account?{" "}
                    <span
                      className="toggle-link"
                      onClick={() => {
                        setError(null);
                        setIsSignUp(false);
                      }}
                    >
                      Login
                    </span>
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
