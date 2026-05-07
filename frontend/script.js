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
