const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const mobileQuery = window.matchMedia('(max-width: 700px)');
const desktopCallQuery = window.matchMedia('(min-width: 1025px) and (hover: hover)');
const coarsePointerQuery = window.matchMedia('(pointer: coarse)');

function updateHeader() {
  header.classList.toggle('scrolled', window.scrollY > 24);
}

function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation menu');
  navLinks.classList.remove('open');
  document.body.classList.remove('menu-open');
}

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Open navigation menu' : 'Close navigation menu');
  navLinks.classList.toggle('open', !isOpen);
  document.body.classList.toggle('menu-open', !isOpen);
});

navLinks.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});

mobileQuery.addEventListener('change', closeMenu);
window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

const configuredPhone = String(window.RRPL_CONFIG.phone || '').trim();
const callLinks = document.querySelectorAll('[data-contact-call]');
function updateCallLinks() {
  const isDesktopMouse = desktopCallQuery.matches && !coarsePointerQuery.matches && navigator.maxTouchPoints === 0;
  const href = configuredPhone && !isDesktopMouse ? `tel:${configuredPhone}` : '#contact';
  callLinks.forEach((link) => { link.href = href; });
}
updateCallLinks();
window.addEventListener('resize', updateCallLinks);

const contactPanel = document.querySelector('.quote-contact-panel');
if (contactPanel) {
  const config = window.RRPL_CONFIG;
  const phoneLink = contactPanel.querySelector('[data-contact-phone]');
  const phoneLabel = contactPanel.querySelector('[data-contact-label]');
  const phoneNumber = contactPanel.querySelector('[data-contact-phone-number]');
  const phone = String(config.phone || '').trim();
  if (phone) {
    phoneNumber.textContent = phone;
    phoneLink.href = `tel:${phone}`;
    phoneLink.hidden = false;
    phoneLabel.hidden = false;
  }

  const whatsapp = String(config.whatsapp || '').replace(/\D/g, '');
  const whatsappLink = contactPanel.querySelector('[data-contact-whatsapp]');
  if (whatsapp) {
    const message = 'Hello Rapid Response Protocol, I would like to make an enquiry.';
    whatsappLink.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
    whatsappLink.hidden = false;
  }

  const socialLinks = [
    ['instagram', config.social?.instagram, 'data-contact-instagram'],
    ['tiktok', config.social?.tiktok, 'data-contact-tiktok'],
  ];
  socialLinks.forEach(([name, value, selector]) => {
    const link = contactPanel.querySelector(`[${selector}]`);
    const url = String(value || '').trim();
    if (!url) return;
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'https:') {
        console.warn(`The ${name} contact URL in js/config.js must use HTTPS.`);
        return;
      }
      link.href = parsedUrl.href;
      link.hidden = false;
    } catch (error) {
      console.error(`Invalid ${name} contact URL in js/config.js.`, error);
    }
  });

  const email = String(config.email || '').trim();
  const emailLink = contactPanel.querySelector('[data-contact-email]');
  if (email && !/[\r\n]/.test(email)) {
    emailLink.href = `mailto:${email}`;
    emailLink.hidden = false;
  }

  const socialRow = contactPanel.querySelector('[data-contact-social]');
  socialRow.hidden = !socialRow.querySelector('a:not([hidden])');
}

const revealItems = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

const counters = document.querySelectorAll('[data-count]');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function animateCounter(element) {
  const target = Number(element.dataset.count);
  if (prefersReducedMotion) {
    element.textContent = String(target);
    return;
  }
  const duration = 1100;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    element.textContent = String(Math.round(target * (1 - (1 - progress) ** 3)));
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
if ('IntersectionObserver' in window) {
  const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.65 });
  counters.forEach((counter) => counterObserver.observe(counter));
} else {
  counters.forEach(animateCounter);
}

const lightbox = document.querySelector('#fleet-lightbox');
const lightboxImage = lightbox.querySelector('img');
const lightboxCaption = lightbox.querySelector('p');
document.querySelectorAll('[data-lightbox]').forEach((card) => {
  card.addEventListener('click', () => {
    lightboxImage.src = card.dataset.lightbox;
    lightboxImage.alt = card.querySelector('img').alt;
    lightboxCaption.textContent = card.dataset.title;
    lightbox.showModal();
  });
});
lightbox.querySelector('.lightbox-close').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) lightbox.close();
});

const testimonialSlides = [
  { category: 'CLOSE PROTECTION', quote: 'Approved client feedback about close protection services will appear here.' },
  { category: 'EXECUTIVE LOGISTICS', quote: 'Approved client feedback about executive logistics will appear here.' },
  { category: 'EVENT SECURITY', quote: 'Approved client feedback about event security will appear here.' },
];
let activeTestimonial = 0;
const quoteText = document.querySelector('[data-quote]');
const quoteCategory = document.querySelector('[data-quote-category]');
const slideCurrent = document.querySelector('[data-slide-current]');
document.querySelectorAll('[data-slide]').forEach((button) => {
  button.addEventListener('click', () => {
    const direction = button.dataset.slide === 'next' ? 1 : -1;
    activeTestimonial = (activeTestimonial + direction + testimonialSlides.length) % testimonialSlides.length;
    quoteText.textContent = testimonialSlides[activeTestimonial].quote;
    quoteCategory.textContent = `PLACEHOLDER · ${testimonialSlides[activeTestimonial].category}`;
    slideCurrent.textContent = String(activeTestimonial + 1).padStart(2, '0');
  });
});
