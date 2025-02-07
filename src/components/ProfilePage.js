import React, { useEffect, useState } from "react";
import "../styles/ProfilePage.css";
import TokenWrapper from "../utilities/TokenWrapper";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

const ProfilePage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("Loading...");
    const [email, setEmail] = useState("Loading...");

    useEffect(() => {
        const fetchUsernameAndEmail = async () => {
            const accessToken = sessionStorage.getItem("accessToken");
            if (!accessToken) {
                console.error("Access token is missing. Redirecting to login.");
                navigate("/login");
                return;
            }

            try {
                const response = await fetch("http://localhost:8080/users/me", {
                    method: "GET",
                    headers: { Authorization: `Bearer ${accessToken}` },
                });

                if (response.ok) {
                    const data = await response.json();
                    setUsername(data.username);
                    setEmail(data.email);
                } else {
                    console.error("Failed to fetch username and email. Redirecting to login.");
                    navigate("/login");
                }
            } catch (error) {
                console.error("Error while fetching username and email:", error);
                navigate("/login");
            }
        };

        const timer = setTimeout(() => {
            fetchUsernameAndEmail();
        }, 100);

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <TokenWrapper>
            <div className="profile-page">
                {/* Use Navbar Component with Logout Button in Profile Page */}
                <Navbar
                    buttons={[
                        { label: "Transfer Files", path: "/HandshakePage" },
                        { label: "View Old Files", path: "/view-old-files" },
                    ]}
                    showUsername={false} // No username displayed in the profile navbar
                />

                <div className="profile-container">
                    <h1 className="profile-title">Profile</h1>
                    <div className="profile-card">
                        <img
                            src="/profile_pic_template.jpg"
                            alt="Profile Avatar"
                            className="profile-avatar"
                        />
                        <p>
                            <strong>Username:</strong> {username}
                        </p>
                        <p>
                            <strong>Email:</strong> {email}
                        </p>
                    </div>
                </div>
            </div>
        </TokenWrapper>
    );
};

export default ProfilePage;