'use client';

import { SynthSettings } from '../types/audio';

export class Synthesizer {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private activeNotes: Map<string, SynthVoice> = new Map();

  constructor(audioContext: AudioContext, masterGain: GainNode) {
    this.audioContext = audioContext;
    this.masterGain = masterGain;
  }

  playNote(
    note: string,
    octave: number,
    velocity: number = 1,
    duration?: number,
    settings: SynthSettings = this.getDefaultSettings()
  ) {
    const frequency = this.noteToFrequency(note, octave);
    const noteKey = `${note}${octave}`;
    
    // Stop existing note if playing
    if (this.activeNotes.has(noteKey)) {
      this.stopNote(note, octave);
    }

    const voice = new SynthVoice(this.audioContext, settings);
    voice.connect(this.masterGain);
    voice.start(frequency, velocity);
    
    this.activeNotes.set(noteKey, voice);

    if (duration) {
      setTimeout(() => {
        this.stopNote(note, octave);
      }, duration * 1000);
    }
  }

  stopNote(note: string, octave: number) {
    const noteKey = `${note}${octave}`;
    const voice = this.activeNotes.get(noteKey);
    
    if (voice) {
      voice.stop();
      this.activeNotes.delete(noteKey);
    }
  }

  stopAllNotes() {
    this.activeNotes.forEach(voice => voice.stop());
    this.activeNotes.clear();
  }

  private noteToFrequency(note: string, octave: number): number {
    const noteMap: { [key: string]: number } = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
      'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };

    const noteNumber = noteMap[note];
    if (noteNumber === undefined) {
      throw new Error(`Invalid note: ${note}`);
    }

    // A4 = 440Hz, MIDI note number 69
    const midiNumber = (octave + 1) * 12 + noteNumber;
    return 440 * Math.pow(2, (midiNumber - 69) / 12);
  }

  private getDefaultSettings(): SynthSettings {
    return {
      waveform: 'sawtooth',
      attack: 0.1,
      decay: 0.3,
      sustain: 0.7,
      release: 0.5,
      filterFreq: 2000,
      filterQ: 1,
    };
  }
}

class SynthVoice {
  private audioContext: AudioContext;
  private settings: SynthSettings;
  private oscillator: OscillatorNode;
  private gainNode: GainNode;
  private filter: BiquadFilterNode;
  private isPlaying = false;

  constructor(audioContext: AudioContext, settings: SynthSettings) {
    this.audioContext = audioContext;
    this.settings = settings;
    
    this.oscillator = audioContext.createOscillator();
    this.gainNode = audioContext.createGain();
    this.filter = audioContext.createBiquadFilter();
    
    this.setupNodes();
  }

  private setupNodes() {
    // Setup oscillator
    this.oscillator.type = this.settings.waveform;
    
    // Setup filter
    this.filter.type = 'lowpass';
    this.filter.frequency.value = this.settings.filterFreq;
    this.filter.Q.value = this.settings.filterQ;
    
    // Connect nodes
    this.oscillator.connect(this.filter);
    this.filter.connect(this.gainNode);
    
    // Setup envelope
    this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
  }

  connect(destination: AudioNode) {
    this.gainNode.connect(destination);
  }

  start(frequency: number, velocity: number) {
    if (this.isPlaying) return;
    
    this.oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    const now = this.audioContext.currentTime;
    const maxGain = velocity * 0.3; // Limit max volume
    
    // ADSR Envelope
    this.gainNode.gain.setValueAtTime(0, now);
    this.gainNode.gain.linearRampToValueAtTime(maxGain, now + this.settings.attack);
    this.gainNode.gain.linearRampToValueAtTime(
      maxGain * this.settings.sustain,
      now + this.settings.attack + this.settings.decay
    );
    
    this.oscillator.start(now);
    this.isPlaying = true;
  }

  stop() {
    if (!this.isPlaying) return;
    
    const now = this.audioContext.currentTime;
    
    // Release envelope
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(0, now + this.settings.release);
    
    this.oscillator.stop(now + this.settings.release);
    this.isPlaying = false;
  }
}