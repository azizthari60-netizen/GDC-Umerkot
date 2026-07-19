const API_BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api';

const navToggle = document.querySelector('.nav-toggle');
const mainNav = document.querySelector('.main-nav');

if (navToggle && mainNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
}

const currentPath = window.location.pathname.split('/').pop() || 'index.html';
const navLinks = document.querySelectorAll('.main-nav a');
navLinks.forEach(link => {
  const href = link.getAttribute('href');
  if (href === currentPath || (href === 'index.html' && currentPath === '')) {
    link.classList.add('active');
  }
  link.addEventListener('click', () => {
    if (mainNav && mainNav.classList.contains('open')) {
      mainNav.classList.remove('open');
      navToggle?.setAttribute('aria-expanded', 'false');
    }
  });
});

const heroSlides = Array.from(document.querySelectorAll('.hero-slide'));
const heroPrev = document.querySelector('.hero-prev');
const heroNext = document.querySelector('.hero-next');
const heroDotsContainer = document.querySelector('.hero-dots');
let heroIndex = 0;

function renderHeroDots() {
  if (!heroDotsContainer || heroSlides.length <= 1) return;
  heroDotsContainer.innerHTML = '';
  heroSlides.forEach((_, idx) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'hero-dot' + (idx === heroIndex ? ' active' : '');
    dot.addEventListener('click', () => {
      heroIndex = idx;
      updateHeroSlides();
    });
    heroDotsContainer.appendChild(dot);
  });
}

// hero section
function updateHeroSlides() {
  heroSlides.forEach((slide, idx) => {
    slide.classList.toggle('active', idx === heroIndex);
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
  let heroTimer = setInterval(nextHero, 5500);

  const resetHeroTimer = () => {
    clearInterval(heroTimer);
    heroTimer = setInterval(nextHero, 5500);
  };

  heroNext?.addEventListener('click', () => {
    nextHero();
    resetHeroTimer();
  });

  heroPrev?.addEventListener('click', () => {
    prevHero();
    resetHeroTimer();
  });
}

    // loader
const loader = document.getElementById('loader');
if (loader) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      loader.classList.add('hidden');
      setTimeout(() => {
        loader.style.display = 'none';
      }, 400);
    }, 900);
  });
}

// animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animated', 'fade-in-up');
    }
  });
}, observerOptions);

document.querySelectorAll('.animate-on-scroll').forEach(el => {
  observer.observe(el);
});

const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(contactForm);
    const payload = {
      name: formData.get('name'),
      email: formData.get('email'),
      subject: formData.get('subject'),
      message: formData.get('message')
    };

    const submitButton = contactForm.querySelector('button[type="submit"]');
    const originalText = submitButton ? submitButton.textContent : 'Submit';

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Sending...';
    }

    try {
      const res = await fetch(`${API_BASE_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || 'Thank you for contacting us.');
        contactForm.reset();
      } else {
        alert(data.error || 'Unable to send message. Please try again.');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      alert('Network error. Please check your connection and try again.');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });
}

// footer year
const yearSpan = document.getElementById('year');
if (yearSpan) {
  yearSpan.textContent = `${new Date().getFullYear()}`;
}

// Mobile Services Carousel
function initServicesCarousel() {
  const servicesGrid = document.querySelector('.services-grid');
  if (!servicesGrid) return;

  // Check if we're on mobile
  function isMobile() {
    return window.innerWidth <= 768;
  }

  if (isMobile()) {
    // Add carousel controls
    const container = servicesGrid.closest('.quick-services');
    if (container && !container.querySelector('.carousel-controls')) {
      const controls = document.createElement('div');
      controls.className = 'carousel-controls';
      controls.innerHTML = `
        <button class="carousel-prev" onclick="scrollServicesLeft()">&#10094;</button>
        <button class="carousel-next" onclick="scrollServicesRight()">&#10095;</button>
      `;
      container.appendChild(controls);
    }
  }
}

function scrollServicesLeft() {
  const servicesGrid = document.querySelector('.services-grid');
  if (servicesGrid) {
    servicesGrid.scrollBy({ left: -300, behavior: 'smooth' });
  }
}

function scrollServicesRight() {
  const servicesGrid = document.querySelector('.services-grid');
  if (servicesGrid) {
    servicesGrid.scrollBy({ left: 300, behavior: 'smooth' });
  }
}

// Initialize carousel on page load
window.addEventListener('load', initServicesCarousel);
window.addEventListener('resize', initServicesCarousel);

// Gallery Lightbox Functionality
const galleryImages = [
  'Public/gal1.jpg',
  'Public/gal2.jpg',
  'Public/gal3.jpg',
  'Public/test1.jpg',
  'Public/test2.jpg',
  'Public/test3.jpg',
  'Public/test4.jpg',
  'Public/test5.jpg',
  'Public/test6.jpg',
  'Public/hero1.jpg',
  'Public/hero2.jpg',
  'Public/hero3.jpg',
  'Public/hero4.jpg',
  'Public/seminar.1.jpg'
];

let currentImageIndex = 0;

function openLightbox(index) {
  currentImageIndex = index;
  const lightboxOverlay = document.getElementById('lightboxOverlay');
  const lightboxImg = document.getElementById('lightboxImg');
  
  lightboxImg.src = galleryImages[currentImageIndex];
  lightboxOverlay.style.display = 'flex';
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
  
  // Add keyboard event listeners
  document.addEventListener('keydown', handleKeyPress);
}

function closeLightbox() {
  const lightboxOverlay = document.getElementById('lightboxOverlay');
  lightboxOverlay.style.display = 'none';
  document.body.style.overflow = 'auto'; // Restore scrolling
  
  // Remove keyboard event listeners
  document.removeEventListener('keydown', handleKeyPress);
}

function changeImage(direction) {
  currentImageIndex += direction;
  
  if (currentImageIndex < 0) {
    currentImageIndex = galleryImages.length - 1;
  } else if (currentImageIndex >= galleryImages.length) {
    currentImageIndex = 0;
  }
  
  const lightboxImg = document.getElementById('lightboxImg');
  lightboxImg.src = galleryImages[currentImageIndex];
}

function handleKeyPress(event) {
  if (event.key === 'ArrowLeft') {
    changeImage(-1);
  } else if (event.key === 'ArrowRight') {
    changeImage(1);
  } else if (event.key === 'Escape') {
    closeLightbox();
  }
}

// Close lightbox when clicking on overlay (but not on image)
document.getElementById('lightboxOverlay').addEventListener('click', function(event) {
  if (event.target === this) {
    closeLightbox();
  }
});

// // log in btn
const applyButtons = document.querySelector('#btn-register');
{applyButtons.addEventListener('click', () => openModal(signupModal))
};


// Auth modals
const signupModal = document.getElementById("signup-modal");
const signinModal = document.getElementById("signin-modal");
const recoveryModal = document.getElementById('recovery-modal');
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
[signupModal, signinModal, recoveryModal].forEach(modal => {
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
      const res = await fetch(`/api/student/signup`, {
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
        apiUrl = `/api/admin/login`;
        payload = { username: userValue, password: passwordValue };
      } else {
        apiUrl = `/api/student/login`;
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
          closeModal(signinModal);
          window.location.href = "admin-dashboard.html";
        } else {
          localStorage.setItem("studentToken", data.token);
          localStorage.setItem("studentData", JSON.stringify(data.student));
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

// Password toggle functionality
const togglePasswordBtn = document.getElementById('toggle-password');
const signinPasswordInput = document.getElementById('signin-password');

if (togglePasswordBtn && signinPasswordInput) {
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = signinPasswordInput.type === 'password';
    signinPasswordInput.type = isPassword ? 'text' : 'password';
    
    // Toggle eye icons
    const eyeOpen = togglePasswordBtn.querySelector('.eye-open');
    const eyeClosed = togglePasswordBtn.querySelector('.eye-closed');
    
    if (eyeOpen && eyeClosed) {
      if (isPassword) {
        eyeOpen.style.display = 'none';
        eyeClosed.style.display = 'block';
        togglePasswordBtn.setAttribute('aria-label', 'Hide password');
      } else {
        eyeOpen.style.display = 'block';
        eyeClosed.style.display = 'none';
        togglePasswordBtn.setAttribute('aria-label', 'Show password');
      }
    }
  });
}

// Forgot Password button - open recovery modal
const forgotPasswordBtn = document.getElementById('forgot-password-btn');

if (forgotPasswordBtn && recoveryModal && signinModal) {
  forgotPasswordBtn.addEventListener('click', () => {
    closeModal(signinModal);
    openModal(recoveryModal);
  });
}

// Password Recovery Form Handler (Updated for CNIC & New Password)
const recoveryForm = document.getElementById('recovery-form');
if (recoveryForm) {
  recoveryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(recoveryForm);
    const recoveryId = formData.get('recovery-id'); // یہ CNIC نمبر ہے
    const newPassword = formData.get('new-password'); // یہ HTML میں شامل کی گئی نئی فیلڈ ہے
    
    const submitButton = recoveryForm.querySelector('button[type="submit"]');
    const originalText = submitButton ? submitButton.textContent : 'Update Password';
    
    // سیکیورٹی چیک: اگر اسٹوڈنٹ نے پاس ورڈ نہیں لکھا
    if (!newPassword) {
      alert('Please enter a new password to proceed.');
      return;
    }
    
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Updating...'; // ٹیکسٹ تبدیل کر دیا تاکہ اسٹوڈنٹ کو پتہ چلے کام ہو رہا ہے
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/student/recovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // یہاں ہم اب دو چیزیں بھیج رہے ہیں: CNIC اور نیا پاس ورڈ
        body: JSON.stringify({ 
          'recovery-id': recoveryId,
          'new-password': newPassword 
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // کامیابی کا میسج
        alert(data.message || 'Password updated successfully. You can now log in.');
        recoveryForm.reset();
        if (typeof closeModal === 'function') {
          closeModal(recoveryModal);
        }
      } else {
        // سرور سے آنے والا ایرر (مثلاً اگر CNIC غلط ہو)
        alert(data.message || 'Failed to update password. Please try again.');
      }
    } catch (err) {
      console.error('Recovery form error:', err);
      alert('Network error. Please check your internet connection.');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });
}

