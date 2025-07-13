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

  async playDrumSoundAtTime(drumType: string, velocity: number = 1, when: number) {
    const buffer = await this.generateDrumSound(drumType);
    if (!buffer) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    gainNode.gain.value = velocity * 0.5;

    source.connect(gainNode);
    gainNode.connect(this.masterGain);

    source.start(when);
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

  async playPatternAtTime(pattern: DrumPattern, stepIndex: number, when: number) {
    const step = pattern.steps[stepIndex];
    if (!step) return;

    if (step.kick) await this.playDrumSoundAtTime('kick', step.velocity, when);
    if (step.snare) await this.playDrumSoundAtTime('snare', step.velocity, when);
    if (step.hihat) await this.playDrumSoundAtTime('hihat', step.velocity, when);
    if (step.openhat) await this.playDrumSoundAtTime('openhat', step.velocity, when);
    if (step.crash) await this.playDrumSoundAtTime('crash', step.velocity, when);
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
    const duration = 0.6;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      
      // より自然な周波数スイープ（90Hz → 45Hz）
      const freq = 90 * Math.exp(-t * 8);
      
      // より自然なエンベロープ（アタック + ディケイ）
      const attack = t < 0.01 ? t / 0.01 : 1;
      const decay = Math.exp(-t * 4);
      const envelope = attack * decay;
      
      // サブハーモニクスを追加してより豊かな音に
      const fundamental = Math.sin(2 * Math.PI * freq * t);
      const subharmonic = Math.sin(2 * Math.PI * freq * 0.5 * t) * 0.3;
      const click = Math.exp(-t * 100) * (Math.random() * 2 - 1) * 0.1; // アタックのクリック音
      
      data[i] = (fundamental + subharmonic + click) * envelope * 0.4;
    }

    return buffer;
  }

  private async createSnareDrum(): Promise<AudioBuffer> {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.25;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      
      // より自然なエンベロープ
      const attack = t < 0.005 ? t / 0.005 : 1;
      const decay = Math.exp(-t * 25);
      const envelope = attack * decay;
      
      // 複数の周波数成分でよりリアルなスネア音
      const fundamental = Math.sin(2 * Math.PI * 200 * t) * 0.2;
      const harmonic1 = Math.sin(2 * Math.PI * 400 * t) * 0.15;
      const harmonic2 = Math.sin(2 * Math.PI * 800 * t) * 0.1;
      
      // より自然なノイズ（バンドパスフィルター効果）
      const noise = (Math.random() * 2 - 1);
      const filteredNoise = noise * (1 + Math.sin(2 * Math.PI * 4000 * t) * 0.3) * 0.6;
      
      data[i] = (fundamental + harmonic1 + harmonic2 + filteredNoise) * envelope * 0.3;
    }

    return buffer;
  }

  private async createHiHat(): Promise<AudioBuffer> {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.12;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      
      // より自然なクローズドハイハットのエンベロープ
      const attack = t < 0.002 ? t / 0.002 : 1;
      const decay = Math.exp(-t * 60);
      const envelope = attack * decay;
      
      // 複数の高周波ノイズを重ねてリアルなハイハット音
      const noise1 = (Math.random() * 2 - 1);
      const noise2 = (Math.random() * 2 - 1);
      const noise3 = (Math.random() * 2 - 1);
      
      // 異なる周波数帯のフィルタリング
      const filtered1 = noise1 * Math.sin(2 * Math.PI * 8000 * t) * 0.4;
      const filtered2 = noise2 * Math.sin(2 * Math.PI * 12000 * t) * 0.3;
      const filtered3 = noise3 * Math.sin(2 * Math.PI * 16000 * t) * 0.2;
      
      // メタリックな響きを追加
      const metallic = Math.sin(2 * Math.PI * 10000 * t * (1 + noise1 * 0.1)) * 0.1;
      
      data[i] = (filtered1 + filtered2 + filtered3 + metallic) * envelope * 0.15;
    }

    return buffer;
  }

  private async createOpenHat(): Promise<AudioBuffer> {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.4;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      
      // オープンハイハット特有の長いディケイ
      const attack = t < 0.005 ? t / 0.005 : 1;
      const decay = Math.exp(-t * 6);
      const envelope = attack * decay;
      
      // より複雑なノイズ構造
      const noise1 = (Math.random() * 2 - 1);
      const noise2 = (Math.random() * 2 - 1);
      
      // 異なる周波数帯で個性的なサウンド
      const filtered1 = noise1 * Math.sin(2 * Math.PI * 6000 * t) * 0.4;
      const filtered2 = noise2 * Math.sin(2 * Math.PI * 9000 * t) * 0.3;
      
      // シズル感を表現するための高周波ノイズ
      const sizzle = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * 14000 * t) * 0.2;
      
      // わずかなピッチベンド効果
      const bend = Math.sin(2 * Math.PI * 7000 * t * (1 + Math.sin(t * 50) * 0.02)) * 0.1;
      
      data[i] = (filtered1 + filtered2 + sizzle + bend) * envelope * 0.2;
    }

    return buffer;
  }

  private async createCrash(): Promise<AudioBuffer> {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 2.0;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      
      // クラッシュシンバル特有の長いサステイン
      const attack = t < 0.01 ? t / 0.01 : 1;
      const decay = Math.exp(-t * 1.5);
      const envelope = attack * decay;
      
      // 複数のノイズレイヤーで豊かなシンバル音
      const noise1 = (Math.random() * 2 - 1);
      const noise2 = (Math.random() * 2 - 1);
      const noise3 = (Math.random() * 2 - 1);
      
      // 異なる周波数帯域のシマー効果
      const shimmer1 = Math.sin(2 * Math.PI * 3000 * t * (1 + noise1 * 0.05)) * 0.3;
      const shimmer2 = Math.sin(2 * Math.PI * 6000 * t * (1 + noise2 * 0.03)) * 0.25;
      const shimmer3 = Math.sin(2 * Math.PI * 9000 * t * (1 + noise3 * 0.02)) * 0.2;
      
      // 高周波のキラキラ感
      const sparkle = noise1 * Math.sin(2 * Math.PI * 12000 * t) * 0.15;
      
      // 低周波の響き
      const resonance = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 5) * 0.1;
      
      // わずかなフランジング効果
      const delay = Math.sin(2 * Math.PI * 5000 * (t - 0.002)) * 0.05;
      
      data[i] = (shimmer1 + shimmer2 + shimmer3 + sparkle + resonance + delay + noise1 * 0.1) * envelope * 0.25;
    }

    return buffer;
  }
}