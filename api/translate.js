// SECURED backend API to proxy OpenRouter requests
// Multiple layers of protection against abuse

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const API_SECRET = process.env.API_SECRET || 'your-secret-key-2024';

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map();

// Daily usage tracking
let dailyUsage = {
  translations: 0,
  lastReset: new Date().toDateString(),
  maxDailyTranslations: 500 // Daily limit to protect your credits
};

module.exports = async function handler(req, res) {
  // Set CORS headers first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // TEMPORARILY DISABLED SECURITY FOR TESTING
    console.log('⚠️ Security temporarily disabled for testing');

    // SECURITY LAYER 2: Rate limiting per IP
    const userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 10; // Max 10 requests per minute per IP

    if (!rateLimitStore.has(userIP)) {
      rateLimitStore.set(userIP, { count: 1, resetTime: now + windowMs });
    } else {
      const userLimit = rateLimitStore.get(userIP);
      
      if (now > userLimit.resetTime) {
        // Reset the window
        rateLimitStore.set(userIP, { count: 1, resetTime: now + windowMs });
      } else {
        userLimit.count++;
        if (userLimit.count > maxRequests) {
          console.log(`🚫 Rate limit exceeded for IP: ${userIP}`);
          return res.status(429).json({ 
            error: 'Rate limit exceeded. Please wait before making more requests.',
            retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
          });
        }
      }
    }

    // SECURITY LAYER 3: Input validation and sanitization
    const { text, mode } = req.body;

    if (!text || !mode || typeof text !== 'string' || typeof mode !== 'string') {
      return res.status(400).json({ error: 'Invalid input parameters' });
    }

    // Limit text length to prevent abuse
    if (text.length > 500) {
      return res.status(400).json({ error: 'Text too long. Maximum 500 characters.' });
    }

    // Validate mode
    if (!['toJapanese', 'toCantonese', 'toEnglish'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid translation mode' });
    }

    // SECURITY LAYER 4: Content filtering (basic)
    const suspiciousPatterns = [
      /hack/i, /exploit/i, /bypass/i, /attack/i, /malicious/i,
      /\bapi[_\s]?key\b/i, /\btoken\b/i, /\bpassword\b/i
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(text))) {
      console.log(`🚫 Suspicious content blocked: ${text.substring(0, 50)}...`);
      return res.status(400).json({ error: 'Content not allowed' });
    }

    // SECURITY LAYER 5: Daily usage limits
    const today = new Date().toDateString();
    if (dailyUsage.lastReset !== today) {
      // Reset daily counter
      dailyUsage.translations = 0;
      dailyUsage.lastReset = today;
    }

    dailyUsage.translations++;
    if (dailyUsage.translations > dailyUsage.maxDailyTranslations) {
      console.log(`🚫 Daily translation limit exceeded: ${dailyUsage.translations}/${dailyUsage.maxDailyTranslations}`);
      return res.status(429).json({ 
        error: 'Daily translation limit reached. Service will reset tomorrow.',
        dailyUsage: dailyUsage.translations,
        maxDaily: dailyUsage.maxDailyTranslations
      });
    }

    // Debug logging (with sanitized output)
    console.log('✅ Security checks passed for IP:', userIP);
    console.log('📝 Processing request:', { textLength: text.length, mode, dailyCount: dailyUsage.translations });

    // Check if API key is available
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ 
        error: 'OpenRouter API key not configured in environment variables',
        success: false 
      });
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