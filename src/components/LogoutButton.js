import React from 'react';
import { useNavigate } from 'react-router-dom';

const LogoutButton = () => {
    const navigate = useNavigate();

    // Handles the logout process
    const handleLogout = async () => {
        const accessToken = sessionStorage.getItem('accessToken');
        
        // Clear all session storage (tokens, roles, etc.)
        sessionStorage.clear();

        try {
            // Optional: Notify backend to invalidate the access token
            if (accessToken) {
                await fetch('http://localhost:8080/logout', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
            }
        } catch (error) {
            // Log error if the logout API call fails
            console.error('Failed to log out:', error);
        }

        // Redirect user to the login page
        navigate('/');
    };

    return (
        <button onClick={handleLogout} className="logout-button">
            Logout
        </button>
    );
};

export default LogoutButton;
