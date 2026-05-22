import { fetchAnalysis } from './api.js';
import { showLoading, showError, parseResponseString, renderAnalysis, renderQuestions, renderGeneral, renderUserMessage, clearChat } from './ui.js';

let accumulatedQuery = "";
let questionCount = 0;
let recognition = null;
let isListening = false;
let els = {};

export function initChat(elements) {
    els = elements;
    initVoiceRecognition();
}

export function handleSendMessage(message) {
    if (!message) return;

    renderUserMessage(message);

    if (questionCount === 0) {
        // First query
        accumulatedQuery = message;
        sendQueryToBackend(accumulatedQuery);
    } else {
        // Follow-up answer
        accumulatedQuery += ". " + message;
        questionCount++;
        sendQueryToBackend(accumulatedQuery);
    }
}

async function sendQueryToBackend(queryText) {
    showLoading(true);

    try {
        let queryToSend = queryText;
        // Force final analysis if questionCount >= 2
        if (questionCount >= 2) {
            queryToSend = queryText + ". fatigue body pain"; // dummy string to trigger final condition if needed by backend logic
        }

        const data = await fetchAnalysis(queryToSend);
        const aiResponseText = data.response || data.result || "";

        const parsed = parseResponseString(aiResponseText);
        showLoading(false);

        if (parsed.type === 'question' && questionCount < 2) {
            renderQuestions(parsed.questions || []);
            questionCount++;
        } else if (parsed.type === 'general') {
            renderGeneral(parsed);
        } else {
            renderAnalysis(parsed);
            // Reset for a new conversation implicitly if needed, or keep history
            // questionCount = 0; // Uncomment if we want to reset after diagnosis
        }
    } catch (error) {
        console.error('Request failed:', error);
        showError(`Could not get analysis. Ensure backend is running.`);
        showLoading(false);
    }
}

// ─────────────────────────────────────────────
// VOICE INPUT (SPEECH-TO-TEXT)
// ─────────────────────────────────────────────
function initVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN'; 

        recognition.onstart = () => {
            isListening = true;
            els.voiceBtn.classList.add('listening');
            els.chatInput.placeholder = 'Listening... Speak now.';
        };

        recognition.onend = () => {
            isListening = false;
            els.voiceBtn.classList.remove('listening');
            els.chatInput.placeholder = 'Message MediSense AI...';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const currentVal = els.chatInput.value.trim();
            els.chatInput.value = currentVal ? `${currentVal} ${transcript}` : transcript;
            
            // Auto-resize textarea
            els.chatInput.style.height = 'auto';
            els.chatInput.style.height = (els.chatInput.scrollHeight) + 'px';
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            els.voiceBtn.classList.remove('listening');
            if (event.error !== 'no-speech') {
                showError(`Speech recognition failed: ${event.error}`);
            }
        };

        els.voiceBtn.addEventListener('click', () => {
            if (isListening) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });
    } else {
        els.voiceBtn.disabled = true;
        els.voiceBtn.title = 'Speech recognition is not supported in this browser.';
    }
}
