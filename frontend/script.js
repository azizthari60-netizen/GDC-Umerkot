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

const notificationSlides = Array.from(document.querySelectorAll('.notification-slide'));
const notificationPrev = document.querySelector('.notification-prev');
const notificationNext = document.querySelector('.notification-next');
let notificationIndex = 0;

function updateNotifications() {
  if (!notificationSlides.length) return;
  notificationSlides.forEach((slide, idx) => {
    const isActive = idx === notificationIndex;
    slide.classList.toggle('active', isActive);
    slide.style.display = isActive ? 'block' : 'none';
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
  let notificationTimer = setInterval(nextNotification, 6000);

  const resetNotificationTimer = () => {
    clearInterval(notificationTimer);
    notificationTimer = setInterval(nextNotification, 6000);
  };

  notificationNext?.addEventListener('click', () => {
    nextNotification();
    resetNotificationTimer();
  });

  notificationPrev?.addEventListener('click', () => {
    prevNotification();
    resetNotificationTimer();
  });
}

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

const yearSpan = document.getElementById('year');
if (yearSpan) {
  yearSpan.textContent = `${new Date().getFullYear()}`;
}

const applyButtons = document.querySelectorAll('#btn-register, #announcement-apply-now-btn');
applyButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    window.location.href = 'apply-2k26.html';
  });
});
