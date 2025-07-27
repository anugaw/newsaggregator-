document
  .getElementById("signupForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const email = document.getElementById("signupEmail").value;
    const birthdate = document.getElementById("birthdate").value;
    const password = document.getElementById("signupPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Get selected preferences
    const preferenceSelect = document.getElementById("newsPreferences");
    const preferences = Array.from(preferenceSelect.selectedOptions).map(
      (opt) => opt.value
    );

    if (password !== confirmPassword) {
      alert("Passwords do not match. Please try again.");
      return;
    }

    // Store user data
    const newUser = {
      firstName,
      lastName,
      username: `${firstName} ${lastName}`,
      email,
      birthdate,
      password,
      preferences,
    };

    const storedUsers = JSON.parse(localStorage.getItem("users")) || [];

    // Check if email already exists
    if (storedUsers.some((user) => user.email === email)) {
      alert("An account with this email already exists. Please log in.");
      return;
    }

    storedUsers.push(newUser);
    localStorage.setItem("users", JSON.stringify(storedUsers));

    alert("Signed up successfully! You can now log in.");
    window.location.href = `login.html?email=${encodeURIComponent(email)}`;
  });
