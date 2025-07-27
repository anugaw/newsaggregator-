document
  .getElementById("loginForm")
  .addEventListener("submit", async function (event) {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const storedUsers = JSON.parse(localStorage.getItem("users")) || [];
      const user = storedUsers.find(
        (u) => u.email === email && u.password === password
      );

      if (user) {
        // Store only necessary user data
        const userData = {
          username: user.username,
          firstName: user.firstName,
          email: user.email,
          preferences: user.preferences
        };
        localStorage.setItem("loggedInUser", JSON.stringify(userData));
        
        // Redirect to index page
        window.location.href = "index.html";
      } else {
        alert("Invalid email or password. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Login failed. Please try again.");
    }
  });

// Check for email parameter in URL
const urlParams = new URLSearchParams(window.location.search);
const email = urlParams.get("email");
if (email) {
  document.getElementById("email").value = decodeURIComponent(email);
}
