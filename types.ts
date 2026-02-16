
export interface Message {
  id: string;
  role: 'user' | 'bondhu';
  text: string;
  timestamp: Date;
  groundingChunks?: any[];
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

export interface VoiceOption {
  id: string;
  name: string;
  label: string;
}
