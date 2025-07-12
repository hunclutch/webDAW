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
    settings: SynthSettings = this.getDefaultSettings(),
    startTime?: number
  ) {
    const frequency = this.noteToFrequency(note, octave);
    const when = startTime || this.audioContext.currentTime;
    
    // ユニークキーを生成（タイムスタンプベース）
    const noteKey = `${note}${octave}-${when.toFixed(3)}-${Math.random().toString(36).substring(2, 11)}`;

    const voice = new SynthVoice(this.audioContext, settings);
    voice.connect(this.masterGain);
    voice.start(frequency, velocity, when);
    
    this.activeNotes.set(noteKey, voice);

    if (duration) {
      // ノート終了時に自動的にマップから削除
      voice.stop(when + duration);
      setTimeout(() => {
        this.activeNotes.delete(noteKey);
      }, (when + duration - this.audioContext.currentTime) * 1000 + settings.release * 1000 + 100);
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

  playPreviewNote(note: string, octave: number, velocity: number = 0.8) {
    const frequency = this.noteToFrequency(note, octave);
    const previewKey = `preview-${note}${octave}`;
    
    // Stop existing preview note
    if (this.activeNotes.has(previewKey)) {
      const voice = this.activeNotes.get(previewKey);
      if (voice) {
        voice.stop();
        this.activeNotes.delete(previewKey);
      }
    }

    const settings = this.getDefaultSettings();
    // Shorter envelope for preview
    settings.attack = 0.05;
    settings.decay = 0.1;
    settings.sustain = 0.5;
    settings.release = 0.2;

    const voice = new SynthVoice(this.audioContext, settings);
    voice.connect(this.masterGain);
    voice.start(frequency, velocity);
    
    this.activeNotes.set(previewKey, voice);

    // Auto-stop preview after short duration
    setTimeout(() => {
      if (this.activeNotes.has(previewKey)) {
        voice.stop();
        this.activeNotes.delete(previewKey);
      }
    }, 500);
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
      attack: 0.02,
      decay: 0.2,
      sustain: 0.6,
      release: 0.3,
      filterFreq: 3000,
      filterQ: 0.5,
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

  start(frequency: number, velocity: number, when: number = this.audioContext.currentTime) {
    if (this.isPlaying) return;
    
    this.oscillator.frequency.setValueAtTime(frequency, when);
    
    const maxGain = velocity * 0.3; // Limit max volume
    
    // ADSR Envelope - Attackとサステインまでの処理
    this.gainNode.gain.setValueAtTime(0, when);
    this.gainNode.gain.linearRampToValueAtTime(maxGain, when + this.settings.attack);
    this.gainNode.gain.linearRampToValueAtTime(
      maxGain * this.settings.sustain,
      when + this.settings.attack + this.settings.decay
    );
    // サステインレベルを維持（Releaseまで）
    
    this.oscillator.start(when);
    this.isPlaying = true;
  }

  stop(when: number = this.audioContext.currentTime) {
    if (!this.isPlaying) return;
    
    // Release envelope
    const currentTime = this.audioContext.currentTime;
    const sustainGain = this.settings.sustain * 0.3; // 想定されるサステインレベル
    
    // 現在のスケジュールをキャンセルしてリリースを開始
    this.gainNode.gain.cancelScheduledValues(when);
    this.gainNode.gain.setValueAtTime(sustainGain, when);
    this.gainNode.gain.linearRampToValueAtTime(0, when + this.settings.release);
    
    // リリース時間後にオシレーターを停止
    this.oscillator.stop(when + this.settings.release);
    
    // Clean up after stop
    const cleanupDelay = Math.max(0, (when + this.settings.release - currentTime) * 1000) + 50;
    setTimeout(() => {
      this.disconnect();
    }, cleanupDelay);
    
    this.isPlaying = false;
  }

  disconnect() {
    try {
      this.oscillator.disconnect();
      this.filter.disconnect();
      this.gainNode.disconnect();
    } catch (e) {
      // Already disconnected
    }
  }
}