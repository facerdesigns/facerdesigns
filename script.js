// --- Navigation Bar Scroll Effect ---
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// --- Navigation Bar Scroll Effect ---
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// --- Lightbox Functionality ---
const modal = document.getElementById('lightbox-modal');
const modalImg = document.getElementById('lightbox-img');
const galleryItems = document.querySelectorAll('.gallery-item');
const closeModalBtn = document.querySelector('.lightbox-close');

let lastFocusedElement;

const focusableElementsString = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]';

function trapFocus(e) {
    if (!modal || modal.style.display === 'none') return;
    const focusableElements = Array.from(modal.querySelectorAll(focusableElementsString));
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }
}

function openModal(item) {
    lastFocusedElement = document.activeElement;
    if (modal) modal.style.display = 'block';
    if (modalImg) modalImg.src = item.querySelector('img').src;
    
    // Set focus on the close button after a short delay
    setTimeout(() => {
        const focusableElements = Array.from(modal.querySelectorAll(focusableElementsString));
        if(focusableElements.length > 0) focusableElements[0].focus();
    }, 100);

    document.addEventListener('keydown', trapFocus);
    document.addEventListener('keydown', handleEscape);
}

function closeModal() {
    if (modal) modal.style.display = 'none';
    if (lastFocusedElement) {
        lastFocusedElement.focus();
    }
    document.removeEventListener('keydown', trapFocus);
    document.removeEventListener('keydown', handleEscape);
}

function handleEscape(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
}

galleryItems.forEach(item => {
    item.addEventListener('click', () => openModal(item));
    item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal(item);
        }
    });
    item.setAttribute('tabindex', '0');
});

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
}

window.addEventListener('click', (e) => {
    if (e.target == modal) {
        closeModal();
    }
});


