API_BASE_URL = window.location.origin + "/api";
// Mobile nav toggle
const navToggle = document.querySelector(".nav-toggle");
const mainNav = document.querySelector(".main-nav");

if (navToggle && mainNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });
}

// Hero slider
const heroSlides = Array.from(document.querySelectorAll(".hero-slide"));
const heroPrev = document.querySelector(".hero-prev");
const heroNext = document.querySelector(".hero-next");
const heroDotsContainer = document.querySelector(".hero-dots");
let heroIndex = 0;

function renderHeroDots() {
  if (!heroDotsContainer || heroSlides.length <= 1) return;
  heroDotsContainer.innerHTML = "";
  heroSlides.forEach((_, idx) => {
    const dot = document.createElement("button");
    dot.className = "hero-dot" + (idx === heroIndex ? " active" : "");
    dot.type = "button";
    dot.addEventListener("click", () => {
      heroIndex = idx;
      updateHeroSlides();
    });
    heroDotsContainer.appendChild(dot);
  });
}

function updateHeroSlides() {
  heroSlides.forEach((slide, idx) => {
    slide.classList.toggle("active", idx === heroIndex);
  });
  renderHeroDots();
}

function nextHero() {
  heroIndex = (heroIndex + 1) % heroSlides.length;
  updateHeroSlides();
}

function prevHero() {
  heroIndex = (heroIndex - 1 + heroSlides.length) % heroSlides.length;
  updateHeroSlides();
}

if (heroSlides.length) {
  updateHeroSlides();
  let heroTimer = setInterval(nextHero, 6000);

  const resetTimer = () => {
    clearInterval(heroTimer);
    heroTimer = setInterval(nextHero, 6000);
  };

  if (heroNext) {
    heroNext.addEventListener("click", () => {
      nextHero();
      resetTimer();
    });
  }

  if (heroPrev) {
    heroPrev.addEventListener("click", () => {
      prevHero();
      resetTimer();
    });
  }
}

// Notification Hero (like hero slider)
const notificationSlides = Array.from(document.querySelectorAll(".notification-slide"));
const notificationPrev = document.querySelector(".notification-prev");
const notificationNext = document.querySelector(".notification-next");
let notificationIndex = 0;

function updateNotifications() {
  if (!notificationSlides.length) return;
  notificationSlides.forEach((slide, idx) => {
    slide.classList.toggle("active", idx === notificationIndex);
  });
}

function nextNotification() {
  notificationIndex = (notificationIndex + 1) % notificationSlides.length;
  updateNotifications();
}

function prevNotification() {
  notificationIndex = (notificationIndex - 1 + notificationSlides.length) % notificationSlides.length;
  updateNotifications();
}

if (notificationSlides.length) {
  updateNotifications();
  let notificationTimer = setInterval(nextNotification, 5000); // Auto-change every 5 seconds

  const resetNotificationTimer = () => {
    clearInterval(notificationTimer);
    notificationTimer = setInterval(nextNotification, 5000);
  };

  if (notificationNext) {
    notificationNext.addEventListener("click", () => {
      nextNotification();
      resetNotificationTimer();
    });
  }

  if (notificationPrev) {
    notificationPrev.addEventListener("click", () => {
      prevNotification();
      resetNotificationTimer();
    });
  }
}

// Loader
const loader = document.getElementById("loader");
if (loader) {
  window.addEventListener("load", () => {
    setTimeout(() => {
      loader.classList.add("hidden");
      setTimeout(() => {
        loader.style.display = "none";
      }, 400);
    }, 1200); // Show loader for 1.2 seconds (shorter time)
  });
}

// Animations on scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px"
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("animated", "fade-in-up");
    }
  });
}, observerOptions);

document.querySelectorAll(".animate-on-scroll").forEach(el => {
  observer.observe(el);
});

// Auth modals
const signupModal = document.getElementById("signup-modal");
const signinModal = document.getElementById("signin-modal");
const registerBtn = document.getElementById("btn-register");
const switchToSignin = document.getElementById("switch-to-signin");
const switchToSignup = document.getElementById("switch-to-signup");

function openModal(modal) {
  if (!modal) return;
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

// Register button opens signup modal
if (registerBtn && signupModal) {
  registerBtn.addEventListener("click", () => openModal(signupModal));
}

// Switch between signup and signin
if (switchToSignin && signupModal && signinModal) {
  switchToSignin.addEventListener("click", () => {
    closeModal(signupModal);
    openModal(signinModal);
  });
}

if (switchToSignup && signupModal && signinModal) {
  switchToSignup.addEventListener("click", () => {
    closeModal(signinModal);
    openModal(signupModal);
  });
}

// Close modals on backdrop/close click
[signupModal, signinModal].forEach(modal => {
  if (modal) {
    modal.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.matches("[data-close-modal]") || target.classList.contains("modal-backdrop")) {
        closeModal(modal);
      }
    });
  }
});

// Sign Up Form Handler
const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const formData = new FormData(signupForm);
    const payload = {
      fullName: formData.get("fullName"),
      cnic: formData.get("cnic"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword")
    };

    const submitButton = signupForm.querySelector('button[type="submit"]');
    const originalText = submitButton ? submitButton.textContent : "Register Now";
    
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Registering...";
    }

    try {
      const res = await fetch(`${API_BASE_URL}/student/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message || "Registration successful! Please sign in.");
        closeModal(signupModal);
        openModal(signinModal);
        signupForm.reset();
      } else {
        alert(data.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      console.error("Signup error:", err);
      alert("Network error. Please check your connection and try again.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });
}

// Sign In Form Handler (Handles both Student and Admin login)
const signinForm = document.getElementById("signin-form");
if (signinForm) {
  signinForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const formData = new FormData(signinForm);
    const userValue = formData.get("cnic");
    const passwordValue = formData.get("password");

    const submitButton = signinForm.querySelector('button[type="submit"]');
    const originalText = submitButton ? submitButton.textContent : "Sign In";
    
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Signing in...";
    }

    try {
      // Check if it's admin login (username is "admin")
      let apiUrl, payload;
      if (userValue === "admin" || userValue.toLowerCase() === "admin") {
        apiUrl = `${API_BASE_URL}/admin/login`;
        payload = { username: userValue, password: passwordValue };
      } else {
        apiUrl = `${API_BASE_URL}/student/login`;
        payload = { cnic: userValue, password: passwordValue };
      }

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.token) {
        if (userValue === "admin" || userValue.toLowerCase() === "admin") {
          localStorage.setItem("adminToken", data.token);
          alert("Admin login successful!");
          closeModal(signinModal);
          window.location.href = "admin-dashboard.html";
        } else {
          localStorage.setItem("studentToken", data.token);
          localStorage.setItem("studentData", JSON.stringify(data.student));
          alert("Login successful!");
          closeModal(signinModal);
          window.location.href = "student-portal.html";
        }
      } else {
        alert(data.message || "Login failed. Please check your credentials.");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Network error. Please check your connection and try again.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });
}


// Contact form handler - connect to backend API
const contactForm = document.getElementById("contact-form");
if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(contactForm);
    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message")
    };

    const submitButton = contactForm.querySelector('button[type="submit"]');
    const originalText = submitButton ? submitButton.textContent : "Submit";
    
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    try {
      const res = await fetch(`${API_BASE_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert(data.message || "Thank you for contacting us! We will get back to you soon.");
        contactForm.reset();
      } else {
        alert(data.error || "Failed to send message. Please try again.");
      }
    } catch (err) {
      console.error("Contact form error:", err);
      console.error("Error details:", err.message, err.stack);
      alert(`Network error: ${err.message}. Please check your connection and try again.`);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });
}


// Footer year
const yearSpan = document.getElementById("year");
if (yearSpan) {
  yearSpan.textContent = String(new Date().getFullYear());
}
