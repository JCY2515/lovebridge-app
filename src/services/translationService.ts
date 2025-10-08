// Translation service using OpenRouter GPT-4o Mini (Latest & Most Cost-Effective)
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
  private static async callSecureBackend(text: string, mode: string): Promise<string> {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          mode: mode
        })
      });

      if (!response.ok) {
        console.error('Backend API error:', response.status);
        throw new Error(`Backend API error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        console.error('Translation error:', data.error);
        throw new Error(data.error || 'Translation failed');
      }
      
      return data.translation || '';
    } catch (error) {
      console.error('Frontend API call failed:', error);
      
      // Fallback: Return demo translation for now
      if (mode === 'toJapanese') {
        return `[Demo] こんにちは、愛しています！「${text}」の翻訳です`;
      } else if (mode === 'toCantonese') {
        return `[Demo] 你好，我愛你！「${text}」嘅翻譯`;
      } else {
        return `[Demo] Hello, I love you! Translation of "${text}"`;
      }
    }
  }

  static async translateToJapanese(text: string): Promise<string> {
    return await this.callSecureBackend(text, 'toJapanese');
  }

  static async translateToCantonese(text: string): Promise<string> {
    return await this.callSecureBackend(text, 'toCantonese');
  }

  static async translateToEnglish(text: string): Promise<string> {
    // For English, we can translate from Japanese to English via backend
    return await this.callSecureBackend(text, 'toEnglish');
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

  // Option 2: Enhanced Web Speech API with multiple language support
  static async convertSpeechToTextWeb(preferredLang?: string): Promise<string> {
    // Try different languages in order of likelihood
    const languagesToTry = [
      'zh-HK', // Cantonese (Hong Kong)
      'zh-CN', // Mandarin (Simplified)
      'zh-TW', // Mandarin (Traditional) 
      'en-US', // English (US)
      'ja-JP'  // Japanese
    ];

    // If user has a preference, try that first
    if (preferredLang) {
      languagesToTry.unshift(preferredLang);
    }

    for (const lang of languagesToTry) {
      try {
        console.log(`Trying speech recognition with language: ${lang}`);
        const result = await this.tryLanguage(lang);
        if (result && result.length > 0) {
          console.log(`Success with ${lang}: ${result}`);
          return result;
        }
      } catch (error) {
        console.warn(`Failed with ${lang}:`, error);
        continue;
      }
    }

    throw new Error('Speech recognition failed with all languages. Please try speaking more clearly.');
  }

  private static async tryLanguage(lang: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          throw new Error('Speech recognition not supported in this browser');
        }

        const recognition = new ((window as any).webkitSpeechRecognition || 
                              (window as any).SpeechRecognition)();
        
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;
        recognition.lang = lang;
        
        let finalTranscript = '';
        
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          console.log(`Interim (${lang}):`, interimTranscript);
          console.log(`Final (${lang}):`, finalTranscript);
        };
        
        recognition.onerror = (event: any) => {
          console.error(`Speech recognition error (${lang}):`, event.error);
          reject(new Error(`Speech recognition error: ${event.error}`));
        };

        recognition.onend = () => {
          console.log(`Speech recognition ended (${lang}):`, finalTranscript);
          if (finalTranscript.trim().length > 0) {
            resolve(finalTranscript.trim());
          } else {
            reject(new Error(`No speech detected in ${lang}`));
          }
        };
        
        recognition.start();
        
        // Timeout after 10 seconds per language
        setTimeout(() => {
          recognition.stop();
          reject(new Error(`Speech recognition timeout for ${lang}`));
        }, 10000);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  // Main method: Try Whisper first, fallback to enhanced Web Speech API
  static async convertSpeechToText(audioBlob: Blob, mode?: 'toJapanese' | 'toCantonese'): Promise<string> {
    try {
      // Try Whisper API first (best quality for mixed languages)
      return await this.convertSpeechToTextWhisper(audioBlob);
    } catch (whisperError) {
      console.warn('Whisper API failed, trying Web Speech API:', whisperError);
      
      try {
        // Determine preferred language based on mode
        let preferredLang = 'zh-HK'; // Default to Cantonese
        if (mode === 'toJapanese') {
          // User is speaking mixed languages, try Cantonese/Chinese first
          preferredLang = 'zh-HK';
        } else if (mode === 'toCantonese') {
          // User's girlfriend is speaking Japanese
          preferredLang = 'ja-JP';
        }
        
        // Fallback to enhanced Web Speech API
        return await this.convertSpeechToTextWeb(preferredLang);
      } catch (webSpeechError) {
        console.error('Both speech recognition methods failed:', webSpeechError);
        
        // Ultimate fallback: Ask user to try again
        throw new Error('Could not detect your speech. Please try speaking more clearly or check your microphone permissions.');
      }
    }
  }
}