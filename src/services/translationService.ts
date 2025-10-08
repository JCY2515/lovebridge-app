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

  // Check microphone audio levels
  private static async checkMicrophoneLevel(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      return new Promise((resolve) => {
        let maxVolume = 0;
        let checkCount = 0;
        const maxChecks = 30; // Check for 0.6 seconds (30 * 20ms)
        
        const checkVolume = () => {
          analyser.getByteFrequencyData(dataArray);
          const volume = Math.max.apply(null, Array.from(dataArray));
          maxVolume = Math.max(maxVolume, volume);
          
          checkCount++;
          if (checkCount < maxChecks) {
            setTimeout(checkVolume, 20);
          } else {
            console.log(`Max microphone volume detected: ${maxVolume}`);
            stream.getTracks().forEach(track => track.stop());
            audioContext.close();
            resolve(maxVolume > 5); // Return true if we detected some audio
          }
        };
        
        checkVolume();
      });
    } catch (error) {
      console.error('Microphone check failed:', error);
      return false;
    }
  }

  // Option 2: Enhanced Web Speech API with multiple language support
  static async convertSpeechToTextWeb(preferredLang?: string): Promise<string> {
    // First check if microphone is working
    console.log('Checking microphone audio levels...');
    const micWorking = await this.checkMicrophoneLevel();
    if (!micWorking) {
      console.warn('Low or no audio detected from microphone');
    }
    
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
        
        recognition.continuous = true;  // Keep listening for longer phrases
        recognition.interimResults = true;
        recognition.maxAlternatives = 3;
        recognition.lang = lang;
        
        // Add a delay before stopping to allow processing
        let speechEndTimer: NodeJS.Timeout | null = null;
        
        // Add timeout to prevent hanging - increased for better speech processing
        const timeout = setTimeout(() => {
          console.log(`Timeout for ${lang} - stopping recognition`);
          recognition.stop();
          reject(new Error(`Speech recognition timeout for ${lang}`));
        }, 15000); // 15 second timeout - more time to process speech
        
        let finalTranscript = '';
        
        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
              console.log(`✅ Final result (${lang}):`, finalTranscript);
              
              // If we got a good result, resolve immediately
              if (finalTranscript.trim().length > 0) {
                clearTimeout(timeout);
                if (speechEndTimer) clearTimeout(speechEndTimer);
                recognition.stop();
                resolve(finalTranscript.trim());
                return;
              }
            } else {
              interimTranscript += transcript;
            }
          }
          
          console.log(`Interim (${lang}):`, interimTranscript);
          if (finalTranscript) console.log(`Final so far (${lang}):`, finalTranscript);
        };
        
        recognition.onerror = (event: any) => {
          clearTimeout(timeout);
          if (speechEndTimer) clearTimeout(speechEndTimer);
          console.error(`Speech recognition error (${lang}):`, event.error);
          reject(new Error(`Speech recognition error: ${event.error}`));
        };

        recognition.onend = () => {
          clearTimeout(timeout);
          if (speechEndTimer) clearTimeout(speechEndTimer);
          console.log(`Speech recognition ended (${lang}):`, finalTranscript);
          if (finalTranscript.trim().length > 0) {
            resolve(finalTranscript.trim());
          } else {
            reject(new Error(`No speech detected in ${lang}`));
          }
        };
        
        // Start listening for audio
        recognition.onstart = () => {
          console.log(`Started listening for ${lang}`);
        };
        
        recognition.onspeechstart = () => {
          console.log(`Speech detected for ${lang}`);
        };
        
        recognition.onspeechend = () => {
          console.log(`Speech ended for ${lang} - waiting for processing...`);
          // Wait 2 seconds after speech ends before stopping to allow processing
          speechEndTimer = setTimeout(() => {
            recognition.stop();
          }, 2000);
        };
        
        recognition.onaudiostart = () => {
          console.log(`Audio input started for ${lang}`);
        };
        
        recognition.onaudioend = () => {
          console.log(`Audio input ended for ${lang}`);
        };
        
        recognition.start();
        
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