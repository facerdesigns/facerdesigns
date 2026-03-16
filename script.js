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


// --- REDESIGNED AI CHATBOT LOGIC ---
if (document.getElementById('chatbot-container')) {
    const chatbotElements = {
        toggle: document.getElementById('chatbot-toggle'),
        window: document.getElementById('chatbot-window'),
        close: document.getElementById('close-chat'),
        sendMessage: document.getElementById('send-message'),
        userInput: document.getElementById('user-input'),
        messages: document.getElementById('chatbot-messages'),
        quickReplies: document.getElementById('chatbot-quick-replies')
    };

    const conversationTopics = {
        main: {
            text: "Hello! For a quick response, please call Tendekayi at +263 774 132 972 or click the green WhatsApp icon below. Alternatively, feel free to type a question in the box.",
            replies: []
        },
        "See Services": {
            text: "Tendekayi offers a full range of design and print services, including: Corporate Branding, Strategic Print Management, Signage, and Promotional Gifts. Which service interests you most?",
            replies: ["Branding", "Printing", "Signage", "Back to Main Menu"]
        },
        "Request a Quote": {
            text: "The best way to get a fast, accurate quote is to send your project details directly to Tendekayi. You can email facerdesigns@gmail.com or use the WhatsApp button on the bottom right.",
            replies: ["Contact Details", "Back to Main Menu"]
        },
        "Ask a Question": {
            text: "Of course. What would you like to know?",
            replies: [] // Free text input
        },
        "Branding": {
            text: "The corporate branding service is very popular! Tendekayi can create a cohesive brand package for you, including logos, business cards, and letterheads.",
            replies: ["Request a Quote", "See Services", "Back to Main Menu"]
        },
        "Printing": {
            text: "Tendekayi's strategic print management ensures top-quality reproductions for projects like flyers, brochures, and annual reports. What kind of project are you planning?",
            replies: ["Request a Quote", "Back to Main Menu"]
        },
        "Signage": {
            text: "From storefronts to vehicle wraps, Tendekayi provides complete design and installation of high-impact signage.",
            replies: ["Request a Quote", "Back to Main Menu"]
        },
        "Contact Details": {
            text: "You can reach Tendekayi directly at +263 774 132 972 or email facerdesigns@gmail.com. The studio is based in Harare.",
            replies: ["See Services", "Back to Main Menu"]
        },
        "Back to Main Menu": "main"
    };

    const addMessage = (text, type) => {
        if (!chatbotElements.messages) return;
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${type}-message`);
        messageElement.textContent = text;
        chatbotElements.messages.appendChild(messageElement);
        chatbotElements.messages.scrollTop = chatbotElements.messages.scrollHeight;
    };

    const showTypingIndicator = () => {
        if (!chatbotElements.messages) return;
        const typingElement = document.createElement('div');
        typingElement.classList.add('message', 'bot-message', 'bot-thinking');
        typingElement.innerHTML = '<span></span><span></span><span></span>';
        chatbotElements.messages.appendChild(typingElement);
        chatbotElements.messages.scrollTop = chatbotElements.messages.scrollHeight;
        return typingElement;
    };

    const handleUserInteraction = (topicKey) => {
        const topic = conversationTopics[topicKey];

        if (typeof topic === 'string') {
            handleUserInteraction(topic);
            return;
        }

        const typingIndicator = showTypingIndicator();

        setTimeout(() => {
            if(typingIndicator) typingIndicator.remove();
            if(topic.text) addMessage(topic.text, 'bot');
            renderQuickReplies(topic.replies);
        }, 800);
    };

    const renderQuickReplies = (replies) => {
        if (!chatbotElements.quickReplies) return;
        chatbotElements.quickReplies.innerHTML = '';
        if (!replies || replies.length === 0) {
            chatbotElements.userInput.focus();
            return;
        }
        replies.forEach(reply => {
            const button = document.createElement('button');
            button.classList.add('quick-reply');
            button.textContent = reply;
            button.onclick = () => {
                addMessage(reply, 'user');
                handleUserInteraction(reply);
            };
            chatbotElements.quickReplies.appendChild(button);
        });
    };

    const handleTextInput = () => {
        const message = chatbotElements.userInput.value.trim();
        if (message) {
            addMessage(message, 'user');
            chatbotElements.userInput.value = '';
            chatbotElements.quickReplies.innerHTML = '';
            
            const typingIndicator = showTypingIndicator();

            setTimeout(() => {
                if(typingIndicator) typingIndicator.remove();
                let botReply = "Thanks for your message! For a detailed response, please email Tendekayi at facerdesigns@gmail.com or use the WhatsApp button. This ensures he gets all the details to help you effectively.";
                
                if (/\b(quote|price|cost)\b/i.test(message)) {
                    botReply = "It sounds like you're ready for a quote! The best way is to email your project specs to facerdesigns@gmail.com for a detailed estimate within 24 hours.";
                } else if (/\b(contact|phone|number|email)\b/i.test(message)) {
                    botReply = "You can reach Tendekayi at +263 774 132 972 or email facerdesigns@gmail.com. The studio is based in Harare.";
                }

                addMessage(botReply, 'bot');
                renderQuickReplies(["See Services", "Contact Details", "Back to Main Menu"]);
            }, 1200);
        }
    };

    // Event Listeners
    if (chatbotElements.toggle) {
        chatbotElements.toggle.addEventListener('click', () => {
            if (chatbotElements.window) chatbotElements.window.style.display = 'flex';
            chatbotElements.toggle.style.display = 'none';
        });
    }

    if (chatbotElements.close) {
        chatbotElements.close.addEventListener('click', () => {
            if (chatbotElements.window) chatbotElements.window.style.display = 'none';
            if (chatbotElements.toggle) chatbotElements.toggle.style.display = 'flex';
        });
    }

    if (chatbotElements.sendMessage) {
        chatbotElements.sendMessage.addEventListener('click', handleTextInput);
    }

    if (chatbotElements.userInput) {
        chatbotElements.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleTextInput();
        });
    }

    // Initial state
    window.addEventListener('load', () => {.
        setTimeout(() => {
            // Automatically open the chatbot window for new visitors
            if (chatbotElements.window.style.display !== 'flex') {
                chatbotElements.window.style.display = 'flex';
                if (chatbotElements.toggle) chatbotElements.toggle.style.display = 'none';
            }

            if(chatbotElements.messages.children.length === 0) {
                handleUserInteraction('main');
            }
        }, 2500);
    });
}
