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
      
      if (data.error) {
        throw new Error(data.message || 'メロディー生成に失敗しました');
      }
      
      if (!data.notes) {
        throw new Error('生成された音符データが見つかりません');
      }
      
      return data.notes;
    } catch (error) {
      console.error('Error generating melody:', error);
      throw error; // Re-throw error to be handled by the UI component
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
      
      if (data.error) {
        throw new Error(data.message || 'コード進行生成に失敗しました');
      }
      
      if (!data.notes) {
        throw new Error('生成されたコードデータが見つかりません');
      }
      
      return data.notes;
    } catch (error) {
      console.error('Error generating chord progression:', error);
      throw error; // Re-throw error to be handled by the UI component
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
      
      if (data.error) {
        throw new Error(data.message || 'ドラムパターン生成に失敗しました');
      }
      
      if (!data.pattern) {
        throw new Error('生成されたドラムパターンが見つかりません');
      }
      
      return data.pattern;
    } catch (error) {
      console.error('Error generating drum pattern:', error);
      throw error; // Re-throw error to be handled by the UI component
    }
  }

}