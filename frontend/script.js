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

// Event carousel (center card clickable, sides visible but dim)
const eventCards = Array.from(document.querySelectorAll(".event-card"));
const eventPrev = document.querySelector(".event-prev");
const eventNext = document.querySelector(".event-next");
let eventIndex = 1;

function updateEvents() {
  if (!eventCards.length) return;
  eventCards.forEach((card, idx) => {
    card.classList.toggle("active", idx === eventIndex);
    if (idx === eventIndex) {
      card.setAttribute("tabindex", "0");
    } else {
      card.setAttribute("tabindex", "-1");
    }
  });
}

function nextEvent() {
  eventIndex = (eventIndex + 1) % eventCards.length;
  updateEvents();
}

function prevEvent() {
  eventIndex = (eventIndex - 1 + eventCards.length) % eventCards.length;
  updateEvents();
}

if (eventCards.length) {
  updateEvents();
  let eventTimer = setInterval(nextEvent, 6000);

  const resetEventTimer = () => {
    clearInterval(eventTimer);
    eventTimer = setInterval(nextEvent, 6000);
  };

  if (eventNext) {
    eventNext.addEventListener("click", () => {
      nextEvent();
      resetEventTimer();
    });
  }

  if (eventPrev) {
    eventPrev.addEventListener("click", () => {
      prevEvent();
      resetEventTimer();
    });
  }
}

// Auth modals
const signinModal = document.getElementById("signin-modal");
const recoveryModal = document.getElementById("recovery-modal");
const signInBtn = document.getElementById("btn-signin");
const forgotPasswordBtn = document.getElementById("forgot-password-btn");

function openModal(modal) {
  if (!modal) return;
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
}

if (signInBtn && signinModal) {
  signInBtn.addEventListener("click", () => openModal(signinModal));
}

if (signinModal) {
  signinModal.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.matches("[data-close-modal]")) {
      closeModal(signinModal);
    }
  });
}

if (recoveryModal) {
  recoveryModal.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.matches("[data-close-modal]")) {
      closeModal(recoveryModal);
    }
  });
}

if (forgotPasswordBtn && signinModal && recoveryModal) {
  forgotPasswordBtn.addEventListener("click", () => {
    closeModal(signinModal);
    openModal(recoveryModal);
  });
}

// API Base URL - use backend server URL
const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '/api';

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

// Sign in form handler - connect to backend API
const signinForm = document.getElementById("signin-form");
if (signinForm) {
  signinForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(signinForm);
    const payload = {
      username: formData.get("username"),
      password: formData.get("password")
    };

    const submitButton = signinForm.querySelector('button[type="submit"]');
    const originalText = submitButton ? submitButton.textContent : "Sign In";
    
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Signing in...";
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Store token based on role
        if (data.role === 'admin') {
          localStorage.setItem('adminToken', data.token);
          closeModal(signinModal);
          window.location.href = 'admin-dashboard.html';
        } else if (data.role === 'student') {
          localStorage.setItem('studentToken', data.token);
          closeModal(signinModal);
          window.location.href = 'student-portal.html';
        } else {
          alert(data.message || "Login successful!");
          closeModal(signinModal);
        }
      } else {
        alert(data.error || "Invalid username or password.");
      }
    } catch (err) {
      console.error("Login error:", err);
      console.error("Error details:", err.message, err.stack);
      alert(`Network error: ${err.message}. Please try again later.`);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });
}

// Password recovery form handler - connect to backend API
const recoveryForm = document.getElementById("recovery-form");
if (recoveryForm) {
  recoveryForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(recoveryForm);
    const payload = {
      "recovery-id": formData.get("recovery-id")
    };

    const submitButton = recoveryForm.querySelector('button[type="submit"]');
    const originalText = submitButton ? submitButton.textContent : "Request Reset";
    
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Processing...";
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/recovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert(data.message || "Password reset request received. The department will verify and send new credentials.");
        closeModal(recoveryModal);
        recoveryForm.reset();
      } else {
        alert(data.error || "Failed to process request. Please try again.");
      }
    } catch (err) {
      console.error("Recovery error:", err);
      console.error("Error details:", err.message, err.stack);
      alert(`Network error: ${err.message}. Please try again later.`);
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
