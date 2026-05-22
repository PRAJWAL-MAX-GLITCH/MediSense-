// DOM Elements
let els = {};

export function initUI(elements) {
    els = elements;
}

export function showLoading(isLoading) {
    if (isLoading) {
        els.sendBtn.disabled = true;
        els.chatInput.disabled = true;
        els.typingIndicator.style.display = 'block';
        scrollToBottom();
    } else {
        els.sendBtn.disabled = false;
        els.chatInput.disabled = false;
        els.typingIndicator.style.display = 'none';
        els.chatInput.focus();
    }
}

export function showError(message) {
    els.errorMessage.textContent = message;
    els.errorBanner.style.display = 'block';
    els.typingIndicator.style.display = 'none';
    
    // Hide after 5 seconds
    setTimeout(() => {
        els.errorBanner.style.display = 'none';
    }, 5000);
}

export function parseResponseString(responseText) {
    let parsed = {
        type: "analysis",
        symptoms: [],
        risk: "LOW",
        condition: "General health symptom query",
        advice: "Please consult a healthcare professional for proper medical evaluation.",
        emergency: false
    };

    try {
        parsed = JSON.parse(responseText.trim());
    } catch (e) {
        console.warn("Could not parse AI response as JSON", e);
        parsed.condition = "Error parsing medical guidance details.";
    }
    return parsed;
}

export function renderAnalysis(parsed) {
    let html = `<strong>Clinical Guidance</strong><br><br>`;
    
    // Symptoms
    let symptomsStr = Array.isArray(parsed.symptoms) && parsed.symptoms.length > 0 ? parsed.symptoms.join(', ') : "None detected";
    
    const riskLevel = (parsed.risk || "LOW").toUpperCase();
    let riskHtml = `<span style="color: var(--success);">Low Risk</span>`;
    if (riskLevel === 'HIGH') riskHtml = `<span style="color: var(--danger); font-weight: bold;">High Risk</span>`;
    else if (riskLevel === 'MEDIUM') riskHtml = `<span style="color: var(--warning); font-weight: bold;">Medium Risk</span>`;
    
    html += `
        <div class="analysis-card">
            <div class="analysis-group">
                <div class="analysis-title">Symptoms Identified</div>
                <div>${symptomsStr}</div>
            </div>
            <div class="analysis-group">
                <div class="analysis-title">Risk Level</div>
                <div>${riskHtml}</div>
            </div>
            <div class="analysis-group">
                <div class="analysis-title">Possible Condition</div>
                <div>${parsed.condition || "Not identified"}</div>
            </div>
            <div class="analysis-group">
                <div class="analysis-title">Advice</div>
                <div>${parsed.advice || "No specific advice. Consult a doctor."}</div>
            </div>
    `;
    
    if (parsed.emergency) {
        html += `
            <div class="analysis-group">
                <div class="analysis-title" style="color: var(--danger);">Emergency</div>
                <div style="color: var(--danger); font-weight: bold;">Seek immediate medical attention.</div>
            </div>
        `;
    }
    
    html += `</div>`;
    
    appendAiMessage(html);
}

export function renderQuestions(questions) {
    let html = `I need a bit more information to provide an accurate assessment:<br><br><ul>`;
    if (Array.isArray(questions)) {
        questions.forEach(q => {
            html += `<li>${q}</li>`;
        });
    }
    html += `</ul>`;
    appendAiMessage(html);
}

export function renderGeneral(parsed) {
    const html = `<strong>MediSense AI</strong><br><br>${parsed.answer}`;
    appendAiMessage(html);
}

export function renderUserMessage(message) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble user';
    bubble.innerHTML = `<div class="bubble-content">${escapeHTML(message)}</div>`;
    els.chatBubblesList.appendChild(bubble);
    
    els.chatInput.value = "";
    els.chatInput.style.height = 'auto'; // reset textarea height
    scrollToBottom();
}

function appendAiMessage(htmlContent) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble ai';
    bubble.innerHTML = `
        <div class="bubble-content">
            ${htmlContent}
        </div>
    `;
    // Insert before typing indicator if it exists inside the same container,
    // but typing indicator is outside chat-bubbles-list in our HTML, so just append.
    els.chatBubblesList.appendChild(bubble);
    scrollToBottom();
}

export function clearChat() {
    // In chat UI, we usually don't clear chat unless starting a totally new session.
    // For now, let's just reset the chat to the welcome message.
    els.chatBubblesList.innerHTML = `
        <div class="chat-bubble ai">
            <div class="bubble-content">
                <strong>MediSense AI</strong><br><br>
                Hello! I am your intelligent health risk assistant. Please describe your symptoms in detail (e.g., fever, mild chest pain, headache since morning). 
            </div>
        </div>
    `;
}

function scrollToBottom() {
    els.chatMain.scrollTop = els.chatMain.scrollHeight;
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
