import { Note } from '../types/audio';

export interface MelodyGenerationParams {
  key?: string;
  scale?: 'major' | 'minor' | 'pentatonic' | 'blues';
  length?: number; // Number of measures
  tempo?: number;
  style?: 'pop' | 'jazz' | 'classical' | 'electronic' | 'rock';
  mood?: 'happy' | 'sad' | 'energetic' | 'calm' | 'mysterious';
  keywords?: string; // Additional keywords for melody generation
}

export interface DrumPatternParams {
  style?: 'rock' | 'pop' | 'jazz' | 'electronic' | 'funk' | 'latin';
  tempo?: number;
  length?: number; // Number of measures
  complexity?: 'simple' | 'medium' | 'complex';
  keywords?: string; // Additional keywords for drum pattern
}

export class MelodyGenerator {
  private getApiKey(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('openai_api_key');
    }
    return null;
  }

  async generateMelody(params: MelodyGenerationParams): Promise<Note[]> {
    try {
      const apiKey = this.getApiKey();
      const response = await fetch('/api/generate-melody', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          type: 'melody',
          apiKey
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate melody');
      }

      const data = await response.json();
      return data.notes;
    } catch (error) {
      console.error('Error generating melody:', error);
      console.error('API error details:', error instanceof Error ? error.message : 'Unknown error');
      alert('メロディーの生成に失敗しました。OpenAI APIキーを確認してください。フォールバックメロディーを使用します。');
      return this.generateFallbackMelody(params.length || 4);
    }
  }

  async generateChordProgression(params: MelodyGenerationParams): Promise<Note[]> {
    try {
      const apiKey = this.getApiKey();
      const response = await fetch('/api/generate-melody', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          type: 'chords',
          apiKey
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate chord progression');
      }

      const data = await response.json();
      return data.notes;
    } catch (error) {
      console.error('Error generating chord progression:', error);
      console.error('API error details:', error instanceof Error ? error.message : 'Unknown error');
      alert('コード進行の生成に失敗しました。OpenAI APIキーを確認してください。フォールバックコードを使用します。');
      return this.generateFallbackChords(params.length || 4);
    }
  }

  async generateDrumPattern(params: DrumPatternParams): Promise<any> {
    try {
      const apiKey = this.getApiKey();
      const response = await fetch('/api/generate-melody', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          type: 'drums',
          apiKey
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate drum pattern');
      }

      const data = await response.json();
      return data.pattern;
    } catch (error) {
      console.error('Error generating drum pattern:', error);
      console.error('API error details:', error instanceof Error ? error.message : 'Unknown error');
      alert('ドラムパターンの生成に失敗しました。OpenAI APIキーを確認してください。フォールバックパターンを使用します。');
      return this.generateFallbackDrumPattern(params.length || 4);
    }
  }

  private generateFallbackMelody(length: number): Note[] {
    const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const fallbackNotes: Note[] = [];
    
    for (let measure = 0; measure < length; measure++) {
      for (let beat = 0; beat < 4; beat++) {
        const noteIndex = (measure * 4 + beat) % notes.length;
        fallbackNotes.push({
          id: `fallback-melody-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${measure}-${beat}`,
          note: notes[noteIndex],
          octave: 4,
          start: measure * 4 + beat,
          duration: 1,
          velocity: 0.7
        });
      }
    }
    
    return fallbackNotes;
  }

  private generateFallbackChords(length: number): Note[] {
    const chords = ['C', 'G', 'Am', 'F']; // I-V-vi-IV progression in C major
    const fallbackChords: Note[] = [];
    
    for (let measure = 0; measure < length; measure++) {
      const chordRoot = chords[measure % chords.length];
      const baseNote = chordRoot.replace('m', ''); // Remove minor designation
      
      fallbackChords.push({
        id: `fallback-chord-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${measure}`,
        note: baseNote,
        octave: 3,
        start: measure * 4,
        duration: 4,
        velocity: 0.6
      });
    }
    
    return fallbackChords;
  }

  private generateFallbackDrumPattern(length: number): any {
    // Basic rock drum pattern
    const basicStep = {
      kick: false,
      snare: false,
      hihat: false,
      openhat: false,
      crash: false,
      velocity: 0.8
    };

    const steps = [];
    
    // Create a basic 16-step rock pattern
    for (let i = 0; i < 16; i++) {
      const step = { ...basicStep };
      
      // Kick on beats 1 and 3 (steps 0, 8)
      if (i === 0 || i === 8) {
        step.kick = true;
        step.velocity = 0.9;
      }
      
      // Snare on beats 2 and 4 (steps 4, 12)
      if (i === 4 || i === 12) {
        step.snare = true;
        step.velocity = 0.85;
      }
      
      // Hi-hat on every other step
      if (i % 2 === 0) {
        step.hihat = true;
        step.velocity = 0.6;
      }
      
      steps.push(step);
    }

    return {
      steps: steps,
      length: length
    };
  }
}