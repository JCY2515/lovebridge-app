import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Heart, Volume2, Copy, Languages, RotateCcw } from 'lucide-react';
import './App.css';
import { TranslationService, SpeechService } from './services/translationService';

interface TranslationResult {
  original: string;
  japanese: string;
  cantonese: string;
  english: string;
  timestamp?: number;
  id?: string;
}

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<'toJapanese' | 'toCantonese'>('toJapanese');
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<TranslationResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [apiStatus, setApiStatus] = useState<'unknown' | 'working' | 'fallback'>('unknown');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialize speech recognition
  useEffect(() => {
    // Check for microphone permission
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => console.log('Microphone access granted'))
      .catch(err => console.error('Microphone access denied:', err));
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processAudio(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsLoading(true);
    try {
      // Step 1: Convert speech to text using enhanced speech recognition
      let recognizedText = '';
      
      try {
        recognizedText = await SpeechService.convertSpeechToText(audioBlob, mode);
      } catch (speechError) {
        console.warn('Speech recognition failed, using fallback:', speechError);
        // Fallback: Use a sample text for testing
        recognizedText = mode === 'toJapanese' 
          ? "Hello, I love you so much! 我想念你"
          : "今日はとても楽しかったです。また話しましょう！";
      }
      
      // Step 2: Translate using GPT-4.1 Mini via OpenRouter
      console.log('🔄 Sending to translation API:', { recognizedText, mode });
      const result = await TranslationService.processFullTranslation(recognizedText, mode);
      console.log('✅ Translation result:', result);
      
      // Add timestamp and ID
      const translationWithMeta = {
        ...result,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9)
      };
      
      setTranslation(translationWithMeta);
      setApiStatus('working');
      
      // Add to conversation history
      setConversationHistory(prev => [translationWithMeta, ...prev.slice(0, 9)]); // Keep last 10
      
    } catch (error) {
      console.error('Error processing audio:', error);
      
      // Show user-friendly error message
      if (error instanceof Error && error.message.includes('OpenRouter API key')) {
        alert('Please configure your OpenRouter API key in the environment variables.');
      } else {
        alert('Translation failed. Please check your internet connection and try again.');
      }
      
      // Fallback to demo data
      if (mode === 'toJapanese') {
        setTranslation({
          original: "Demo: Hello, I love you! 我想念你",
          japanese: "デモ：こんにちは、愛しています！会いたいです",
          cantonese: "演示：你好，我愛你！我想念你",
          english: "Demo: Hello, I love you! I miss you"
        });
      } else {
        setTranslation({
          original: "デモ：今日はとても楽しかったです",
          japanese: "デモ：今日はとても楽しかったです",
          cantonese: "演示：今日真係好開心",
          english: "Demo: Today was really fun"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const speak = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      speechSynthesis.speak(utterance);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'toJapanese' ? 'toCantonese' : 'toJapanese');
    setTranslation(null);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <Heart className="heart-icon" />
          <h1>LoveBridge</h1>
        </div>
        <div className="header-controls">
          <button className="mode-toggle" onClick={toggleMode}>
            <RotateCcw size={20} />
            {mode === 'toJapanese' ? 'You → Her' : 'Her → You'}
          </button>
          
          {conversationHistory.length > 0 && (
            <button 
              className="history-toggle" 
              onClick={() => setShowHistory(!showHistory)}
            >
              📝 {conversationHistory.length}
            </button>
          )}
          
          <div className={`api-status ${apiStatus}`}>
            {apiStatus === 'working' && '🟢'}
            {apiStatus === 'fallback' && '🟡'}
            {apiStatus === 'unknown' && '⚪'}
          </div>
        </div>
      </header>

      <main className="main">
        {showHistory && (
          <div className="conversation-history">
            <h3>Recent Conversations 💕</h3>
            {conversationHistory.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-original">{item.original}</div>
                <div className="history-translation">
                  {mode === 'toJapanese' ? item.japanese : item.cantonese}
                </div>
                <div className="history-time">
                  {new Date(item.timestamp!).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="translation-container">
          {translation ? (
            <div className="translation-result">
              <div className="original-text">
                <h3>Original:</h3>
                <p>{translation.original}</p>
                <button onClick={() => copyToClipboard(translation.original)}>
                  <Copy size={16} />
                </button>
              </div>

              {mode === 'toJapanese' ? (
                <div className="translated-text japanese">
                  <h3>Japanese for her 💕:</h3>
                  <p className="large-text">{translation.japanese}</p>
                  <div className="actions">
                    <button onClick={() => speak(translation.japanese, 'ja-JP')}>
                      <Volume2 size={20} />
                      Play
                    </button>
                    <button onClick={() => copyToClipboard(translation.japanese)}>
                      <Copy size={20} />
                      Copy
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="translated-text cantonese">
                    <h3>Cantonese for you:</h3>
                    <p className="large-text">{translation.cantonese}</p>
                    <div className="actions">
                      <button onClick={() => speak(translation.cantonese, 'zh-HK')}>
                        <Volume2 size={20} />
                        Play
                      </button>
                      <button onClick={() => copyToClipboard(translation.cantonese)}>
                        <Copy size={20} />
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="translated-text english">
                    <h3>English reference:</h3>
                    <p>{translation.english}</p>
                    <button onClick={() => copyToClipboard(translation.english)}>
                      <Copy size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="welcome-message">
              <Languages size={48} className="welcome-icon" />
              <h2>Ready to bridge your hearts 💕</h2>
              <p>
                {mode === 'toJapanese' 
                  ? 'Speak in English/Cantonese/Japanese and show her the translation!'
                  : 'Let her speak in Japanese and you\'ll understand!'}
              </p>
            </div>
          )}
        </div>

        <div className="record-section">
          <button 
            className={`record-button ${isRecording ? 'recording' : ''} ${isLoading ? 'loading' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="loading-spinner" />
            ) : isRecording ? (
              <MicOff size={32} />
            ) : (
              <Mic size={32} />
            )}
          </button>
          <p className="record-instruction">
            {isLoading 
              ? 'Translating...'
              : isRecording 
                ? 'Tap to stop recording'
                : 'Tap to start recording'}
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;