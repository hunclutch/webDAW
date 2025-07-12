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
    const secondsPerBeat = 60 / this.bpm;
    const beatsPerSecond = this.bpm / 60;
    const currentBeat = currentTime * beatsPerSecond;
    const endBeat = endTime * beatsPerSecond;
    
    track.notes.forEach(note => {
      const noteStartBeat = note.start;
      const noteEndBeat = note.start + note.duration;
      
      // Check if note should be playing in the current time window
      if (noteStartBeat >= currentBeat && noteStartBeat < endBeat) {
        const noteStartTime = audioTime + (noteStartBeat - currentBeat) / beatsPerSecond;
        
        // Schedule note immediately or with small delay
        const delay = Math.max(0, (noteStartTime - audioTime) * 1000);
        
        setTimeout(() => {
          if (this.isPlaying) {
            this.synthesizer.playNote(
              note.note,
              note.octave,
              note.velocity,
              note.duration / beatsPerSecond,
              track.synthSettings
            );
          }
        }, delay);
      }
    });
  }

  private scheduleDrumPatternForTrack(track: Track, currentTime: number, endTime: number, audioTime: number) {
    if (!track.drumPattern) return;
    
    const secondsPerStep = (60 / this.bpm) / 4; // 16th notes
    const stepsPerSecond = 1 / secondsPerStep;
    const patternLength = track.drumPattern.length;
    
    const currentStep = (currentTime * stepsPerSecond) % patternLength;
    const endStep = (endTime * stepsPerSecond) % patternLength;
    
    // Handle pattern looping
    const steps = currentStep < endStep ? 
      Array.from({length: Math.floor(endStep - currentStep)}, (_, i) => Math.floor(currentStep + i) % patternLength) :
      Array.from({length: patternLength - Math.floor(currentStep)}, (_, i) => Math.floor(currentStep + i) % patternLength);
    
    steps.forEach(step => {
      const stepStartTime = currentTime + (step - currentStep) * secondsPerStep;
      const delay = Math.max(0, (stepStartTime - currentTime) * 1000);
      
      setTimeout(() => {
        if (this.isPlaying) {
          this.drumMachine.playPattern(track.drumPattern!, step);
        }
      }, delay);
    });
  }

  private startPlayheadUpdate() {
    this.intervalId = window.setInterval(() => {
      if (this.isPlaying) {
        const beatsPerSecond = this.bpm / 60;
        const totalBeats = this.getCurrentTime() * beatsPerSecond;
        const maxBeats = this.maxMeasures * 4; // 各小節4ビート
        
        // 最大小節数に達したら停止
        if (totalBeats >= maxBeats) {
          this.stop();
          return;
        }
        
        this.playheadPosition = totalBeats;
        
        // Continue scheduling upcoming notes
        this.scheduleTracksPlayback();
      }
    }, 50); // Update every 50ms
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

  playNotePreview(note: string, octave: number, trackId?: string) {
    const track = trackId ? this.tracks.find(t => t.id === trackId) : null;
    const settings = track?.synthSettings;
    
    this.synthesizer.playNote(note, octave, 0.7, 0.5, settings);
  }

  playDrumPreview(drumType: string) {
    this.drumMachine.playDrumSound(drumType, 0.8);
  }
}