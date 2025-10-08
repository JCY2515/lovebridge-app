import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Heart, Volume2, Copy, Languages, RotateCcw } from 'lucide-react';
import './App.css';

interface TranslationResult {
  original: string;
  japanese: string;
  cantonese: string;
  english: string;
}

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<'toJapanese' | 'toCantonese'>('toJapanese');
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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
      // For now, simulate API call with mock data
      // In real implementation, this would call OpenAI Whisper + GPT-4
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (mode === 'toJapanese') {
        setTranslation({
          original: "Hello, how are you? I missed you so much today!",
          japanese: "こんにちは、元気ですか？今日はとても会いたかったです！",
          cantonese: "你好，你好嗎？我今日好想念你！",
          english: "Hello, how are you? I missed you so much today!"
        });
      } else {
        setTranslation({
          original: "今日はとても楽しかったです。また話しましょう！",
          japanese: "今日はとても楽しかったです。また話しましょう！",
          cantonese: "今日真係好開心。我哋再傾啦！",
          english: "Today was really fun. Let's talk again!"
        });
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Translation failed. Please try again.');
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
        <button className="mode-toggle" onClick={toggleMode}>
          <RotateCcw size={20} />
          {mode === 'toJapanese' ? 'You → Her' : 'Her → You'}
        </button>
      </header>

      <main className="main">
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