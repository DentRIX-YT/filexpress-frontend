import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/LogoutButton.css';

const LogoutButton = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        const accessToken = sessionStorage.getItem('accessToken');
        sessionStorage.clear(); // Clear session storage

        try {
            // Call the logout API to invalidate the token
            if (accessToken) {
                await fetch('http://localhost:8080/logout', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
            }
        } catch (error) {
            console.error('Failed to log out:', error);
        }

        // Redirect to login page
        navigate('/');
    };

    return (
        <button onClick={handleLogout} className="logout-button">
            Logout
        </button>
    );
};

export default LogoutButton;