// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Formspree handles the form submission automatically
// No custom JavaScript needed - form will submit to Formspree

// Add scroll effect to navbar
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.1)';
    } else {
        navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
    }
});

/* Chatbot Functionality */
document.addEventListener('DOMContentLoaded', function() {
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotWindow = document.getElementById('chatbot-window');
    const closeChat = document.getElementById('close-chat');
    const userInput = document.getElementById('user-input');
    const sendMessageBtn = document.getElementById('send-message');
    const chatbotMessages = document.getElementById('chatbot-messages');

    // Open Chat
    chatbotToggle.addEventListener('click', () => {
        chatbotWindow.style.display = 'flex';
        chatbotToggle.style.display = 'none';
        userInput.focus();
    });

    // Close Chat
    closeChat.addEventListener('click', () => {
        chatbotWindow.style.display = 'none';
        chatbotToggle.style.display = 'flex';
    });

    // Send Message
    function handleSendMessage() {
        const text = userInput.value.trim();
        if (text) {
            addMessage(text, 'user');
            userInput.value = '';
            
            // Simulate bot thinking/typing
            setTimeout(() => {
                const response = getBotResponse(text);
                addMessage(response, 'bot');
            }, 500);
        }
    }

    sendMessageBtn.addEventListener('click', handleSendMessage);

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });

    // Add Message to Chat
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        messageDiv.classList.add(sender === 'user' ? 'user-message' : 'bot-message');
        messageDiv.textContent = text;
        
        chatbotMessages.appendChild(messageDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    // Bot Logic (Simple Rule-Based)
    function getBotResponse(input) {
        const lowerInput = input.toLowerCase();

        // Greeting
        if (lowerInput.match(/\b(hi|hello|hey|greetings|morning|afternoon|evening)\b/)) {
            return "Hello! Welcome to Facer Designs. How can I help you bring your ideas to life today?";
        }

        // Services
        if (lowerInput.match(/\b(service|design|print|logo|flyer|banner|card|branding)\b/)) {
            return "We offer a wide range of services including graphic design, corporate branding, large format printing (banners, billboards), and promotional gifts. Is there a specific project you have in mind?";
        }

        // Pricing / Quote
        if (lowerInput.match(/\b(price|cost|quote|much|rate)\b/)) {
            return "Our pricing depends on the specific requirements of your project (size, quantity, material). You can get a free, no-obligation quote by filling out the contact form below or calling us at 0774 132 972.";
        }

        // Contact
        if (lowerInput.match(/\b(contact|phone|email|call|reach)\b/)) {
            return "You can reach us at 0774 132 972 or email facerdesigns@gmail.com. We also have a contact form at the bottom of this page!";
        }

        // Location
        if (lowerInput.match(/\b(location|where|address|located)\b/)) {
            return "We are based in Harare, Zimbabwe. We serve clients throughout the city and surrounding areas.";
        }

        // Portfolio / Work
        if (lowerInput.match(/\b(portfolio|work|example|gallery|picture)\b/)) {
            return "You can check out our Portfolio section on this page to see examples of our recent work, including branding, signage, and print materials.";
        }
        
        // Thank you
        if (lowerInput.match(/\b(thanks|thank you|cool|great|ok|okay)\b/)) {
            return "You're welcome! Feel free to ask if you need anything else.";
        }

        // Default
        return "I'm not sure I understand. I can help with design services, printing quotes, or contact information. Or you can call us directly at 0774 132 972.";
    }
});
