export interface Track {
  id: string;
  name: string;
  type: 'synth' | 'drum' | 'audio';
  audioBuffer: AudioBuffer | null;
  volume: number;
  pan: number;
  muted: boolean;
  soloed: boolean;
  effects: Effect[];
  notes: Note[];
  synthSettings?: SynthSettings;
  drumPattern?: DrumPattern;
}

export interface Note {
  id: string;
  note: string;
  octave: number;
  start: number;
  duration: number;
  velocity: number;
}

export interface SynthSettings {
  waveform: 'sine' | 'square' | 'sawtooth' | 'triangle';
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  filterFreq: number;
  filterQ: number;
}

export interface DrumPattern {
  steps: DrumStep[];
  length: number;
}

export interface DrumStep {
  kick: boolean;
  snare: boolean;
  hihat: boolean;
  openhat: boolean;
  crash: boolean;
  velocity: number;
}

export interface Effect {
  id: string;
  name: string;
  type: 'reverb' | 'distortion' | 'delay' | 'filter';
  enabled: boolean;
  parameters: { [key: string]: number };
}

export interface DAWState {
  isPlaying: boolean;
  isRecording: boolean;
  currentTime: number;
  bpm: number;
  tracks: Track[];
  masterVolume: number;
}

export interface AudioFile {
  file: File;
  name: string;
  duration: number;
}

export interface ProjectFile {
  name: string;
  version: string;
  created: string;
  modified: string;
  bpm: number;
  masterVolume: number;
  tracks: ProjectTrack[];
}

export interface ProjectTrack {
  id: string;
  name: string;
  type: 'synth' | 'drum' | 'audio';
  volume: number;
  pan: number;
  muted: boolean;
  soloed: boolean;
  notes: Note[];
  synthSettings?: SynthSettings;
  drumPattern?: DrumPattern;
  effects: Effect[];
}