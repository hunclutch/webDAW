'use client';

import { Track, Note } from '../types/audio';
import { Synthesizer } from './synthesizer';
import { DrumMachine } from './drumMachine';

export class Sequencer {
  private audioContext: AudioContext;
  private synthesizer: Synthesizer;
  private drumMachine: DrumMachine;
  private isPlaying = false;
  private currentTime = 0;
  private startTime = 0;
  private bpm = 120;
  private intervalId: number | null = null;
  private tracks: Track[] = [];
  private playheadPosition = 0;
  private maxMeasures = 60;

  constructor(
    audioContext: AudioContext,
    synthesizer: Synthesizer,
    drumMachine: DrumMachine
  ) {
    this.audioContext = audioContext;
    this.synthesizer = synthesizer;
    this.drumMachine = drumMachine;
  }

  setTracks(tracks: Track[]) {
    this.tracks = tracks;
  }

  setMaxMeasures(measures: number) {
    this.maxMeasures = measures;
  }

  setBPM(bpm: number) {
    this.bpm = bpm;
  }

  play() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.startTime = this.audioContext.currentTime - this.currentTime;
    
    // Schedule notes and drum hits
    this.scheduleTracksPlayback();
    
    // Start playhead update
    this.startPlayheadUpdate();
  }

  pause() {
    if (!this.isPlaying) return;
    
    this.isPlaying = false;
    this.currentTime = this.audioContext.currentTime - this.startTime;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.stopAllActiveNotes();
  }

  stop() {
    this.isPlaying = false;
    this.currentTime = 0;
    this.playheadPosition = 0;
    this.startTime = 0;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.stopAllActiveNotes();
  }

  getCurrentTime(): number {
    if (this.isPlaying) {
      return this.audioContext.currentTime - this.startTime;
    }
    return this.currentTime;
  }

  getPlayheadPosition(): number {
    return this.playheadPosition;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private scheduleTracksPlayback() {
    if (!this.isPlaying) return;
    
    const currentAudioTime = this.audioContext.currentTime;
    const currentTime = this.getCurrentTime();
    const lookAhead = 0.1; // 100ms lookahead
    const endTime = currentTime + lookAhead;
    
    this.tracks.forEach(track => {
      if (track.muted) return;
      
      if (track.type === 'synth' && track.notes.length > 0) {
        this.scheduleNotesForTrack(track, currentTime, endTime, currentAudioTime);
      } else if (track.type === 'drum' && track.drumPattern) {
        this.scheduleDrumPatternForTrack(track, currentTime, endTime, currentAudioTime);
      }
    });
  }

  private scheduleNotesForTrack(track: Track, currentTime: number, endTime: number, audioTime: number) {
    // ノートのstart/durationは16分音符ステップ単位で保存されている
    const secondsPer16thNote = (60 / this.bpm) / 4; // 16分音符の長さ
    const stepsPerSecond = 1 / secondsPer16thNote;
    const currentStep = currentTime * stepsPerSecond;
    const endStep = endTime * stepsPerSecond;
    
    track.notes.forEach(note => {
      const noteStartStep = note.start;
      
      // Check if note should be playing in the current time window
      if (noteStartStep >= currentStep && noteStartStep < endStep) {
        const noteStartTime = audioTime + (noteStartStep - currentStep) * secondsPer16thNote;
        const noteDuration = note.duration * secondsPer16thNote;
        
        // Use Web Audio API scheduling instead of setTimeout
        if (this.isPlaying && noteStartTime >= this.audioContext.currentTime) {
          this.synthesizer.playNote(
            note.note,
            note.octave,
            note.velocity,
            noteDuration,
            track.synthSettings,
            noteStartTime
          );
        }
      }
    });
  }

  private scheduleDrumPatternForTrack(track: Track, currentTime: number, endTime: number, audioTime: number) {
    if (!track.drumPattern) return;
    
    const secondsPer16thNote = (60 / this.bpm) / 4; // 16th notes
    const stepsPerSecond = 1 / secondsPer16thNote;
    const patternLength = track.drumPattern.length;
    
    const currentStep = Math.floor(currentTime * stepsPerSecond);
    const endStep = Math.floor(endTime * stepsPerSecond);
    
    // Handle pattern looping properly
    for (let absoluteStep = currentStep; absoluteStep < endStep; absoluteStep++) {
      const patternStep = absoluteStep % patternLength;
      const stepStartTime = audioTime + (absoluteStep - currentStep) * secondsPer16thNote;
      
      // Use Web Audio API scheduling instead of setTimeout
      if (this.isPlaying && stepStartTime >= this.audioContext.currentTime) {
        this.drumMachine.playPatternAtTime(track.drumPattern!, patternStep, stepStartTime);
      }
    }
  }

  private startPlayheadUpdate() {
    this.intervalId = window.setInterval(() => {
      if (this.isPlaying) {
        // playheadPositionは16分音符ステップ単位で管理
        const secondsPer16thNote = (60 / this.bpm) / 4;
        const stepsPerSecond = 1 / secondsPer16thNote;
        const totalSteps = this.getCurrentTime() * stepsPerSecond;
        const maxSteps = this.maxMeasures * 16; // 各小節16ステップ（16分音符）
        
        // 最大小節数に達したら停止
        if (totalSteps >= maxSteps) {
          this.stop();
          return;
        }
        
        this.playheadPosition = totalSteps;
        
        // Continue scheduling upcoming notes
        this.scheduleTracksPlayback();
      }
    }, 25); // Update every 25ms for better precision
  }

  private stopAllActiveNotes() {
    this.synthesizer.stopAllNotes();
  }

  // Utility methods for editing
  addNoteToTrack(trackId: string, note: Note) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track && track.type === 'synth') {
      track.notes.push(note);
    }
  }

  removeNoteFromTrack(trackId: string, noteId: string) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track && track.type === 'synth') {
      track.notes = track.notes.filter(n => n.id !== noteId);
    }
  }

  updateDrumStep(trackId: string, stepIndex: number, drumType: string, enabled: boolean) {
    const track = this.tracks.find(t => t.id === trackId);
    if (track && track.type === 'drum' && track.drumPattern) {
      const step = track.drumPattern.steps[stepIndex];
      if (step) {
        (step as any)[drumType] = enabled;
      }
    }
  }

  playNotePreview(note: string, octave: number) {
    this.synthesizer.playPreviewNote(note, octave, 0.7);
  }

  playDrumPreview(drumType: string) {
    this.drumMachine.playDrumSound(drumType, 0.8);
  }
}