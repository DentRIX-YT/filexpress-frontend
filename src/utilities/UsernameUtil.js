export const fetchUsernameFromToken = async () => {
    const accessToken = sessionStorage.getItem("accessToken");
  
    if (!accessToken) {
      throw new Error("Access token is missing");
    }
  
    const response = await fetch("http://localhost:8080/users/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  
    if (!response.ok) {
      throw new Error("Failed to fetch username: " + response.status);
    }
  
    const data = await response.json();
    return data.username;
  };
  