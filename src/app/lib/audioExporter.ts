import { Track } from '../types/audio';
import { Synthesizer } from './synthesizer';
import { DrumMachine } from './drumMachine';

export class AudioExporter {
  private audioContext: AudioContext;
  private sampleRate: number;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
    this.sampleRate = audioContext.sampleRate;
  }

  async exportTracks(
    tracks: Track[], 
    measures: number, 
    bpm: number, 
    format: 'wav' | 'mp3' = 'wav'
  ): Promise<void> {
    const duration = this.calculateDuration(measures, bpm);
    const bufferLength = Math.ceil(duration * this.sampleRate);
    
    // オフラインオーディオコンテキストを作成
    const offlineContext = new OfflineAudioContext(2, bufferLength, this.sampleRate);
    
    // 各トラックをレンダリング
    const trackPromises = tracks.map(track => this.renderTrack(track, offlineContext, duration, bpm));
    await Promise.all(trackPromises);
    
    // 最終的なオーディオバッファを取得
    const renderedBuffer = await offlineContext.startRendering();
    
    // フォーマットに応じてダウンロード
    if (format === 'wav') {
      this.downloadWAV(renderedBuffer);
    } else {
      await this.downloadMP3(renderedBuffer);
    }
  }

  private calculateDuration(measures: number, bpm: number): number {
    // 1小節 = 4拍、1分 = 60秒
    const beatsPerMeasure = 4;
    const totalBeats = measures * beatsPerMeasure;
    return (totalBeats / bpm) * 60;
  }

  private async renderTrack(
    track: Track, 
    context: OfflineAudioContext, 
    duration: number, 
    bpm: number
  ): Promise<void> {
    if (track.muted) return;

    const gainNode = context.createGain();
    gainNode.gain.value = track.volume;
    gainNode.connect(context.destination);

    if (track.type === 'synth' && track.notes) {
      await this.renderSynthTrack(track, context, gainNode, bpm);
    } else if (track.type === 'drum' && track.drumPattern) {
      await this.renderDrumTrack(track, context, gainNode, duration, bpm);
    }
  }

  private async renderSynthTrack(
    track: Track, 
    context: OfflineAudioContext, 
    gainNode: GainNode, 
    bpm: number
  ): Promise<void> {
    const stepDuration = (60 / bpm) / 4; // 16分音符の長さ

    for (const note of track.notes) {
      const frequency = this.noteToFrequency(note.note, note.octave);
      const startTime = Math.max(0, note.start * stepDuration);

      const noteDuration = note.duration * stepDuration;
      
      // オシレーターとADSRエンベロープを作成
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      
      if (track.synthSettings) {
        oscillator.type = track.synthSettings.waveform;
      } else {
        oscillator.type = 'sine';
      }
      
      oscillator.frequency.value = frequency;
      oscillator.connect(envelope);
      envelope.connect(gainNode);
      
      // ADSRエンベロープを適用
      if (track.synthSettings) {
        const { attack, decay, sustain, release } = track.synthSettings;
        const sustainLevel = sustain * note.velocity;

        envelope.gain.setValueAtTime(0, startTime);
        envelope.gain.linearRampToValueAtTime(note.velocity, startTime + attack);
        envelope.gain.linearRampToValueAtTime(sustainLevel, startTime + attack + decay);

        // releaseがnoteDurationより長い場合はnoteDurationに制限
        const releaseTime = Math.max(0, Math.min(release, noteDuration));
        envelope.gain.setValueAtTime(
          sustainLevel,
          startTime + noteDuration - releaseTime
        );
        envelope.gain.linearRampToValueAtTime(0, startTime + noteDuration);
      } else {
        envelope.gain.setValueAtTime(note.velocity, startTime);
        envelope.gain.linearRampToValueAtTime(0, startTime + noteDuration);
      }
      
      oscillator.start(startTime);
      oscillator.stop(startTime + noteDuration);
    }
  }

  private async renderDrumTrack(
    track: Track, 
    context: OfflineAudioContext, 
    gainNode: GainNode, 
    duration: number, 
    bpm: number
  ): Promise<void> {
    if (!track.drumPattern) return;

    const stepDuration = (60 / bpm) / 4; // 16分音符の長さ
    const patternDuration = track.drumPattern.length * stepDuration;
    const patternCount = Math.ceil(duration / patternDuration);

    for (let p = 0; p < patternCount; p++) {
      const patternStartTime = p * patternDuration;
      
      for (let i = 0; i < track.drumPattern.steps.length; i++) {
        const step = track.drumPattern.steps[i];
        const stepTime = patternStartTime + (i * stepDuration);
        
        if (step.kick) await this.createDrumHit(context, gainNode, 'kick', stepTime, step.velocity);
        if (step.snare) await this.createDrumHit(context, gainNode, 'snare', stepTime, step.velocity);
        if (step.hihat) await this.createDrumHit(context, gainNode, 'hihat', stepTime, step.velocity);
        if (step.openhat) await this.createDrumHit(context, gainNode, 'openhat', stepTime, step.velocity);
        if (step.crash) await this.createDrumHit(context, gainNode, 'crash', stepTime, step.velocity);
      }
    }
  }

  private async createDrumHit(
    context: OfflineAudioContext, 
    gainNode: GainNode, 
    drumType: string, 
    startTime: number, 
    velocity: number
  ): Promise<void> {
    // masterGainを渡す
    const masterGain = context.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(gainNode);

    const drumMachine = new DrumMachine(context, masterGain);
    const buffer = await drumMachine.generateDrumSound(drumType);

    if (buffer) {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(masterGain);
      source.start(startTime);
      source.stop(startTime + buffer.duration);
    }
  }

  private noteToFrequency(note: string, octave: number): number {
    const noteFrequencies: { [key: string]: number } = {
      'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
      'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
      'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
    };
    
    const baseFreq = noteFrequencies[note];
    if (!baseFreq) return 440;
    
    return baseFreq * Math.pow(2, octave - 4);
  }

  private downloadWAV(buffer: AudioBuffer): void {
    const wav = this.audioBufferToWav(buffer);
    const blob = new Blob([wav], { type: 'audio/wav' });
    this.downloadBlob(blob, 'export.wav');
  }

  private async downloadMP3(buffer: AudioBuffer): Promise<void> {
    // MP3エンコーディングは複雑なので、WAVとして保存
    // 実際のMP3エンコーディングには外部ライブラリが必要
    console.warn('MP3 export not fully implemented, saving as WAV instead');
    this.downloadWAV(buffer);
  }

  private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);

    // WAVヘッダーを書き込み
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);

    // オーディオデータを書き込み
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}