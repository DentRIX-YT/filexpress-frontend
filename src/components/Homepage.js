import React from "react";
import "../styles/HomePage.css";
import LogoutButton from "./LogoutButton";
import TokenWrapper from "../utilities/TokenWrapper";

const HomePage = () => {
  return (
    <TokenWrapper>
    <div className="home-page">
      <div className="home-content">
        <h1>Welcome to FileXpress</h1>
        <p>Effortlessly manage and transfer your files securely.</p>
        <LogoutButton />
      </div>
    </div>
    </TokenWrapper>
  );
};

export default HomePage;