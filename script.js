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
const closeModal = document.querySelector('.lightbox-close');

galleryItems.forEach(item => {
    item.addEventListener('click', () => {
        if(modal) modal.style.display = 'block';
        if(modalImg) modalImg.src = item.querySelector('img').src;
    });
});

if(closeModal) {
    closeModal.addEventListener('click', () => {
        if(modal) modal.style.display = 'none';
    });
}

window.addEventListener('click', (e) => {
    if (e.target == modal) {
        if(modal) modal.style.display = 'none';
    }
});


