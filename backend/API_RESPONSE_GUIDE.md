# MediSense AI - API Response Guide

## 🎯 Quick Overview

The `/analyze` endpoint accepts a user query and returns a JSON response based on the query type.

---

## 📡 API Endpoint

```
POST /analyze
Content-Type: application/json
```

### Request
```json
{
  "symptoms": "I have fever and cough"
}
```

### Response (varies by query type)
```json
{
  "response": "{...}" 
}
```

**Note**: The response is a JSON string, not an object. Parse it with `JSON.parse()`.

---

## 📋 Response Types

### 1️⃣ **Greeting Response**

**Triggers:**
- User says: "hi", "hello", "hey", "good morning", etc.

**Response Structure:**
```json
{
  "type": "general",
  "answer": "Hello! I'm MediSense AI, your multilingual medical assistant..."
}
```

**Frontend Handling:**
```javascript
if (response.type === "general" && response.answer.includes("MediSense AI")) {
  // Display greeting
  displayMessage(response.answer);
}
```

---

### 2️⃣ **General Query Response** (Web Search)

**Triggers:**
- User asks: "Who is Elon Musk?", "What is AI?", etc.
- No medical keywords detected

**Response Structure:**
```json
{
  "type": "general",
  "answer": "Elon Musk is a technology entrepreneur and CEO..."
}
```

**Data Flow:**
1. Web search (Tavily API) 🌐
2. LLM synthesis
3. Clean answer

**Frontend Handling:**
```javascript
if (response.type === "general") {
  displayMessage(response.answer);
  addSourceAttribution("From real-time web search");
}
```

---

### 3️⃣ **Follow-up Questions** (Incomplete Health Info)

**Triggers:**
- User says: "I have fever"
- Detected symptoms < 2

**Response Structure:**
```json
{
  "type": "question",
  "questions": [
    "How high is your temperature?",
    "Do you also have a cough, body pain, or sore throat?"
  ]
}
```

**Frontend Handling:**
```javascript
if (response.type === "question") {
  displayFollowUpQuestions(response.questions);
  // Show as clickable buttons or text input
  // Then submit follow-up as new query
}
```

---

### 4️⃣ **Medical Analysis** (Complete Health Data)

**Triggers:**
- User says: "I have fever and cough"
- Detected symptoms >= 2

**Response Structure:**
```json
{
  "type": "analysis",
  "symptoms": ["fever", "cough"],
  "risk": "MEDIUM",
  "condition": "Possible viral respiratory infection",
  "advice": "Rest well, stay hydrated...",
  "emergency": false
}
```

**Field Explanations:**

| Field | Type | Values | Meaning |
|-------|------|--------|---------|
| `type` | string | "analysis" | Medical analysis response |
| `symptoms` | array | ["fever", "cough", ...] | Extracted symptoms |
| `risk` | string | "LOW", "MEDIUM", "HIGH" | Risk level assessment |
| `condition` | string | "Possible..." | Inferred condition |
| `advice` | string | "Rest well..." | Medical guidance |
| `emergency` | boolean | true/false | Requires immediate care |

**Risk Level Details:**

```
LOW:
  - Single non-serious symptom
  - No high-risk symptoms detected

MEDIUM:
  - 2+ symptoms combined
  - Medium-risk symptoms present
  - E.g., fever + headache

HIGH:
  - Serious symptoms detected
  - Chest pain, breathing issues, fainting
  - REQUIRES IMMEDIATE ATTENTION
```

**Frontend Handling:**
```javascript
if (response.type === "analysis") {
  // Display condition
  displayCondition(response.condition);
  
  // Show risk level with color coding
  const riskColor = {
    "LOW": "#4caf50",      // Green
    "MEDIUM": "#ff9800",   // Orange
    "HIGH": "#f44336"      // Red
  };
  displayRiskBadge(response.risk, riskColor[response.risk]);
  
  // Emergency warning
  if (response.emergency) {
    showEmergencyAlert("⚠️ IMMEDIATE MEDICAL ATTENTION REQUIRED");
    showNearbyHospitals();
  }
  
  // Display advice
  displayAdvice(response.advice);
}
```

---

### 5️⃣ **Error Response**

**Triggers:**
- Unrecoverable error occurs
- Invalid input

**Response Structure:**
```json
{
  "type": "error",
  "message": "An error occurred: Database connection failed. Please try again."
}
```

**Frontend Handling:**
```javascript
if (response.type === "error") {
  showErrorMessage(response.message);
  displayRetryButton();
}
```

---

## 🌍 Multilingual Support

**The system detects and responds in the user's language:**

### Hindi Example
```
User: "मुझे बुखार और खांसी है"
System detects: Hindi
Response (condition & advice translated to Hindi):
{
  "type": "analysis",
  "symptoms": ["fever", "cough"],
  "risk": "MEDIUM",
  "condition": "संभव वायरल श्वसन संक्रमण",
  "advice": "अच्छी तरह से आराम करें...",
  "emergency": false
}
```

### Marathi Example
```
User: "मला ताप आणि खोकला आहे"
System detects: Marathi
Response (translated to Marathi):
{
  "type": "analysis",
  "symptoms": ["fever", "cough"],
  "risk": "MEDIUM",
  "condition": "संभाव्य व्हायरल श्वसन संक्रमण",
  "advice": "चांगल्या प्रकारे विश्राम घ्या...",
  "emergency": false
}
```

**Frontend Notes:**
- JSON keys stay English (type, risk, symptoms, etc.)
- Only user-facing text translated (condition, advice, questions, answer)
- Symptoms list returned in English (for consistency)

---

## 🎨 Frontend Implementation Examples

### React Example
```jsx
import { useState } from 'react';

export default function MediSenseChat() {
  const [messages, setMessages] = useState([]);
  
  const handleQuery = async (query) => {
    const res = await fetch('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptoms: query })
    });
    
    const { response } = await res.json();
    const data = JSON.parse(response);
    
    // Route by type
    switch (data.type) {
      case 'general':
        setMessages([...messages, { role: 'bot', content: data.answer }]);
        break;
      
      case 'question':
        setMessages([...messages, { 
          role: 'bot', 
          type: 'questions',
          content: data.questions 
        }]);
        break;
      
      case 'analysis':
        setMessages([...messages, {
          role: 'bot',
          type: 'analysis',
          symptoms: data.symptoms,
          risk: data.risk,
          condition: data.condition,
          advice: data.advice,
          emergency: data.emergency
        }]);
        break;
      
      case 'error':
        setMessages([...messages, { role: 'error', content: data.message }]);
        break;
    }
  };
  
  return (
    <div className="chat">
      {messages.map((msg, i) => (
        <ChatMessage key={i} message={msg} />
      ))}
    </div>
  );
}
```

### Vue Example
```vue
<template>
  <div class="chat-container">
    <div class="messages">
      <div v-for="msg in messages" :key="msg.id" :class="msg.type">
        <template v-if="msg.type === 'general'">
          <p>{{ msg.answer }}</p>
        </template>
        
        <template v-else-if="msg.type === 'question'">
          <div class="questions">
            <button v-for="q in msg.questions" :key="q" @click="sendQuery(q)">
              {{ q }}
            </button>
          </div>
        </template>
        
        <template v-else-if="msg.type === 'analysis'">
          <div class="analysis">
            <span :class="`risk-${msg.risk}`">Risk: {{ msg.risk }}</span>
            <div v-if="msg.emergency" class="emergency-alert">
              ⚠️ EMERGENCY - Seek immediate medical help!
            </div>
            <h3>{{ msg.condition }}</h3>
            <p>{{ msg.advice }}</p>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    async sendQuery(query) {
      const res = await fetch('/analyze', {
        method: 'POST',
        body: JSON.stringify({ symptoms: query })
      });
      const { response } = await res.json();
      this.messages.push(JSON.parse(response));
    }
  }
}
</script>

<style scoped>
.risk-HIGH { color: #f44336; font-weight: bold; }
.risk-MEDIUM { color: #ff9800; }
.risk-LOW { color: #4caf50; }
.emergency-alert {
  background: #f44336;
  color: white;
  padding: 12px;
  border-radius: 4px;
  margin: 10px 0;
}
</style>
```

---

## 📊 Response Flow Diagram

```
User Query
    ↓
[Language Detection]
    ↓
[Greeting Check] → YES → Greeting Response
    ↓ NO
[Translate to English]
    ↓
[Query Classification]
    ├─ GENERAL → Web Search → LLM → General Response
    │
    └─ HEALTH
        ├─ Extract Symptoms
        ├─ < 2 Symptoms? → YES → Follow-up Questions
        │       ↓ NO
        ├─ Risk Assessment
        ├─ Emergency Check
        ├─ FAISS Retrieval
        └─ LLM Analysis → Medical Analysis Response
    ↓
[Translate to User Language]
    ↓
Return JSON Response
```

---

## ⚡ Quick Testing

### Test Case 1: Greeting
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"symptoms": "hello"}'
```

Expected:
```json
{
  "type": "general",
  "answer": "Hello! I'm MediSense AI..."
}
```

### Test Case 2: General Query
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"symptoms": "Who is Elon Musk?"}'
```

Expected:
```json
{
  "type": "general",
  "answer": "Elon Musk is a technology entrepreneur..."
}
```

### Test Case 3: Single Symptom
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"symptoms": "I have fever"}'
```

Expected:
```json
{
  "type": "question",
  "questions": ["How high is your temperature?", "..."]
}
```

### Test Case 4: Multiple Symptoms
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"symptoms": "I have fever and cough"}'
```

Expected:
```json
{
  "type": "analysis",
  "symptoms": ["fever", "cough"],
  "risk": "MEDIUM",
  "condition": "Possible viral respiratory infection...",
  "advice": "Rest well, stay hydrated...",
  "emergency": false
}
```

### Test Case 5: Multilingual
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"symptoms": "मला ताप आहे"}'
```

Expected: (in Marathi)
```json
{
  "type": "question",
  "questions": ["आपला तापमान किती आहे?", "..."]
}
```

---

## 🔍 Debugging Tips

1. **Check raw response:**
   ```javascript
   const res = await fetch('/analyze', {...});
   const data = await res.json();
   console.log("Raw response:", data.response);
   console.log("Parsed:", JSON.parse(data.response));
   ```

2. **Validate JSON:**
   ```javascript
   try {
     const parsed = JSON.parse(data.response);
     console.log("Valid JSON:", parsed);
   } catch (e) {
     console.error("Invalid JSON:", data.response);
   }
   ```

3. **Check field presence:**
   ```javascript
   const data = JSON.parse(response);
   console.log("Type:", data.type);
   console.log("Has 'answer':", 'answer' in data);
   console.log("Has 'questions':", 'questions' in data);
   ```

---

## ✅ Checklist for Frontend Integration

- [ ] Handle all 5 response types
- [ ] Display risk level with color coding
- [ ] Show emergency alert prominently
- [ ] Add retry button on error
- [ ] Support voice input (plain text ready)
- [ ] Implement follow-up question buttons
- [ ] Handle multilingual responses
- [ ] Parse JSON correctly (it's nested)
- [ ] Display symptoms as tags/chips
- [ ] Link to nearby hospitals (if emergency)

---

## 📞 Common Integration Issues

**Issue**: `JSON.parse()` fails
- **Solution**: Make sure you're parsing `data.response`, not `data` directly

**Issue**: Response type not recognized
- **Solution**: Check all 5 types (general, question, analysis, error, greeting)

**Issue**: Translated text looks garbled
- **Solution**: Ensure frontend charset is UTF-8

**Issue**: Emergency flag not triggering alert
- **Solution**: Check if `data.risk === "HIGH"` and show alert

---

**Ready to integrate? Let's build an amazing medical assistant! 🚀**
