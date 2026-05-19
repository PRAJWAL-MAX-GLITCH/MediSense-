document.addEventListener('DOMContentLoaded', () => {
    const symptomInput = document.getElementById('symptom-input');
    const charCount = document.getElementById('char-count');
    const analyzeBtn = document.getElementById('analyze-btn');
    const btnSpinner = document.getElementById('btn-spinner');
    const resultPanel = document.getElementById('result-panel');
    const loadingState = document.getElementById('loading-state');
    const responseCard = document.getElementById('response-card');
    const errorCard = document.getElementById('error-card');
    const errorMessage = document.getElementById('error-message');

    // Result fields
    const resultCondition = document.getElementById('result-condition');
    const resultExplanation = document.getElementById('result-explanation');
    const resultAdvice = document.getElementById('result-advice');

    // Voice recognition logic
    const voiceBtn = document.getElementById('voice-btn');
    const voiceBtnText = document.getElementById('voice-btn-text');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    let isListening = false;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-IN'; // Default speech model matching Indian English accents

        recognition.onstart = () => {
            isListening = true;
            voiceBtn.classList.add('listening');
            voiceBtnText.textContent = 'Listening...';
            symptomInput.placeholder = 'Listening to your symptoms... Speak now.';
        };

        recognition.onend = () => {
            isListening = false;
            voiceBtn.classList.remove('listening');
            voiceBtnText.textContent = 'Speak';
            symptomInput.placeholder = 'Describe your symptoms in detail (e.g., fever, mild chest pain, headache since morning...)';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const currentVal = symptomInput.value.trim();
            symptomInput.value = currentVal ? `${currentVal} ${transcript}` : transcript;
            charCount.textContent = symptomInput.value.length;
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            let errDesc = 'Speech recognition failed.';
            if (event.error === 'not-allowed') {
                errDesc = 'Microphone access denied. Please enable microphone permissions in your browser settings.';
            } else if (event.error === 'no-speech') {
                errDesc = 'No speech detected. Please speak clearly into your microphone.';
            }
            alert(errDesc);
        };

        voiceBtn.addEventListener('click', () => {
            if (isListening) {
                recognition.stop();
            } else {
                recognition.start();
            }
        });
    } else {
        voiceBtn.disabled = true;
        voiceBtn.title = 'Speech recognition is not supported in this browser.';
        voiceBtnText.textContent = 'Mic Unavailable';
    }

    // Text-to-Speech (TTS) Logic
    const ttsBtn = document.getElementById('tts-btn');
    const ttsBtnText = document.getElementById('tts-btn-text');
    let lastResponseText = "";
    let currentUtterance = null;

    function speakResponse(text) {
        if (!('speechSynthesis' in window)) {
            console.warn('Text-to-speech is not supported in this browser.');
            return;
        }

        // Cancel previous speech synthesis
        window.speechSynthesis.cancel();

        if (!text || text.trim() === "") {
            return;
        }

        // Clean text formatting for smoother speech output (e.g. converting header prefixes to commas/stops)
        const cleanText = text
            .replace(/Possible Condition:/gi, 'Possible Condition:')
            .replace(/Explanation:/gi, 'Explanation.')
            .replace(/Advice:/gi, 'Advice.')
            .replace(/\*/g, '')
            .replace(/Dont/g, "Don't")
            .trim();

        currentUtterance = new SpeechSynthesisUtterance(cleanText);
        currentUtterance.lang = 'en-IN'; // Indian English accent for clinical response

        currentUtterance.onstart = () => {
            if (ttsBtn && ttsBtnText) {
                ttsBtn.classList.add('speaking');
                ttsBtnText.textContent = 'Stop';
            }
        };

        currentUtterance.onend = () => {
            if (ttsBtn && ttsBtnText) {
                ttsBtn.classList.remove('speaking');
                ttsBtnText.textContent = 'Listen';
            }
        };

        currentUtterance.onerror = (e) => {
            console.error('Speech synthesis error:', e);
            if (ttsBtn && ttsBtnText) {
                ttsBtn.classList.remove('speaking');
                ttsBtnText.textContent = 'Listen';
            }
        };

        window.speechSynthesis.speak(currentUtterance);
    }

    // Manual click listener for TTS Play/Pause
    if (ttsBtn) {
        ttsBtn.addEventListener('click', () => {
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
                // trigger button reset manually if speech ended by user
                if (ttsBtn && ttsBtnText) {
                    ttsBtn.classList.remove('speaking');
                    ttsBtnText.textContent = 'Listen';
                }
            } else if (lastResponseText) {
                speakResponse(lastResponseText);
            }
        });
    }

    // Stop speaking if user starts typing a new query
    symptomInput.addEventListener('input', () => {
        const currentLength = symptomInput.value.length;
        charCount.textContent = currentLength;

        if (window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
    });

    // Helper to extract fields from LLM response
    function parseAIResponse(text) {
        const result = {
            condition: "General health symptom query",
            explanation: "",
            advice: ""
        };

        if (typeof text === 'string') {
            const conditionMatch = text.match(/Possible Condition:\s*([\s\S]*?)(?=Explanation:|$)/i);
            const explanationMatch = text.match(/Explanation:\s*([\s\S]*?)(?=Advice:|$)/i);
            const adviceMatch = text.match(/Advice:\s*([\s\S]*?)$/i);

            if (conditionMatch) result.condition = conditionMatch[1].trim();
            if (explanationMatch) result.explanation = explanationMatch[1].trim();
            if (adviceMatch) result.advice = adviceMatch[1].trim();

            if (!explanationMatch && !adviceMatch) {
                result.explanation = text;
                result.advice = "Please consult a healthcare professional for proper medical evaluation.";
            }
        }
        return result;
    }

    // Call API Endpoint on click
    analyzeBtn.addEventListener('click', async () => {
        const symptoms = symptomInput.value.trim();

        if (!symptoms) {
            alert('Please describe your symptoms before analyzing.');
            return;
        }

        // Cancel speech if running on click
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        // 1. Set loading UI states
        analyzeBtn.disabled = true;
        btnSpinner.style.display = 'block';
        
        resultPanel.style.display = 'block';
        loadingState.style.display = 'flex';
        responseCard.style.display = 'none';
        errorCard.style.display = 'none';

        try {
            const response = await fetch('http://127.0.0.1:8000/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ symptoms: symptoms })
            });

            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }

            const data = await response.json();
            const aiResponseText = data.response || data.result || "";

            // Parse response into fields
            const parsed = parseAIResponse(aiResponseText);

            // Populate UI fields
            resultCondition.textContent = parsed.condition;
            resultExplanation.textContent = parsed.explanation;
            resultAdvice.textContent = parsed.advice;

            // Transition UI
            loadingState.style.display = 'none';
            responseCard.style.display = 'block';

            // Auto-trigger TTS speech and cache text
            lastResponseText = aiResponseText;
            speakResponse(aiResponseText);

        } catch (error) {
            console.error('Request failed:', error);
            
            errorMessage.textContent = `Could not get analysis. Error details: ${error.message}. Make sure the FastAPI server is running on http://127.0.0.1:8000.`;
            loadingState.style.display = 'none';
            errorCard.style.display = 'flex';
        } finally {
            analyzeBtn.disabled = false;
            btnSpinner.style.display = 'none';
        }
    });
});
