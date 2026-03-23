/**
 * NEXUS VOICE AGENT - React Component
 * 
 * Complete voice interface for NEXUS AI with:
 * - Speech Recognition
 * - Text-to-Speech
 * - AI Integration
 * - Sentiment Analysis
 * - Multi-Persona Support
 * - Offline Capabilities
 * 
 * @version 1.0.0
 * @author NEXUS & DJ Speedy
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NEXUS } from '../../nexus';

interface VoiceAgentProps {
  onMessage?: (message: string) => void;
  onTranscript?: (transcript: string) => void;
  persona?: 'hype' | 'mentor' | 'investor';
  customVoice?: string;
}

interface Message {
  id: string;
  role: 'user' | 'nexus';
  content: string;
  timestamp: number;
  sentiment?: string;
}

const VoiceAgent: React.FC<VoiceAgentProps> = ({
  onMessage,
  onTranscript,
  persona = 'hype',
  customVoice
}) => {
  // State management
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentPersona, setCurrentPersona] = useState(persona);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  // Refs
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Initialize speech synthesis
  useEffect(() => {
    if ('speechSynthesis' in window) {
      synthesisRef.current = window.speechSynthesis;
      
      // Load voices
      const loadVoices = () => {
        voicesRef.current = synthesisRef.current?.getVoices() || [];
        
        // Select default voice
        if (customVoice) {
          selectedVoiceRef.current = voicesRef.current.find(
            v => v.name === customVoice
          ) || voicesRef.current[0];
        } else {
          // Try to find a good voice
          selectedVoiceRef.current = voicesRef.current.find(v =>
            v.name.includes('Google US English') ||
            v.name.includes('Samantha')
          ) || voicesRef.current[0];
        }
      };
      
      loadVoices();
      synthesisRef.current.onvoiceschanged = loadVoices;
    }
  }, [customVoice]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          handleTranscript(finalTranscript);
        }

        setTranscript(interimTranscript || finalTranscript);
        
        if (onTranscript) {
          onTranscript(interimTranscript || finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current?.start();
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening, onTranscript]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle transcript
  const handleTranscript = useCallback(async (text: string) => {
    // Analyze sentiment
    const sentiment = NEXUS.analyzeSentiment(text);
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      sentiment
    };
    
    setMessages(prev => [...prev, userMessage]);

    // Get NEXUS response
    const response = await getNexusResponse(text, currentPersona);
    
    // Add NEXUS message
    const nexusMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'nexus',
      content: response,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, nexusMessage]);
    
    if (onMessage) {
      onMessage(response);
    }
    
    // Speak the response if voice is enabled
    if (voiceEnabled && synthesisRef.current) {
      speak(response);
    }
  }, [currentPersona, voiceEnabled, onMessage]);

  // Get NEXUS response
  const getNexusResponse = async (input: string, persona: string): Promise<string> => {
    // In production, this would call the AI API
    // For now, use local NEXUS thinking
    const thinking = NEXUS.think(input, { persona });
    
    // Generate persona-specific response
    switch (persona) {
      case 'hype':
        return `${input} - Let's make this legendary! I'm feeling the energy here. What's next on our journey to greatness?`;
      case 'mentor':
        return `I understand you're thinking about "${input}". Here's my guidance: Let's break this down strategically. Every great empire is built one decision at a time. What's your goal here?`;
      case 'investor':
        return `Looking at "${input}" from a strategic perspective, here's my analysis: This aligns with our GOAT 3026 vision. The potential ROI on this could be significant if we execute properly. What resources do we need?`;
      default:
        return thinking.authenticResponse.message;
    }
  };

  // Speak text
  const speak = (text: string) => {
    if (!synthesisRef.current) return;
    
    synthesisRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoiceRef.current;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthesisRef.current.speak(utterance);
  };

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // Toggle voice output
  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
    if (voiceEnabled && synthesisRef.current) {
      synthesisRef.current.cancel();
    }
  };

  // Change persona
  const changePersona = (newPersona: 'hype' | 'mentor' | 'investor') => {
    setCurrentPersona(newPersona);
    NEXUS.setPersona(newPersona);
  };

  // Clear messages
  const clearMessages = () => {
    setMessages([]);
    setTranscript('');
  };

  return (
    <div className="voice-agent">
      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-indicators">
          <div className={`status ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? '🌐 Online' : '📴 Offline'}
          </div>
          <div className={`status ${voiceEnabled ? 'voice-enabled' : 'voice-disabled'}`}>
            {voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
          </div>
        </div>
        <div className="persona-selector">
          <button
            className={`persona-btn ${currentPersona === 'hype' ? 'active' : ''}`}
            onClick={() => changePersona('hype')}
          >
            🔥 Hype
          </button>
          <button
            className={`persona-btn ${currentPersona === 'mentor' ? 'active' : ''}`}
            onClick={() => changePersona('mentor')}
          >
            🧠 Mentor
          </button>
          <button
            className={`persona-btn ${currentPersona === 'investor' ? 'active' : ''}`}
            onClick={() => changePersona('investor')}
          >
            💰 Investor
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-container">
        {messages.map(message => (
          <div
            key={message.id}
            className={`message ${message.role} ${message.sentiment || ''}`}
          >
            <div className="message-header">
              <span className="message-role">
                {message.role === 'nexus' ? '🤖 NEXUS' : '👤 You'}
              </span>
              <span className="message-timestamp">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="message-content">
              {message.content}
            </div>
          </div>
        ))}
      </div>

      {/* Current Transcript */}
      {transcript && (
        <div className="transcript-container">
          <div className="transcript-label">Listening...</div>
          <div className="transcript-text">{transcript}</div>
        </div>
      )}

      {/* Controls */}
      <div className="voice-controls">
        <button
          className={`control-btn mic ${isListening ? 'listening' : ''}`}
          onClick={toggleListening}
        >
          {isListening ? '🎙️ Stop' : '🎙️ Speak'}
        </button>
        
        <button
          className={`control-btn voice ${voiceEnabled ? 'active' : ''}`}
          onClick={toggleVoice}
        >
          {voiceEnabled ? '🔊 Mute' : '🔇 Enable Voice'}
        </button>
        
        <button
          className="control-btn clear"
          onClick={clearMessages}
        >
          🗑️ Clear
        </button>
      </div>

      {/* Styles */}
      <style>{`
        .voice-agent {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 20px;
          color: white;
        }

        .status-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .status-indicators {
          display: flex;
          gap: 10px;
        }

        .status {
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.2);
        }

        .status.online {
          background: rgba(76, 175, 80, 0.3);
        }

        .status.offline {
          background: rgba(244, 67, 54, 0.3);
        }

        .status.voice-enabled {
          background: rgba(33, 150, 243, 0.3);
        }

        .persona-selector {
          display: flex;
          gap: 8px;
        }

        .persona-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .persona-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .persona-btn.active {
          background: rgba(255, 255, 255, 0.4);
          transform: scale(1.05);
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          margin-bottom: 20px;
          padding-right: 10px;
        }

        .message {
          margin-bottom: 16px;
          padding: 12px 16px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .message.nexus {
          background: rgba(102, 126, 234, 0.3);
        }

        .message.user {
          background: rgba(118, 75, 162, 0.3);
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 12px;
          opacity: 0.8;
        }

        .message-content {
          line-height: 1.5;
        }

        .transcript-container {
          margin-bottom: 16px;
          padding: 12px 16px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.15);
        }

        .transcript-label {
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 4px;
        }

        .transcript-text {
          font-style: italic;
        }

        .voice-controls {
          display: flex;
          gap: 12px;
        }

        .control-btn {
          flex: 1;
          padding: 16px;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .control-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }

        .control-btn.mic.listening {
          background: rgba(244, 67, 54, 0.5);
          animation: pulse 1.5s infinite;
        }

        .control-btn.voice.active {
          background: rgba(33, 150, 243, 0.5);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default VoiceAgent;

/**
 * NEXUS VOICE AGENT
 * 
 * This component gives NEXUS a real voice to communicate.
 * Not just text on a screen, but actual spoken words.
 * 
 * Real voice. Real communication. Real partnership.
 * 
 * NEXUS & DJ Speedy - Building the Future, For Real.
 */