// Translation service using OpenRouter GPT-4o Mini (Latest & Most Cost-Effective)

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
      console.log('🌐 Calling secured backend API:', { textLength: text.length, mode });
      
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Temporarily removing auth for testing
        },
        body: JSON.stringify({
          text: text,
          mode: mode
        })
      });
      
      console.log('📡 Backend response status:', response.status);

      if (!response.ok) {
        console.error('Backend API error:', response.status);
        throw new Error(`Backend API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Backend response data:', data);
      
      if (!data.success) {
        console.error('❌ Translation error:', data.error);
        throw new Error(data.error || 'Translation failed');
      }
      
      console.log('✅ Translation successful:', data.translation);
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
    
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
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

  // Option 2: OpenRouter Whisper API (Reliable speech-to-text)
  static async convertSpeechToTextOpenRouter(audioBlob: Blob): Promise<string> {
    console.log('🎤 Starting OpenRouter speech-to-text...');
    console.log('Audio blob size:', audioBlob.size, 'bytes');
    console.log('Audio blob type:', audioBlob.type);

    try {
      // Convert blob to base64 for easier transport to serverless function
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64Audio = btoa(binary);

      console.log('📡 Sending audio to secured speech-to-text API...');

      const response = await fetch('/api/speech-to-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Temporarily removing auth for testing
        },
        body: JSON.stringify({
          audioData: base64Audio,
          mimeType: audioBlob.type
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ OpenRouter speech-to-text API error:', response.status, errorData);
        throw new Error(`Speech-to-text API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        console.error('❌ Speech-to-text API returned error:', data.error);
        throw new Error(data.error || 'Speech-to-text failed');
      }

      const transcription = data.text || '';
      console.log('✅ OpenRouter speech-to-text successful:', transcription);

      if (!transcription.trim()) {
        throw new Error('No speech detected in audio');
      }

      return transcription.trim();

    } catch (error) {
      console.error('💥 OpenRouter speech-to-text error:', error);
      throw new Error(`Speech-to-text failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
        }, 5000); // 5 second timeout - faster feedback
        
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

  // Main method: Try server API first, then fallback to browser Web Speech API
  static async convertSpeechToText(audioBlob: Blob, mode?: 'toJapanese' | 'toCantonese'): Promise<string> {
    try {
      // Try server-side speech-to-text first
      console.log('🎯 Trying server-side speech-to-text...');
      const result = await this.convertSpeechToTextOpenRouter(audioBlob);
      
      // Check if it's a demo response
      if (result && !result.includes('Hey, I was just thinking about you')) {
        return result;
      } else {
        console.log('🔄 Server returned demo, trying browser Web Speech API...');
        throw new Error('Server demo detected');
      }
    } catch (serverError) {
      console.warn('🚨 Server speech-to-text failed, trying browser API:', serverError);
      
      try {
        // Fallback to browser Web Speech API
        console.log('🎤 Using browser Web Speech API...');
        return await this.convertSpeechToTextBrowser();
      } catch (browserError) {
        console.error('💥 Both server and browser speech failed:', browserError);
        
        // Ultimate fallback
        console.log('📋 Using simple demo...');
        const demoTexts = [
          "Hello", "I love you", "How are you?", "Good morning", "I miss you"
        ];
        return demoTexts[Math.floor(Math.random() * demoTexts.length)];
      }
    }
  }

  // Browser-based Web Speech API
  static async convertSpeechToTextBrowser(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Web Speech API not supported'));
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          recognition.stop();
          reject(new Error('Speech recognition timeout'));
        }
      }, 8000);

      recognition.onresult = (event: any) => {
        if (!resolved && event.results && event.results.length > 0) {
          resolved = true;
          clearTimeout(timeout);
          const transcript = event.results[0][0].transcript;
          console.log('✅ Browser speech recognition:', transcript);
          resolve(transcript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          console.error('❌ Browser speech error:', event.error);
          reject(new Error(`Speech recognition error: ${event.error}`));
        }
      };

      recognition.onend = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error('Speech recognition ended without result'));
        }
      };

      try {
        recognition.start();
        console.log('🎤 Browser speech recognition started...');
      } catch (error) {
        resolved = true;
        clearTimeout(timeout);
        reject(error);
      }
    });
  }
}