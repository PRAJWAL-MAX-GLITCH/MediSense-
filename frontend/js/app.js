import { initUI } from './ui.js';
import { initChat, handleSendMessage } from './chat.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Grab all required DOM elements
    const elements = {
        chatMain: document.getElementById('chat-main'),
        chatBubblesList: document.getElementById('chat-bubbles-list'),
        typingIndicator: document.getElementById('typing-indicator'),
        errorBanner: document.getElementById('error-banner'),
        errorMessage: document.getElementById('error-message'),
        
        chatInput: document.getElementById('chat-input'),
        voiceBtn: document.getElementById('voice-btn'),
        sendBtn: document.getElementById('send-btn')
    };

    // 2. Initialize UI and Chat modules
    initUI(elements);
    initChat(elements);

    // 3. Attach Event Listeners
    
    // Auto-resize textarea
    elements.chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        // Enable/disable send button based on input
        if (this.value.trim().length > 0) {
            elements.sendBtn.classList.add('active'); // Optional: Add some CSS for active state
        } else {
            elements.sendBtn.classList.remove('active');
        }
    });

    // Send Message Event
    const submitMessage = () => {
        const message = elements.chatInput.value.trim();
        if (message) {
            handleSendMessage(message);
        }
    };

    elements.sendBtn.addEventListener('click', submitMessage);

    elements.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent new line
            submitMessage();
        }
    });
});
