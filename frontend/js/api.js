/**
 * Makes a POST request to the analysis endpoint.
 * @param {string} queryText - The symptom description and accumulated answers.
 * @returns {Promise<Object>} - The JSON response from the server.
 */
export async function fetchAnalysis(queryText) {
    const response = await fetch('http://127.0.0.1:8000/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symptoms: queryText })
    });

    if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    return data;
}
