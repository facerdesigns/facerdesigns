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


// --- UPGRADED AI Chatbot Logic ---
const chatbotToggle = document.getElementById('chatbot-toggle');
const chatbotWindow = document.getElementById('chatbot-window');
const closeChat = document.getElementById('close-chat');
const sendMessage = document.getElementById('send-message');
const userInput = document.getElementById('user-input');
const chatbotMessages = document.getElementById('chatbot-messages');

// [FIX] New, more intelligent introduction
const initialBotMessage = "Hello! For a quick response, click the WhatsApp button below or call Tendekayi at +263 774 132 972. Otherwise, let me know how I can help with your design, branding, or printing needs.";

function typeMessage(element, text) {
    let index = 0;
    element.textContent = '';
    const interval = setInterval(() => {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
        } else {
            clearInterval(interval);
        }
    }, 30);
}

window.addEventListener('load', () => {
    setTimeout(() => {
        if (chatbotWindow && chatbotWindow.style.display !== 'flex') {
            chatbotWindow.style.display = 'flex';
            const firstBotMessage = chatbotMessages.querySelector('.bot-message');
            if(firstBotMessage) {
                 typeMessage(firstBotMessage, initialBotMessage);
            }
        }
    }, 2500);
});

if (chatbotToggle) {
    chatbotToggle.addEventListener('click', () => {
        if (chatbotWindow) chatbotWindow.style.display = 'flex';
    });
}
if (closeChat) {
    closeChat.addEventListener('click', () => {
        if (chatbotWindow) chatbotWindow.style.display = 'none';
    });
}
if (sendMessage) {
    sendMessage.addEventListener('click', () => {
        const message = userInput.value.trim();
        if (message) {
            addMessage(message, 'user-message');
            userInput.value = '';
            getBotResponse(message);
        }
    });
}
if (userInput) {
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage.click();
        }
    });
}

function addMessage(text, className) {
    if (!chatbotMessages) return;
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', className);
    messageElement.textContent = text;
    chatbotMessages.appendChild(messageElement);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function getBotResponse(userMessage) {
    const msg = userMessage.toLowerCase();
    let botReply = "That's a great question. For the most accurate information, please send a detailed email to facerdesigns@gmail.com, and we'll get back to you within 24 hours.";

    if (/\b(hello|hi|hey)\b/.test(msg)) {
        botReply = "Hello again! How can I assist you with your project?";
    }
    else if (/\b(services?|help|offer|do)\b/.test(msg)) {
        botReply = "We offer a full range of design and print services, including: Corporate Branding, Strategic Print Management, Signage, and Promotional Gifts. Are you interested in a specific service?";
    }
    else if (/\b(branding|logo|business card)\b/.test(msg)) {
        botReply = "Our corporate branding service is very popular! We can create a cohesive brand package for you, including logos, business cards, and letterheads. Would you like a quote?";
    }
    else if (/\b(print|printing|brochure|flyer|report)\b/.test(msg)) {
        botReply = "Our strategic print management ensures top-quality reproductions for projects like flyers, brochures, and annual reports. What kind of project are you planning?";
    }
    else if (/\b(price|quote|cost|how much)\b/.test(msg)) {
        botReply = "We provide a free, detailed quote for every project within 24 hours. The best way to get started is to email your project specs to facerdesigns@gmail.com. Can I help with anything else?";
    }
    else if (/\b(contact|phone|email|number)\b/.test(msg)) {
        botReply = "You can reach Tendekayi directly at +263 774 132 972 or email facerdesigns@gmail.com. We're based in Harare.";
    }
    else if (/\b(thanks|thank you|ok|bye)\b/.test(msg)) {
        botReply = "You're welcome! Feel free to ask if anything else comes up. Have a great day!";
    }

    setTimeout(() => {
        const botMessageElement = document.createElement('div');
        botMessageElement.classList.add('message', 'bot-message');
        chatbotMessages.appendChild(botMessageElement);
        typeMessage(botMessageElement, botReply);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }, 600);
}
