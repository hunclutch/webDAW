'use client';

import { DrumPattern, DrumStep } from '../types/audio';

export class DrumMachine {
  private audioContext: AudioContext | OfflineAudioContext;
  private masterGain: GainNode;
  private drumSounds: Map<string, AudioBuffer> = new Map();

  constructor(audioContext: AudioContext | OfflineAudioContext, masterGain: GainNode) {
    this.audioContext = audioContext;
    this.masterGain = masterGain;
    // generateDrumSounds()は呼ばない
  }

  // playDrumSoundはgenerateDrumSoundをawaitする
  async playDrumSound(drumType: string, velocity: number = 1) {
    const buffer = await this.generateDrumSound(drumType);
    if (!buffer) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    gainNode.gain.value = velocity * 0.5;

    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    source.start();
  }

  async playPattern(pattern: DrumPattern, stepIndex: number) {
    const step = pattern.steps[stepIndex];
    if (!step) return;

    if (step.kick) await this.playDrumSound('kick', step.velocity);
    if (step.snare) await this.playDrumSound('snare', step.velocity);
    if (step.hihat) await this.playDrumSound('hihat', step.velocity);
    if (step.openhat) await this.playDrumSound('openhat', step.velocity);
    if (step.crash) await this.playDrumSound('crash', step.velocity);
  }

  async generateDrumSound(drumType: string): Promise<AudioBuffer | null> {
    // Return existing buffer if available
    const existingBuffer = this.drumSounds.get(drumType);
    if (existingBuffer) {
      return existingBuffer;
    }

    let buffer: AudioBuffer | null = null;
    switch (drumType) {
      case 'kick':
        buffer = await this.createKickDrum();
        break;
      case 'snare':
        buffer = await this.createSnareDrum();
        break;
      case 'hihat':
        buffer = await this.createHiHat();
        break;
      case 'openhat':
        buffer = await this.createOpenHat();
        break;
      case 'crash':
        buffer = await this.createCrash();
        break;
    }

    if (buffer) {
      this.drumSounds.set(drumType, buffer);
    }

    return buffer;
  }

  createEmptyPattern(length: number = 16): DrumPattern {
    const steps: DrumStep[] = [];
    for (let i = 0; i < length; i++) {
      steps.push({
        kick: false,
        snare: false,
        hihat: false,
        openhat: false,
        crash: false,
        velocity: 0.8,
      });
    }
    return { steps, length };
  }

  private async createKickDrum(): Promise<AudioBuffer> {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.5;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const freq = 60 * Math.exp(-t * 30); // Frequency sweep from 60Hz down
      const envelope = Math.exp(-t * 5); // Exponential decay
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
    }

    return buffer;
  }

  private async createSnareDrum(): Promise<AudioBuffer> {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.2;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 30);
      const tone = Math.sin(2 * Math.PI * 200 * t) * 0.3;
      const noise = (Math.random() * 2 - 1) * 0.7;
      data[i] = (tone + noise) * envelope * 0.2;
    }

    return buffer;
  }

  private async createHiHat(): Promise<AudioBuffer> {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.1;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 50);
      const noise = (Math.random() * 2 - 1);
      // High-pass filter effect by emphasizing high frequencies
      const filtered = noise * (1 + Math.sin(2 * Math.PI * 8000 * t) * 0.5);
      data[i] = filtered * envelope * 0.1;
    }

    return buffer;
  }

  private async createOpenHat(): Promise<AudioBuffer> {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.3;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 8);
      const noise = (Math.random() * 2 - 1);
      const filtered = noise * (1 + Math.sin(2 * Math.PI * 6000 * t) * 0.3);
      data[i] = filtered * envelope * 0.15;
    }

    return buffer;
  }

  private async createCrash(): Promise<AudioBuffer> {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 1.5;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 2);
      const noise = (Math.random() * 2 - 1);
      const shimmer = Math.sin(2 * Math.PI * 5000 * t) * 0.3;
      data[i] = (noise + shimmer) * envelope * 0.2;
    }

    return buffer;
  }
}