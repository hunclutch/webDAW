'use client';

import { Track, Effect } from '../types/audio';
import { Synthesizer } from './synthesizer';
import { DrumMachine } from './drumMachine';
import { Sequencer } from './sequencer';

export class AudioEngine {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private tracks: Map<string, TrackNode> = new Map();
  private synthesizer: Synthesizer;
  private drumMachine: DrumMachine;
  private sequencer: Sequencer;

  constructor(audioContext: AudioContext, masterGain: GainNode) {
    this.audioContext = audioContext;
    this.masterGain = masterGain;
    this.synthesizer = new Synthesizer(audioContext, masterGain);
    this.drumMachine = new DrumMachine(audioContext, masterGain);
    this.sequencer = new Sequencer(audioContext, this.synthesizer, this.drumMachine);
  }

  async loadAudioFile(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  createTrack(track: Track): TrackNode {
    const trackNode = new TrackNode(this.audioContext, track);
    trackNode.connect(this.masterGain);
    this.tracks.set(track.id, trackNode);
    return trackNode;
  }

  removeTrack(trackId: string) {
    const track = this.tracks.get(trackId);
    if (track) {
      track.disconnect();
      this.tracks.delete(trackId);
    }
  }

  play(tracks: Track[]) {
    this.sequencer.setTracks(tracks);
    this.sequencer.play();
  }

  pause() {
    this.sequencer.pause();
  }

  stop() {
    this.sequencer.stop();
  }

  setMasterVolume(volume: number) {
    this.masterGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
  }

  getCurrentTime(): number {
    return this.sequencer.getCurrentTime();
  }

  getIsPlaying(): boolean {
    return this.sequencer.getIsPlaying();
  }

  getPlayheadPosition(): number {
    return this.sequencer.getPlayheadPosition();
  }

  setBPM(bpm: number) {
    this.sequencer.setBPM(bpm);
  }

  setMaxMeasures(measures: number) {
    this.sequencer.setMaxMeasures(measures);
  }

  getSynthesizer(): Synthesizer {
    return this.synthesizer;
  }

  getDrumMachine(): DrumMachine {
    return this.drumMachine;
  }

  getSequencer(): Sequencer {
    return this.sequencer;
  }

  getAudioContext(): AudioContext {
    return this.audioContext;
  }
}

class TrackNode {
  private audioContext: AudioContext;
  private track: Track;
  private gainNode: GainNode;
  private panNode: StereoPannerNode;
  private sourceNode: AudioBufferSourceNode | null = null;
  private effectNodes: AudioNode[] = [];

  constructor(audioContext: AudioContext, track: Track) {
    this.audioContext = audioContext;
    this.track = track;
    
    this.gainNode = audioContext.createGain();
    this.panNode = audioContext.createStereoPanner();
    
    this.setupEffectChain();
    this.updateParameters();
  }

  private setupEffectChain() {
    let currentNode: AudioNode = this.gainNode;
    
    // Clear existing effect nodes
    this.effectNodes.forEach(node => node.disconnect());
    this.effectNodes = [];
    
    // Create effect nodes
    this.track.effects.forEach(effect => {
      if (effect.enabled) {
        const effectNode = this.createEffectNode(effect);
        if (effectNode) {
          currentNode.connect(effectNode);
          currentNode = effectNode;
          this.effectNodes.push(effectNode);
        }
      }
    });
    
    currentNode.connect(this.panNode);
  }

  private createEffectNode(effect: Effect): AudioNode | null {
    switch (effect.type) {
      case 'filter':
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = effect.parameters.frequency || 1000;
        filter.Q.value = effect.parameters.resonance || 1;
        return filter;
        
      case 'delay':
        const delay = this.audioContext.createDelay(1);
        delay.delayTime.value = effect.parameters.time || 0.3;
        return delay;
        
      default:
        return null;
    }
  }

  updateParameters() {
    this.gainNode.gain.setValueAtTime(
      this.track.muted ? 0 : this.track.volume,
      this.audioContext.currentTime
    );
    
    this.panNode.pan.setValueAtTime(
      this.track.pan,
      this.audioContext.currentTime
    );
  }

  play(when: number = 0) {
    if (!this.track.audioBuffer || this.sourceNode) return;
    
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.track.audioBuffer;
    this.sourceNode.connect(this.gainNode);
    this.sourceNode.start(when);
  }

  stop() {
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
  }

  connect(destination: AudioNode) {
    this.panNode.connect(destination);
  }

  disconnect() {
    this.stop();
    this.gainNode.disconnect();
    this.panNode.disconnect();
    this.effectNodes.forEach(node => node.disconnect());
  }

  updateTrack(track: Track) {
    this.track = track;
    this.setupEffectChain();
    this.updateParameters();
  }
}