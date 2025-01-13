import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LoginPage.css";

const LoginPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);

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

      // Clear the login input fields
      setLoginUsername("");
      setLoginPassword("");

      navigate("/home");
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
      navigate("/home");
    } catch (err) {
      setError("Sign up failed. Please try again.");
    }
  };

  return (
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
  );
};

export default LoginPage;