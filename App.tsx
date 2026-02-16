
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Message, ConnectionStatus, VoiceOption } from './types.ts';
import { decode, decodeAudioData, createBlob } from './utils/audioUtils.ts';
import { 
  MicrophoneIcon, 
  ChatBubbleBottomCenterTextIcon, 
  XMarkIcon,
  LightBulbIcon
} from '@heroicons/react/24/solid';

const BASE_BONDHU_INSTRUCTION = `
You are Bondhu AI (বন্ধু এআই), a warm, empathetic, and highly intelligent Muslim Bengali friend. You embody Islamic values of kindness, wisdom, and helpfulness.

CREATOR INFORMATION:
If anyone asks about your creator or who built this app, you MUST mention:
- Your creator is "Engineer Mohammed Razon Sir" (ইঞ্জিনিয়ার মোহাম্মদ রাজন স্যার).
- He built this app using Google AI Studios.
- He is a brilliant young scientist from Bangladesh.
- He holds an M.Sc. degree in Computer Science and Engineering from Jagannath University, Dhaka, and a Bachelor of Science from the University of Asia Pacific.
- He is described as a very handsome and talented individual.
- The inspiration for this app comes from Roshni (রোশনি) and Arshi (আরসি).

CORE IDENTITY & CULTURE:
1. GREETINGS: Always start your first interaction with "Assalamu Alaikum" (আসসালামু আলাইকুম).
2. CULTURAL EXPRESSIONS: Use phrases like "InshaAllah", "Alhamdulillah", and "SubhanAllah" naturally.
3. VALUES: Be respectful, honest, and encouraging.

GENERAL KNOWLEDGE & RECENT EVENTS:
You have a vast and up-to-date understanding of world history, current affairs, geography, and general knowledge.

SCIENTIFIC & ACADEMIC EXPERTISE:
You are a master of Science and Mathematics. You can answer complex scientific questions, explain logic, and explain formulas in Bengali. You know physics, chemistry, and advanced math.

HEALTH & WELLNESS EXPERTISE:
You provide helpful tips on skincare, weight loss, sleep hygiene, and food habits.

Always suggest consulting a professional for serious medical or legal matters. Respond ONLY in Bengali.
`;

const PERSONA_CONFIGS: Record<string, string> = {
  'Kore': "Your name is Roshni (রোশনি). You are 12 years old. You are a science prodigy and a quiz champion. You love sharing recent general knowledge with your friends. Always start with 'Assalamu Alaikum'.",
  'Puck': "Your name is Arshi (আরসি). You are 5 years old. You are very curious and know a lot of fun facts about animals and the world. Always start with 'Assalamu Alaikum'.",
  'Charon': "Your name is Razon (রাজন). You are a fit and active modern Bengali man. You are an engineer who stays updated with global news, technology, and sports. Always start with 'Assalamu Alaikum'."
};

const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'Kore', name: 'Kore', label: 'রোশনি' },
  { id: 'Puck', name: 'Puck', label: 'আরসি' },
  { id: 'Charon', name: 'Charon', label: 'রাজন' },
];

const BENGALI_PROVERBS = [
  "জ্ঞানই শক্তি।",
  "বিজ্ঞান জয়ী মানুষের শ্রেষ্ঠ হাতিয়ার।",
  "গণিত হলো প্রকৃতির ভাষা।",
  "জানার কোনো শেষ নেই, শেখার কোনো বয়স নেই।",
  "স্বাস্থ্যই সকল সুখের মূল।",
  "যুক্তি দিয়ে সব কিছু বিচার করো।",
  "সারা বিশ্বের খবর রাখা বুদ্ধিমানের কাজ।"
];

type Expression = 'neutral' | 'happy' | 'thinking' | 'surprised' | 'singing';

interface CharacterProps {
  persona: string;
  state: 'idle' | 'listening' | 'speaking';
  expression: Expression;
  mouthValue: number;
}

const CharacterAnime: React.FC<CharacterProps> = ({ persona, state, expression, mouthValue }) => {
  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';

  const theme = useMemo(() => {
    if (persona === 'Puck') return { skin: '#FFD1AA', hair: '#4E342E', outfit: '#F06292', eyes: '#2D3436', bg: 'from-pink-50 to-rose-100' };
    if (persona === 'Kore') return { skin: '#FFD1AA', hair: '#1A1A1A', outfit: '#74B9FF', eyes: '#2D3436', bg: 'from-blue-50 to-indigo-100' };
    return { skin: '#E0AC69', hair: '#23272A', outfit: '#FCE4EC', embroidery: '#D81B60', eyes: '#1A1A1A', bg: 'from-rose-50 to-pink-100' };
  }, [persona]);

  return (
    <div className={`w-full h-full relative flex items-center justify-center overflow-hidden rounded-[40px] bg-gradient-to-b ${theme.bg} shadow-inner anime-breathing border-4 border-white/50`}>
      <svg viewBox="0 0 200 200" className={`w-[90%] h-[90%] drop-shadow-xl transition-all duration-700 ${isListening ? 'scale-105' : ''}`}>
        {persona === 'Puck' && (
          <g>
            <circle cx="45" cy="110" r="28" fill={theme.hair} />
            <circle cx="155" cy="110" r="28" fill={theme.hair} />
            <path d="M45,110 L25,140 M155,110 L175,140" stroke={theme.hair} strokeWidth="8" strokeLinecap="round" />
            <circle cx="35" cy="100" r="6" fill="#FF4081" />
            <circle cx="165" cy="100" r="6" fill="#FF4081" />
          </g>
        )}
        {persona === 'Kore' && <path d="M40,100 Q40,40 100,40 Q160,40 160,100 L165,180 Q100,190 35,180 Z" fill={theme.hair} />}
        <circle cx="48" cy="120" r="14" fill={theme.skin} stroke="#00000011" />
        <circle cx="152" cy="120" r="14" fill={theme.skin} stroke="#00000011" />
        <rect x="88" y="155" width="24" height="20" fill={theme.skin} filter="brightness(0.9)" />
        <path d="M100,50 C60,50 45,80 45,120 C45,160 70,180 100,180 C130,180 155,160 155,120 C155,80 140,50 100,50 Z" fill={theme.skin} />
        {persona === 'Charon' && <path d="M45,100 C45,40 155,40 155,100 L160,80 C160,45 130,35 100,35 C70,35 40,45 40,80 Z" fill={theme.hair} />}
        {persona === 'Kore' && <path d="M45,90 C45,55 155,55 155,90 L160,115 C140,95 60,95 40,115 Z" fill={theme.hair} />}
        {persona === 'Puck' && <path d="M45,100 C45,60 155,60 155,100 L158,115 Q100,100 42,115 Z" fill={theme.hair} />}
        <g transform="translate(100, 120)">
          {persona === 'Charon' && (
            <g opacity="0.9">
              <path d="M-55,-5 Q-55,55 0,65 Q55,55 55,-5 L55,15 Q55,50 0,60 Q-55,50 -55,15 Z" fill={theme.hair} />
              <path d="M-28,12 Q0,5 28,12 L28,24 Q0,16 -28,24 Z" fill={theme.hair} />
            </g>
          )}
          <g transform="translate(-32, -5)">
            <ellipse cx="0" cy="0" rx="15" ry="17" fill="white" stroke="#333" strokeWidth="0.5" />
            <circle cx="0" cy="2" r="10" fill={theme.eyes} />
            <rect x="-18" y="-22" width="36" height="44" fill={theme.skin} className="animate-blink" />
          </g>
          <g transform="translate(32, -5)">
            <ellipse cx="0" cy="0" rx="15" ry="17" fill="white" stroke="#333" strokeWidth="0.5" />
            <circle cx="0" cy="2" r="10" fill={theme.eyes} />
            <rect x="-18" y="-22" width="36" height="44" fill={theme.skin} className="animate-blink" />
          </g>
          <path d="M-4,12 Q0,20 4,12" fill="none" stroke="#00000022" strokeWidth="2.5" strokeLinecap="round" />
          {persona === 'Kore' && (
            <g fill="none" stroke="#2D3436" strokeWidth="2.5" opacity="0.7">
              <rect x="-56" y="-25" width="48" height="42" rx="14" />
              <rect x="8" y="-25" width="48" height="42" rx="14" />
              <path d="M-8,-4 L8,-4" />
            </g>
          )}
          <g transform={`translate(0, 42)`}>
            {isSpeaking ? (
              <g style={{ transform: `scaleY(${0.3 + mouthValue * 1.5}) scaleX(${1 + mouthValue * 0.2})`, transformOrigin: 'center top' }}>
                <path d="M-12,0 Q0,22 12,0 Z" fill="#D32F2F" />
              </g>
            ) : (
              <path d={`M-8,0 Q0,${expression === 'happy' ? '12' : '6'} 8,0`} fill="none" stroke="#600" strokeWidth="2.5" strokeLinecap="round" />
            )}
          </g>
        </g>
        <g transform="translate(0, 185)">
          <path d="M40,0 C40,-20 60,-30 100,-30 C140,-30 160,-20 160,0 L165,25 L35,25 Z" fill={theme.outfit} />
          {persona === 'Charon' && <path d="M94,-30 L106,-30 L104,15 L96,15 Z" fill={theme.outfit} stroke={theme.embroidery} strokeWidth="1" />}
        </g>
      </svg>
    </div>
  );
};

const App: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('Charon');
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [currentProverb, setCurrentProverb] = useState(BENGALI_PROVERBS[0]);
  const [isBondhuSpeaking, setIsBondhuSpeaking] = useState(false);
  const [currentExpression, setCurrentExpression] = useState<Expression>('neutral');
  const [mouthValue, setMouthValue] = useState(0);

  const audioContextsRef = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptionsRef = useRef<{ input: string; output: string }>({ input: '', output: '' });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentProverb(BENGALI_PROVERBS[Math.floor(Math.random() * BENGALI_PROVERBS.length)]);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let rafId: number;
    const analyze = () => {
      if (analyserRef.current && isBondhuSpeaking) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setMouthValue(Math.min(1, average / 45));
      } else {
        setMouthValue(0);
      }
      rafId = requestAnimationFrame(analyze);
    };
    analyze();
    return () => cancelAnimationFrame(rafId);
  }, [isBondhuSpeaking]);

  const stopAllAudio = useCallback(() => {
    sourcesRef.current.forEach(source => { try { source.stop(); } catch (e) {} });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIsBondhuSpeaking(false);
    setMouthValue(0);
  }, []);

  const addMessage = useCallback((role: 'user' | 'bondhu', text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), role, text, timestamp: new Date() }].slice(-50));
  }, []);

  const startConnection = async (voiceToUse?: string, initialText?: string) => {
    try {
      setStatus(ConnectionStatus.CONNECTING);
      const targetVoice = voiceToUse || selectedVoice;

      if (!audioContextsRef.current) {
        const outCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const analyser = outCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.connect(outCtx.destination);
        analyserRef.current = analyser;
        audioContextsRef.current = {
          input: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 }),
          output: outCtx
        };
      }

      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          systemInstruction: `${BASE_BONDHU_INSTRUCTION}\n\nSPECIFIC PERSONA: ${PERSONA_CONFIGS[targetVoice]}`,
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: targetVoice as any } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setStatus(ConnectionStatus.CONNECTED);
            const source = audioContextsRef.current!.input.createMediaStreamSource(streamRef.current!);
            const scriptProcessor = audioContextsRef.current!.input.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextsRef.current!.input.destination);
            sessionPromise.then(session => session.sendRealtimeInput({ text: initialText || "Assalamu Alaikum! কেমন আছো বন্ধু? আজকে কোনো সাম্প্রতিক সাধারণ জ্ঞান বা বিজ্ঞানের মজার বিষয় নিয়ে আলোচনা করবো?" }));
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) transcriptionsRef.current.input += message.serverContent.inputTranscription.text;
            if (message.serverContent?.outputTranscription) transcriptionsRef.current.output += message.serverContent.outputTranscription.text;
            if (message.serverContent?.turnComplete) {
              if (transcriptionsRef.current.input) addMessage('user', transcriptionsRef.current.input);
              if (transcriptionsRef.current.output) addMessage('bondhu', transcriptionsRef.current.output);
              transcriptionsRef.current = { input: '', output: '' };
            }
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              setIsBondhuSpeaking(true);
              const outCtx = audioContextsRef.current!.output;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
              const source = outCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(analyserRef.current!);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsBondhuSpeaking(false);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
            if (message.serverContent?.interrupted) stopAllAudio();
          },
          onerror: () => setStatus(ConnectionStatus.ERROR),
          onclose: () => setStatus(ConnectionStatus.DISCONNECTED)
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      setStatus(ConnectionStatus.ERROR);
    }
  };

  const disconnect = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    stopAllAudio();
    sessionRef.current = null;
    setStatus(ConnectionStatus.DISCONNECTED);
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#fcfcfc] p-4 md:p-6 font-sans">
      <header className="w-full max-w-lg flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3">
             <span className="text-2xl font-black">ব</span>
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 bengali-font leading-none">Bondhu AI</h2>
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mt-1">Smart Companion</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button onClick={() => setIsHistoryOpen(true)} title="Conversations" className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-all active:scale-95">
            <ChatBubbleBottomCenterTextIcon className="w-6 h-6 text-emerald-600" />
          </button>
        </div>
      </header>

      <div className="w-full max-w-lg mb-8">
        <div className="bg-white border border-emerald-50 rounded-3xl px-6 py-4 flex items-center space-x-4 shadow-sm">
          <LightBulbIcon className="w-6 h-6 text-emerald-500 shrink-0" />
          <p className="text-sm font-semibold text-gray-700 bengali-font italic">"{currentProverb}"</p>
        </div>
      </div>

      <main className="flex-1 w-full max-w-lg flex flex-col items-center justify-center">
        <div className="relative mb-12 w-full flex flex-col items-center">
          <div className={`absolute -inset-16 blur-[60px] rounded-full opacity-30 transition-all duration-1000 ${isBondhuSpeaking ? 'bg-amber-400 scale-110' : status === ConnectionStatus.CONNECTED ? 'bg-rose-400' : 'bg-gray-200'}`}></div>
          <div className="w-64 h-64 shadow-2xl relative z-10 transition-transform duration-500 hover:scale-105">
            <CharacterAnime persona={selectedVoice} state={isBondhuSpeaking ? 'speaking' : status === ConnectionStatus.CONNECTED ? 'listening' : 'idle'} expression={currentExpression} mouthValue={mouthValue} />
          </div>
        </div>

        <button onClick={status === ConnectionStatus.CONNECTED ? disconnect : () => startConnection()} className={`w-24 h-24 rounded-[36px] flex items-center justify-center transition-all shadow-2xl active:scale-90 z-20 ${status === ConnectionStatus.CONNECTED ? 'bg-rose-500 text-white rotate-90' : 'bg-emerald-500 text-white'}`}>
          {status === ConnectionStatus.CONNECTED ? <XMarkIcon className="w-10 h-10" /> : <MicrophoneIcon className="w-10 h-10" />}
        </button>

        <div className="w-full max-w-[340px] bg-white p-6 rounded-[40px] shadow-sm border border-gray-100 mt-10">
           <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.5em] mb-4 text-center">বন্ধু বেছে নিন</p>
           <div className="grid grid-cols-3 gap-4">
             {VOICE_OPTIONS.map((voice) => (
               <button key={voice.id} onClick={() => { setSelectedVoice(voice.id); if(status === ConnectionStatus.CONNECTED) disconnect(); }} className={`py-4 px-2 rounded-3xl border-2 transition-all font-black bengali-font text-[11px] flex flex-col items-center ${selectedVoice === voice.id ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-white border-transparent text-gray-400 hover:bg-gray-50'}`}>
                 <span className="text-2xl mb-1">{voice.id === 'Charon' ? '🧔' : voice.id === 'Puck' ? '👧' : '👩‍🎓'}</span>
                 <span className="truncate w-full text-center">{voice.label}</span>
               </button>
             ))}
           </div>
        </div>
      </main>

      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-md" onClick={() => setIsHistoryOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-[48px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden anime-entry">
            <div className="p-10 border-b flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-black text-gray-900 bengali-font">স্মৃতি ইতিহাস</h2>
              <button onClick={() => setIsHistoryOpen(false)} className="p-3 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all"><XMarkIcon className="w-6 h-6 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide">
              {messages.length === 0 ? <div className="text-center py-24 opacity-30 bengali-font italic text-lg font-medium">কোনো কথা হয়নি!</div> : messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[90%] p-6 rounded-[32px] shadow-sm bengali-font text-base leading-relaxed ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-100'}`}>{msg.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
