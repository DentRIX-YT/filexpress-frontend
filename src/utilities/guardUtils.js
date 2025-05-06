export const validateHandshakeFromServer = async (senderUsername, receiverUsername) => {
    try {
        const response = await fetch(
            `http://localhost:8080/handshake/is-valid?senderUsername=${senderUsername}&receiverUsername=${receiverUsername}`
        );

        if (!response.ok) return false;

        const isValid = await response.json();
        return isValid === true;
    } catch (error) {
        console.error("Failed to validate handshake from server:", error);
        return false;
    }
};
