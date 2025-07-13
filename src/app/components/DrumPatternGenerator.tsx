'use client';

import { useState, useCallback } from 'react';
import { DrumPattern } from '../types/audio';

interface DrumStyle {
  id: string;
  name: string;
  description: string;
  patterns: {
    kick: number[];
    snare: number[];
    hihat: number[];
    openhat: number[];
    crash: number[];
  };
}

interface DrumPatternGeneratorProps {
  onGeneratePattern: (pattern: DrumPattern) => void;
  currentPattern?: DrumPattern;
}

// 様々なドラムスタイル/ジャンルのパターン
const DRUM_STYLES: DrumStyle[] = [
  {
    id: 'rock-basic',
    name: 'Rock Basic',
    description: 'Classic rock beat',
    patterns: {
      kick: [0, 8],
      snare: [4, 12],
      hihat: [0, 2, 4, 6, 8, 10, 12, 14],
      openhat: [6, 14],
      crash: [0],
    }
  },
  {
    id: 'disco',
    name: 'Disco',
    description: 'Four-on-the-floor disco',
    patterns: {
      kick: [0, 4, 8, 12],
      snare: [4, 12],
      hihat: [1, 3, 5, 7, 9, 11, 13, 15],
      openhat: [2, 6, 10, 14],
      crash: [0, 8],
    }
  },
  {
    id: 'funk',
    name: 'Funk',
    description: 'Syncopated funk groove',
    patterns: {
      kick: [0, 3, 6, 10],
      snare: [4],
      hihat: [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14],
      openhat: [7, 15],
      crash: [],
    }
  },
  {
    id: 'hip-hop',
    name: 'Hip-Hop',
    description: 'Classic hip-hop boom bap',
    patterns: {
      kick: [0, 6, 10],
      snare: [4, 12],
      hihat: [2, 6, 10, 14],
      openhat: [],
      crash: [],
    }
  },
  {
    id: 'latin',
    name: 'Latin',
    description: 'Latin percussion pattern',
    patterns: {
      kick: [0, 4, 8, 11],
      snare: [2, 6, 10, 14],
      hihat: [1, 3, 5, 7, 9, 11, 13, 15],
      openhat: [4, 12],
      crash: [0],
    }
  },
  {
    id: 'breakbeat',
    name: 'Breakbeat',
    description: 'Amen break inspired',
    patterns: {
      kick: [0, 10],
      snare: [4, 6, 12],
      hihat: [2, 4, 8, 10, 14],
      openhat: [6],
      crash: [0],
    }
  },
  {
    id: 'reggae',
    name: 'Reggae',
    description: 'One drop reggae',
    patterns: {
      kick: [8],
      snare: [4, 12],
      hihat: [2, 6, 10, 14],
      openhat: [0, 8],
      crash: [],
    }
  },
  {
    id: 'techno',
    name: 'Techno',
    description: '4/4 electronic techno',
    patterns: {
      kick: [0, 4, 8, 12],
      snare: [4, 12],
      hihat: [2, 6, 10, 14],
      openhat: [1, 3, 5, 7, 9, 11, 13, 15],
      crash: [0],
    }
  },
  {
    id: 'shuffle',
    name: 'Shuffle',
    description: 'Swing/shuffle feel',
    patterns: {
      kick: [0, 8],
      snare: [4, 12],
      hihat: [0, 3, 6, 8, 11, 14],
      openhat: [6, 14],
      crash: [],
    }
  },
  {
    id: 'ballad',
    name: 'Ballad',
    description: 'Slow ballad beat',
    patterns: {
      kick: [0, 8],
      snare: [4, 12],
      hihat: [2, 6, 10, 14],
      openhat: [],
      crash: [0],
    }
  }
];

// ドラムの強弱パターン（アクセント）
const ACCENT_PATTERNS = {
  normal: [0.8, 0.6, 0.7, 0.6, 0.8, 0.6, 0.7, 0.6, 0.8, 0.6, 0.7, 0.6, 0.8, 0.6, 0.7, 0.6],
  heavy: [1.0, 0.6, 0.8, 0.6, 1.0, 0.6, 0.8, 0.6, 1.0, 0.6, 0.8, 0.6, 1.0, 0.6, 0.8, 0.6],
  light: [0.6, 0.4, 0.5, 0.4, 0.6, 0.4, 0.5, 0.4, 0.6, 0.4, 0.5, 0.4, 0.6, 0.4, 0.5, 0.4],
  random: [] // 動的に生成
};

export default function DrumPatternGenerator({ onGeneratePattern, currentPattern }: DrumPatternGeneratorProps) {
  const [selectedStyle, setSelectedStyle] = useState<string>('rock-basic');
  const [complexity, setComplexity] = useState(5); // 1-10
  const [swing, setSwing] = useState(0); // 0-10
  const [accentPattern, setAccentPattern] = useState<string>('normal');
  const [fillDensity, setFillDensity] = useState(3); // 1-10

  // パターンを生成
  const generatePattern = useCallback(() => {
    const style = DRUM_STYLES.find(s => s.id === selectedStyle);
    if (!style) return;

    const pattern: DrumPattern = {
      steps: Array.from({ length: 16 }, () => ({
        kick: false,
        snare: false,
        hihat: false,
        openhat: false,
        crash: false,
        velocity: 0.8,
      })),
      length: 16,
    };

    // 複雑さに基づいてパターンの密度を調整
    const complexityFactor = complexity / 10;
    
    // 基本パターンを適用
    ['kick', 'snare', 'hihat', 'openhat', 'crash'].forEach(drumType => {
      const positions = style.patterns[drumType as keyof typeof style.patterns];
      positions.forEach(pos => {
        if (Math.random() < complexityFactor || drumType === 'kick' || drumType === 'snare') {
          (pattern.steps[pos] as any)[drumType] = true;
        }
      });
    });

    // フィルやゴーストノートを追加（複雑さに基づく）
    if (complexityFactor > 0.5) {
      for (let i = 0; i < 16; i++) {
        // ランダムなフィル
        if (Math.random() < (fillDensity / 100) && !pattern.steps[i].snare) {
          if (Math.random() < 0.3) pattern.steps[i].snare = true;
          if (Math.random() < 0.4) pattern.steps[i].hihat = true;
        }
        
        // ハイハットのバリエーション
        if (Math.random() < (complexityFactor - 0.5) * 0.4) {
          pattern.steps[i].hihat = true;
        }
      }
    }

    // アクセントパターンを適用
    const accents = accentPattern === 'random' 
      ? Array.from({ length: 16 }, () => 0.4 + Math.random() * 0.6)
      : ACCENT_PATTERNS[accentPattern as keyof typeof ACCENT_PATTERNS] || ACCENT_PATTERNS.normal;
    
    pattern.steps.forEach((step, i) => {
      step.velocity = accents[i] || 0.8;
    });

    // スイング適用（簡単な実装）
    if (swing > 0) {
      // スイングの実装は複雑なので、ここでは velocity 調整のみ
      pattern.steps.forEach((step, i) => {
        if (i % 2 === 1) { // オフビート
          step.velocity *= (1 + swing / 20);
        }
      });
    }

    onGeneratePattern(pattern);
  }, [selectedStyle, complexity, swing, accentPattern, fillDensity, onGeneratePattern]);

  // ランダムシャッフル
  const shufflePattern = useCallback(() => {
    const randomStyle = DRUM_STYLES[Math.floor(Math.random() * DRUM_STYLES.length)];
    const randomComplexity = Math.floor(Math.random() * 10) + 1;
    const randomSwing = Math.floor(Math.random() * 6);
    const randomAccent = ['normal', 'heavy', 'light', 'random'][Math.floor(Math.random() * 4)];
    const randomFill = Math.floor(Math.random() * 8) + 1;

    setSelectedStyle(randomStyle.id);
    setComplexity(randomComplexity);
    setSwing(randomSwing);
    setAccentPattern(randomAccent);
    setFillDensity(randomFill);

    // 少し遅延させて生成
    setTimeout(() => {
      generatePattern();
    }, 100);
  }, [generatePattern]);

  // パターンをクリア
  const clearPattern = useCallback(() => {
    const emptyPattern: DrumPattern = {
      steps: Array.from({ length: 16 }, () => ({
        kick: false,
        snare: false,
        hihat: false,
        openhat: false,
        crash: false,
        velocity: 0.8,
      })),
      length: 16,
    };
    onGeneratePattern(emptyPattern);
  }, [onGeneratePattern]);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-white font-semibold mb-4">Drum Pattern Generator</h3>
      
      {/* スタイル選択 */}
      <div className="mb-4">
        <label className="block text-sm text-gray-300 mb-2">Style</label>
        <select
          value={selectedStyle}
          onChange={(e) => setSelectedStyle(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        >
          {DRUM_STYLES.map((style) => (
            <option key={style.id} value={style.id}>
              {style.name} - {style.description}
            </option>
          ))}
        </select>
      </div>
      
      {/* パラメータ調整 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Complexity ({complexity})</label>
          <input
            type="range"
            min="1"
            max="10"
            value={complexity}
            onChange={(e) => setComplexity(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-400 mt-1">
            {complexity <= 3 ? 'Simple' : complexity <= 7 ? 'Medium' : 'Complex'}
          </div>
        </div>
        
        <div>
          <label className="block text-sm text-gray-300 mb-2">Fill Density ({fillDensity})</label>
          <input
            type="range"
            min="1"
            max="10"
            value={fillDensity}
            onChange={(e) => setFillDensity(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-400 mt-1">
            {fillDensity <= 3 ? 'Minimal' : fillDensity <= 7 ? 'Medium' : 'Busy'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-gray-300 mb-2">Swing ({swing})</label>
          <input
            type="range"
            min="0"
            max="10"
            value={swing}
            onChange={(e) => setSwing(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-400 mt-1">
            {swing === 0 ? 'Straight' : swing <= 5 ? 'Light Swing' : 'Heavy Swing'}
          </div>
        </div>
        
        <div>
          <label className="block text-sm text-gray-300 mb-2">Accent Pattern</label>
          <select
            value={accentPattern}
            onChange={(e) => setAccentPattern(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="normal">Normal</option>
            <option value="heavy">Heavy</option>
            <option value="light">Light</option>
            <option value="random">Random</option>
          </select>
        </div>
      </div>
      
      {/* アクションボタン */}
      <div className="flex space-x-3">
        <button
          onClick={generatePattern}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors"
        >
          Generate Pattern
        </button>
        
        <button
          onClick={shufflePattern}
          className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded transition-colors"
          title="Random Style & Settings"
        >
          🎲 Shuffle
        </button>
        
        <button
          onClick={clearPattern}
          className="bg-gray-600 hover:bg-gray-500 text-white py-2 px-4 rounded transition-colors"
          title="Clear Pattern"
        >
          Clear
        </button>
      </div>
      
      {/* 説明 */}
      <div className="mt-4 text-xs text-gray-400">
        <p>Select a drum style and adjust parameters to generate rhythmic patterns.</p>
        <p>
          <strong>Complexity:</strong> Pattern density &nbsp;
          <strong>Fill Density:</strong> Extra hits &nbsp;
          <strong>Swing:</strong> Timing feel
        </p>
      </div>
    </div>
  );
}