// frontend/public/js/profile.js

document.addEventListener("DOMContentLoaded", () => {
    fetchProfile();
    const profileForm = document.getElementById("profile-form");
    if (profileForm) {
        profileForm.addEventListener("submit", updateProfile);
    }
});

function fetchProfile() {
    fetch("/profile", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert("Error: " + data.error);
        } else {
            populateProfileForm(data);
        }
    })
    .catch(err => console.error("Error fetching profile:", err));
}

function populateProfileForm(data) {
    // Employee fields
    if (data.role === "employee") {
        if (document.getElementById("first_name"))
            document.getElementById("first_name").value = data.first_name || "";
        if (document.getElementById("last_name"))
            document.getElementById("last_name").value = data.last_name || "";
    }
    // Employer fields
    else if (data.role === "employer") {
        if (document.getElementById("company_name"))
            document.getElementById("company_name").value = data.company_name || "";
        if (document.getElementById("contact_name"))
            document.getElementById("contact_name").value = data.contact_name || "";
        if (document.getElementById("address"))
            document.getElementById("address").value = data.address || "";
    }
    if (document.getElementById("birthdate"))
        document.getElementById("birthdate").value = data.birthdate || "";
    if (document.getElementById("phone"))
        document.getElementById("phone").value = data.phone || "";
    if (document.getElementById("email"))
        document.getElementById("email").value = data.email || "";
}

function updateProfile(event) {
    event.preventDefault();

    const payload = {};

    // Employee profile fields
    if (document.getElementById("first_name")) {
        payload.first_name = document.getElementById("first_name").value.trim();
    }
    if (document.getElementById("last_name")) {
        payload.last_name = document.getElementById("last_name").value.trim();
    }
    // Employer profile fields
    if (document.getElementById("company_name")) {
        payload.company_name = document.getElementById("company_name").value.trim();
    }
    if (document.getElementById("contact_name")) {
        payload.contact_name = document.getElementById("contact_name").value.trim();
    }
    if (document.getElementById("address")) {
        payload.address = document.getElementById("address").value.trim();
    }
    
    // Common fields
    payload.birthdate = document.getElementById("birthdate").value.trim();
    payload.phone = document.getElementById("phone").value.trim();

    fetch("/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.message) {
            alert(data.message);
        } else {
            alert("Error: " + data.error);
        }
    })
    .catch(err => console.error("Error updating profile:", err));
}
