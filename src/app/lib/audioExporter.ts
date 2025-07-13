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
    format: 'wav' | 'mp3' = 'wav',
    bitDepth: 16 | 24 = 16,
    filename: string = 'export'
  ): Promise<void> {
    // 実際のコンテンツに基づく長さを計算
    const actualMeasures = this.calculateActualMeasures(tracks, measures);
    const duration = this.calculateDuration(actualMeasures, bpm);
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
      this.downloadWAV(renderedBuffer, bitDepth, filename);
    } else {
      await this.downloadMP3(renderedBuffer, bitDepth, filename);
    }
  }

  private calculateActualMeasures(tracks: Track[], maxMeasures: number): number {
    let lastMeasure = 1;
    
    tracks.forEach(track => {
      if (track.type === 'synth' && track.notes) {
        track.notes.forEach(note => {
          // ノートの終了位置を小節数に変換（4分音符単位で計算）
          const noteEndStep = note.start + note.duration;
          const noteEndMeasure = Math.ceil(noteEndStep / 4);
          lastMeasure = Math.max(lastMeasure, noteEndMeasure);
        });
      } else if (track.type === 'drum' && track.notes) {
        // ドラムトラックのノートも考慮
        track.notes.forEach(note => {
          const noteEndStep = note.start + note.duration;
          const noteEndMeasure = Math.ceil(noteEndStep / 4);
          lastMeasure = Math.max(lastMeasure, noteEndMeasure);
        });
      } else if (track.type === 'drum' && track.drumPattern) {
        // ドラムパターンの場合、最後にノートがあるステップを確認
        const pattern = track.drumPattern;
        Object.values(pattern).forEach(steps => {
          steps.forEach((active: boolean, stepIndex: number) => {
            if (active) {
              // ドラムパターンは16分音符ベースのまま保持
              const stepMeasure = Math.ceil((stepIndex + 1) / 16);
              lastMeasure = Math.max(lastMeasure, stepMeasure);
            }
          });
        });
      }
    });
    
    // 最大小節数を超えないように制限し、少し余裕を持たせる
    return Math.min(lastMeasure + 1, maxMeasures);
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
    } else if (track.type === 'drum') {
      if (track.notes && track.notes.length > 0) {
        // ドラムトラックのノート再生（ピアノロールで配置されたノート）
        await this.renderDrumNotes(track, context, gainNode, bpm);
      } else if (track.drumPattern) {
        // ドラムパターン再生（DrumPadsで配置されたパターン）
        await this.renderDrumTrack(track, context, gainNode, duration, bpm);
      }
    }
  }

  private async renderSynthTrack(
    track: Track, 
    context: OfflineAudioContext, 
    gainNode: GainNode, 
    bpm: number
  ): Promise<void> {
    const stepDuration = 60 / bpm; // 4分音符の長さ

    for (const note of track.notes) {
      const frequency = this.noteToFrequency(note.note, note.octave);
      const startTime = Math.max(0, note.start * stepDuration);

      const noteDuration = note.duration * stepDuration;
      
      // オシレーター、フィルター、ADSRエンベロープを作成
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      const filter = context.createBiquadFilter();
      
      // Synthesizer.tsと同じ設定を適用
      const synthSettings = track.synthSettings || {
        waveform: 'sawtooth',
        attack: 0.02,
        decay: 0.2,
        sustain: 0.6,
        release: 0.3,
        filterFreq: 3000,
        filterQ: 0.5,
      };
      
      oscillator.type = synthSettings.waveform;
      oscillator.frequency.value = frequency;
      
      // フィルター設定
      filter.type = 'lowpass';
      filter.frequency.value = synthSettings.filterFreq;
      filter.Q.value = synthSettings.filterQ;
      
      // ノード接続: oscillator -> filter -> envelope -> gainNode
      oscillator.connect(filter);
      filter.connect(envelope);
      envelope.connect(gainNode);
      
      // ADSRエンベロープを適用（Synthesizer.tsと同じロジック）
      const maxGain = note.velocity * 0.3; // Synthesizer.tsと同じ音量制限
      const { attack, decay, sustain, release } = synthSettings;
      const sustainLevel = maxGain * sustain;

      // エンベロープ設定
      envelope.gain.setValueAtTime(0, startTime);
      envelope.gain.linearRampToValueAtTime(maxGain, startTime + attack);
      envelope.gain.linearRampToValueAtTime(sustainLevel, startTime + attack + decay);
      
      // サステインレベルを維持し、リリースはノート終了時に開始
      const releaseStartTime = startTime + noteDuration - release;
      if (releaseStartTime > startTime + attack + decay) {
        envelope.gain.setValueAtTime(sustainLevel, releaseStartTime);
      }
      envelope.gain.linearRampToValueAtTime(0, startTime + noteDuration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + noteDuration);
    }
  }

  private async renderDrumNotes(
    track: Track, 
    context: OfflineAudioContext, 
    gainNode: GainNode, 
    bpm: number
  ): Promise<void> {
    const stepDuration = 60 / bpm; // 4分音符の長さ

    for (const note of track.notes) {
      const startTime = Math.max(0, note.start * stepDuration);
      const drumType = this.noteToDrumType(note.note, note.octave);
      
      if (drumType) {
        await this.createDrumHit(context, gainNode, drumType, startTime, note.velocity);
      }
    }
  }

  // 音程をドラムタイプに変換
  private noteToDrumType(note: string, octave: number): string | null {
    const noteKey = `${note}${octave}`;
    const drumMapping: { [key: string]: string } = {
      'C4': 'kick',
      'D4': 'snare', 
      'F#4': 'hihat',
      'A#4': 'openhat',
      'C5': 'crash',
    };
    
    return drumMapping[noteKey] || null;
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

  private downloadWAV(buffer: AudioBuffer, bitDepth: 16 | 24 = 16, filename: string = 'export'): void {
    const wav = this.audioBufferToWav(buffer, bitDepth);
    const blob = new Blob([wav], { type: 'audio/wav' });
    this.downloadBlob(blob, `${filename}.wav`);
  }

  private async downloadMP3(buffer: AudioBuffer, bitDepth: 16 | 24 = 16, filename: string = 'export'): Promise<void> {
    try {
      // LameJSを動的にロード
      const lamejs = await this.loadLameJS();
      if (!lamejs) {
        console.warn('LameJS not available, saving as WAV instead');
        this.downloadWAV(buffer, bitDepth, filename);
        return;
      }

      const mp3Data = this.audioBufferToMp3(buffer, lamejs);
      const blob = new Blob([mp3Data], { type: 'audio/mp3' });
      this.downloadBlob(blob, `${filename}.mp3`);
    } catch (error) {
      console.error('MP3 export failed, saving as WAV instead:', error);
      this.downloadWAV(buffer, bitDepth, filename);
    }
  }

  private async loadLameJS(): Promise<any> {
    try {
      // CDNからLameJSを動的ロード
      return new Promise((resolve, reject) => {
        if ((window as any).lamejs) {
          resolve((window as any).lamejs);
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js';
        script.onload = () => {
          if ((window as any).lamejs) {
            resolve((window as any).lamejs);
          } else {
            reject(new Error('LameJS not found after loading'));
          }
        };
        script.onerror = () => reject(new Error('Failed to load LameJS'));
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error('Failed to load LameJS:', error);
      return null;
    }
  }

  private audioBufferToMp3(buffer: AudioBuffer, lamejs: any): Uint8Array {
    const sampleRate = buffer.sampleRate;
    const channels = buffer.numberOfChannels;
    const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128); // 128kbps
    
    const length = buffer.length;
    const mp3Data: Uint8Array[] = [];
    
    // チャンネルデータを取得
    const leftChannel = buffer.getChannelData(0);
    const rightChannel = channels > 1 ? buffer.getChannelData(1) : leftChannel;
    
    // 16-bit PCMに変換
    const left = new Int16Array(length);
    const right = new Int16Array(length);
    
    for (let i = 0; i < length; i++) {
      left[i] = Math.max(-32768, Math.min(32767, leftChannel[i] * 32767));
      right[i] = Math.max(-32768, Math.min(32767, rightChannel[i] * 32767));
    }
    
    // チャンクごとにエンコード（メモリ効率のため）
    const chunkSize = 1152; // MP3フレームサイズ
    for (let i = 0; i < length; i += chunkSize) {
      const leftChunk = left.subarray(i, i + chunkSize);
      const rightChunk = right.subarray(i, i + chunkSize);
      
      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
    
    // 最終フラッシュ
    const finalMp3buf = mp3encoder.flush();
    if (finalMp3buf.length > 0) {
      mp3Data.push(finalMp3buf);
    }
    
    // 全データを結合
    const totalLength = mp3Data.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of mp3Data) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    
    return result;
  }

  private audioBufferToWav(buffer: AudioBuffer, bitDepth: 16 | 24 = 16): ArrayBuffer {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = bitDepth / 8;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * bytesPerSample);
    const view = new DataView(arrayBuffer);

    // WAVヘッダーを書き込み
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * bytesPerSample, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true);
    view.setUint16(32, numberOfChannels * bytesPerSample, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * bytesPerSample, true);

    // オーディオデータを書き込み
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        
        if (bitDepth === 16) {
          view.setInt16(offset, sample * 0x7FFF, true);
          offset += 2;
        } else { // 24-bit
          const intSample = Math.round(sample * 0x7FFFFF);
          view.setUint8(offset, intSample & 0xFF);
          view.setUint8(offset + 1, (intSample >> 8) & 0xFF);
          view.setUint8(offset + 2, (intSample >> 16) & 0xFF);
          offset += 3;
        }
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