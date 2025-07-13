'use client';

import { useState, useCallback } from 'react';
import { Note } from '../types/audio';

interface Chord {
  root: string;
  quality: 'major' | 'minor' | 'diminished' | 'augmented' | '7' | 'minor7' | 'major7';
  duration: number; // 小節数
}

interface BassPattern {
  id: string;
  name: string;
  pattern: number[]; // ステップパターン（0=ルート, 1=3度, 2=5度, 3=7度）
  rhythm: number[]; // リズムパターン（16分音符ベース、1=音符あり、0=休符）
}

interface BasslineGeneratorProps {
  onGenerateBaseline: (notes: Note[]) => void;
  measures?: number;
}

// 基本的なベースパターン
const BASS_PATTERNS: BassPattern[] = [
  {
    id: 'root-fifth',
    name: 'Root & Fifth',
    pattern: [0, 2, 0, 2], // ルート - 5度 - ルート - 5度
    rhythm: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], // 4拍子
  },
  {
    id: 'walking',
    name: 'Walking Bass',
    pattern: [0, 1, 2, 1], // ルート - 3度 - 5度 - 3度
    rhythm: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0], // 8分音符
  },
  {
    id: 'bounce',
    name: 'Bounce',
    pattern: [0, 0, 2, 0], // ルート - ルート - 5度 - ルート
    rhythm: [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0],
  },
  {
    id: 'chord-tones',
    name: 'Chord Tones',
    pattern: [0, 1, 2, 3], // 全ての構成音
    rhythm: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
  },
  {
    id: 'syncopated',
    name: 'Syncopated',
    pattern: [0, 2, 0, 1],
    rhythm: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
  }
];

// 音程計算ヘルパー
const noteToSemitone = (note: string): number => {
  const noteMap: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
    'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
  };
  return noteMap[note] || 0;
};

const semitoneToNote = (semitone: number): string => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return notes[semitone % 12];
};

// コードの構成音を取得
const getChordTones = (chord: Chord): number[] => {
  const root = noteToSemitone(chord.root);
  
  switch (chord.quality) {
    case 'major':
      return [root, root + 4, root + 7]; // 1, 3, 5
    case 'minor':
      return [root, root + 3, root + 7]; // 1, b3, 5
    case 'diminished':
      return [root, root + 3, root + 6]; // 1, b3, b5
    case 'augmented':
      return [root, root + 4, root + 8]; // 1, 3, #5
    case '7':
      return [root, root + 4, root + 7, root + 10]; // 1, 3, 5, b7
    case 'minor7':
      return [root, root + 3, root + 7, root + 10]; // 1, b3, 5, b7
    case 'major7':
      return [root, root + 4, root + 7, root + 11]; // 1, 3, 5, 7
    default:
      return [root, root + 4, root + 7];
  }
};

export default function BasslineGenerator({ onGenerateBaseline, measures = 4 }: BasslineGeneratorProps) {
  const [chordProgression, setChordProgression] = useState('');
  const [selectedPattern, setSelectedPattern] = useState<string>('root-fifth');
  const [octave, setOctave] = useState(2); // ベース音域
  const [swing, setSwing] = useState(0); // スイング感

  // コード進行をパース
  const parseChordProgression = useCallback((input: string): Chord[] => {
    const chordStrings = input.split(/[,\s]+/).filter(s => s.trim());
    const chords: Chord[] = [];
    
    chordStrings.forEach(chordStr => {
      const trimmed = chordStr.trim();
      if (!trimmed) return;
      
      // コードをパース（簡単な実装）
      let root = '';
      let quality: Chord['quality'] = 'major';
      
      // ルート音を抽出
      if (trimmed.length >= 2 && (trimmed[1] === '#' || trimmed[1] === 'b')) {
        root = trimmed.substring(0, 2);
      } else {
        root = trimmed[0];
      }
      
      // コードクオリティを判定
      const remaining = trimmed.substring(root.length).toLowerCase();
      if (remaining.includes('m7')) {
        quality = 'minor7';
      } else if (remaining.includes('maj7') || remaining.includes('M7')) {
        quality = 'major7';
      } else if (remaining.includes('7')) {
        quality = '7';
      } else if (remaining.includes('m') || remaining.includes('min')) {
        quality = 'minor';
      } else if (remaining.includes('dim')) {
        quality = 'diminished';
      } else if (remaining.includes('aug') || remaining.includes('+')) {
        quality = 'augmented';
      }
      
      chords.push({
        root: root,
        quality: quality,
        duration: 1 // デフォルト1小節
      });
    });
    
    return chords;
  }, []);

  // ベースラインを生成
  const generateBaseline = useCallback(() => {
    const chords = parseChordProgression(chordProgression);
    if (chords.length === 0) return;
    
    const pattern = BASS_PATTERNS.find(p => p.id === selectedPattern);
    if (!pattern) return;
    
    const notes: Note[] = [];
    let currentStep = 0;
    
    // 各小節でコード進行を繰り返し
    for (let measure = 0; measure < measures; measure++) {
      const chordIndex = measure % chords.length;
      const chord = chords[chordIndex];
      const chordTones = getChordTones(chord);
      
      // パターンのリズムに従ってノートを配置
      for (let step = 0; step < 16; step++) {
        if (pattern.rhythm[step]) {
          const patternIndex = step % pattern.pattern.length;
          const toneIndex = pattern.pattern[patternIndex];
          
          if (toneIndex < chordTones.length) {
            const semitone = chordTones[toneIndex];
            const noteValue = semitoneToNote(semitone);
            
            // スイング適用
            let timing = currentStep + step * 0.25;
            if (swing > 0 && step % 2 === 1) {
              timing += swing * 0.1;
            }
            
            notes.push({
              id: `bass-${measure}-${step}-${Date.now()}`,
              note: noteValue,
              octave: octave,
              start: timing,
              duration: 0.25,
              velocity: 0.8,
            });
          }
        }
      }
      
      currentStep += 4; // 次の小節へ（16分音符ベースで4拍）
    }
    
    onGenerateBaseline(notes);
  }, [chordProgression, selectedPattern, octave, swing, measures, parseChordProgression, onGenerateBaseline]);

  // シャッフル機能
  const shufflePattern = useCallback(() => {
    const randomPattern = BASS_PATTERNS[Math.floor(Math.random() * BASS_PATTERNS.length)];
    setSelectedPattern(randomPattern.id);
    
    // ランダムに他のパラメータも調整
    const randomOctave = Math.floor(Math.random() * 2) + 2; // 2-3
    const randomSwing = Math.floor(Math.random() * 4); // 0-3
    
    setOctave(randomOctave);
    setSwing(randomSwing);
    
    // 自動的に生成
    setTimeout(() => {
      generateBaseline();
    }, 100);
  }, [generateBaseline]);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-white font-semibold mb-4">Bassline Generator</h3>
      
      {/* コード進行入力 */}
      <div className="mb-4">
        <label className="block text-sm text-gray-300 mb-2">
          Chord Progression (例: C Am F G, Dm7 G7 CM7)
        </label>
        <input
          type="text"
          value={chordProgression}
          onChange={(e) => setChordProgression(e.target.value)}
          placeholder="C Am F G"
          className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
      </div>
      
      {/* パターン選択 */}
      <div className="mb-4">
        <label className="block text-sm text-gray-300 mb-2">Bass Pattern</label>
        <select
          value={selectedPattern}
          onChange={(e) => setSelectedPattern(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        >
          {BASS_PATTERNS.map((pattern) => (
            <option key={pattern.id} value={pattern.id}>
              {pattern.name}
            </option>
          ))}
        </select>
      </div>
      
      {/* パラメータ調整 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Octave</label>
          <select
            value={octave}
            onChange={(e) => setOctave(parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value={1}>1 (Very Low)</option>
            <option value={2}>2 (Low)</option>
            <option value={3}>3 (Mid-Low)</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm text-gray-300 mb-2">Swing ({swing})</label>
          <input
            type="range"
            min="0"
            max="5"
            value={swing}
            onChange={(e) => setSwing(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
      
      {/* アクションボタン */}
      <div className="flex space-x-3">
        <button
          onClick={generateBaseline}
          disabled={!chordProgression.trim()}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white py-2 px-4 rounded transition-colors"
        >
          Generate Bassline
        </button>
        
        <button
          onClick={shufflePattern}
          disabled={!chordProgression.trim()}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:opacity-50 text-white py-2 px-4 rounded transition-colors"
          title="Random Pattern & Settings"
        >
          🎲 Shuffle
        </button>
      </div>
      
      {/* 説明 */}
      <div className="mt-4 text-xs text-gray-400">
        <p>Enter chord symbols separated by spaces or commas.</p>
        <p>Supported: C, Cm, C7, Cm7, CM7, Cdim, Caug</p>
      </div>
    </div>
  );
}