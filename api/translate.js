// Simple backend API to proxy OpenRouter requests securely
// This runs on Vercel serverless functions

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY; // Server-side only
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting - simple protection
  const userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  // You could add rate limiting here if needed

  try {
    const { text, mode } = req.body;

    // Validate input
    if (!text || !mode) {
      return res.status(400).json({ error: 'Missing text or mode' });
    }

    // Prepare translation prompt
    let prompt = '';
    if (mode === 'toJapanese') {
      prompt = `Translate this mixed language text to natural, romantic Japanese. The text may contain English, Cantonese, or Japanese mixed together. Preserve the emotional tone and intimate meaning:

"${text}"

Japanese translation:`;
    } else if (mode === 'toCantonese') {
      prompt = `Translate this Japanese text to natural, romantic Cantonese. Preserve the emotional tone and intimate meaning:

"${text}"

Cantonese translation:`;
    } else if (mode === 'toEnglish') {
      prompt = `Translate this Japanese text to natural, romantic English. Preserve the emotional tone and intimate meaning:

"${text}"

English translation:`;
    }

    // Call OpenRouter API (server-side - API key hidden)
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://your-app.vercel.app',
        'X-Title': 'LoveBridge Translation App'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator specializing in romantic conversations between couples. 
            You handle mixed languages (English, Cantonese, Japanese) with emotional sensitivity.
            Always preserve the loving tone and intimate meaning of the message.
            Respond only with the translation, no explanations.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const translation = data.choices[0]?.message?.content || '';

    // Return only the translation (no API key exposed)
    res.status(200).json({
      translation: translation.trim(),
      success: true
    });

  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ 
      error: 'Translation failed',
      success: false
    });
  }
}