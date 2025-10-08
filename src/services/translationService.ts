// Translation service using OpenRouter GPT-4.1 Mini
const OPENROUTER_API_KEY = process.env.REACT_APP_OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface TranslationRequest {
  text: string;
  targetLanguage: 'japanese' | 'cantonese' | 'english';
  sourceLanguages?: string[];
}

export interface TranslationResponse {
  original: string;
  japanese: string;
  cantonese: string;
  english: string;
}

export class TranslationService {
  private static async callOpenRouter(prompt: string): Promise<string> {
    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured');
    }

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'LoveBridge Translation App'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4-1106-preview', // GPT-4.1 Mini
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
    return data.choices[0]?.message?.content || '';
  }

  static async translateToJapanese(text: string): Promise<string> {
    const prompt = `Translate this mixed language text to natural, romantic Japanese. The text may contain English, Cantonese, or Japanese mixed together. Preserve the emotional tone and intimate meaning:

"${text}"

Japanese translation:`;

    return await this.callOpenRouter(prompt);
  }

  static async translateToCantonese(text: string): Promise<string> {
    const prompt = `Translate this Japanese text to natural, romantic Cantonese. Preserve the emotional tone and intimate meaning:

"${text}"

Cantonese translation:`;

    return await this.callOpenRouter(prompt);
  }

  static async translateToEnglish(text: string): Promise<string> {
    const prompt = `Translate this Japanese text to natural, romantic English. Preserve the emotional tone and intimate meaning:

"${text}"

English translation:`;

    return await this.callOpenRouter(prompt);
  }

  static async processFullTranslation(
    originalText: string,
    mode: 'toJapanese' | 'toCantonese'
  ): Promise<TranslationResponse> {
    try {
      if (mode === 'toJapanese') {
        const japanese = await this.translateToJapanese(originalText);
        const cantonese = await this.translateToCantonese(japanese);
        
        return {
          original: originalText,
          japanese: japanese.trim(),
          cantonese: cantonese.trim(),
          english: originalText // Keep original if it's already English/mixed
        };
      } else {
        // Mode is 'toCantonese' - translating from Japanese
        const cantonese = await this.translateToCantonese(originalText);
        const english = await this.translateToEnglish(originalText);
        
        return {
          original: originalText,
          japanese: originalText, // Keep original Japanese
          cantonese: cantonese.trim(),
          english: english.trim()
        };
      }
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }
}

// Enhanced Speech-to-Text service with multiple options
export class SpeechService {
  
  // Option 1: OpenAI Whisper API (Best for mixed languages)
  static async convertSpeechToTextWhisper(audioBlob: Blob): Promise<string> {
    const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'whisper-1');
    formData.append('language', 'auto'); // Auto-detect language
    formData.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Whisper API error: ${response.status}`);
    }

    const data = await response.json();
    return data.text || '';
  }

  // Option 2: Web Speech API (Free fallback)
  static async convertSpeechToTextWeb(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          throw new Error('Speech recognition not supported in this browser');
        }

        const recognition = new ((window as any).webkitSpeechRecognition || 
                              (window as any).SpeechRecognition)();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        
        // Try to handle multiple languages
        recognition.lang = 'en-US';
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          console.log('Web Speech API result:', transcript);
          resolve(transcript);
        };
        
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          reject(new Error(`Speech recognition error: ${event.error}`));
        };

        recognition.onend = () => {
          console.log('Speech recognition ended');
        };
        
        recognition.start();
        
        // Timeout after 15 seconds
        setTimeout(() => {
          recognition.stop();
          reject(new Error('Speech recognition timeout - please try speaking again'));
        }, 15000);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  // Main method: Try Whisper first, fallback to Web Speech API
  static async convertSpeechToText(audioBlob: Blob): Promise<string> {
    try {
      // Try Whisper API first (best quality for mixed languages)
      return await this.convertSpeechToTextWhisper(audioBlob);
    } catch (whisperError) {
      console.warn('Whisper API failed, trying Web Speech API:', whisperError);
      
      try {
        // Fallback to Web Speech API
        return await this.convertSpeechToTextWeb();
      } catch (webSpeechError) {
        console.error('Both speech recognition methods failed');
        
        // Ultimate fallback: return sample text based on user's typical usage
        throw new Error('Speech recognition unavailable. Please check microphone permissions and try again.');
      }
    }
  }
}