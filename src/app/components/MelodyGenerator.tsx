'use client';

import { useState } from 'react';
import { MelodyGenerator, MelodyGenerationParams, DrumPatternParams } from '../lib/melodyGenerator';
import { Note } from '../types/audio';

interface MelodyGeneratorComponentProps {
  onMelodyGenerated: (notes: Note[]) => void;
  onDrumPatternGenerated?: (pattern: any) => void;
  onClose: () => void;
  trackType?: 'synth' | 'drum' | 'bass' | 'audio';
}

export default function MelodyGeneratorComponent({ onMelodyGenerated, onDrumPatternGenerated, onClose, trackType = 'synth' }: MelodyGeneratorComponentProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [params, setParams] = useState<MelodyGenerationParams>({
    key: 'C',
    scale: 'major',
    length: 4,
    tempo: 120,
    style: 'pop',
    mood: 'happy',
    keywords: ''
  });

  const [drumParams, setDrumParams] = useState<DrumPatternParams>({
    style: 'rock',
    tempo: 120,
    length: 4,
    complexity: 'medium',
    keywords: ''
  });

  const melodyGenerator = new MelodyGenerator();

  const handleGenerate = async (type: 'melody' | 'chords' | 'drums') => {
    setIsGenerating(true);
    try {
      if (type === 'drums') {
        if (!onDrumPatternGenerated) {
          alert('ドラムパターン生成がサポートされていません。');
          return;
        }
        const pattern = await melodyGenerator.generateDrumPattern(drumParams);
        onDrumPatternGenerated(pattern);
      } else {
        let notes: Note[];
        if (type === 'melody') {
          notes = await melodyGenerator.generateMelody(params);
        } else {
          notes = await melodyGenerator.generateChordProgression(params);
        }
        onMelodyGenerated(notes);
      }
    } catch (error) {
      console.error('Failed to generate:', error);
      alert(`${type === 'drums' ? 'ドラムパターン' : 'メロディー'}の生成に失敗しました。APIキーを確認してください。`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">
          {trackType === 'drum' ? 'AI Drum Pattern Generator' : 'AI Melody Generator'}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xl"
        >
          ✕
        </button>
      </div>

      {trackType === 'drum' ? (
        // Drum Pattern UI
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Style Selection for Drums */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Style
            </label>
            <select
              value={drumParams.style}
              onChange={(e) => setDrumParams({ ...drumParams, style: e.target.value as any })}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="rock">Rock</option>
              <option value="pop">Pop</option>
              <option value="jazz">Jazz</option>
              <option value="electronic">Electronic</option>
              <option value="funk">Funk</option>
              <option value="latin">Latin</option>
            </select>
          </div>

          {/* Complexity */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Complexity
            </label>
            <select
              value={drumParams.complexity}
              onChange={(e) => setDrumParams({ ...drumParams, complexity: e.target.value as any })}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="simple">Simple</option>
              <option value="medium">Medium</option>
              <option value="complex">Complex</option>
            </select>
          </div>

          {/* Length */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Length (measures)
            </label>
            <input
              type="number"
              min="1"
              max="16"
              value={drumParams.length}
              onChange={(e) => setDrumParams({ ...drumParams, length: parseInt(e.target.value) || 4 })}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Tempo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tempo (BPM)
            </label>
            <input
              type="number"
              min="60"
              max="200"
              value={drumParams.tempo}
              onChange={(e) => setDrumParams({ ...drumParams, tempo: parseInt(e.target.value) || 120 })}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Keywords for Drums */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Keywords (optional)
            </label>
            <input
              type="text"
              value={drumParams.keywords}
              onChange={(e) => setDrumParams({ ...drumParams, keywords: e.target.value })}
              placeholder="aggressive, groovy, minimal, etc."
              className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      ) : (
        // Melody/Chord UI
        <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Key Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Key
          </label>
          <select
            value={params.key}
            onChange={(e) => setParams({ ...params, key: e.target.value })}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="C">C</option>
            <option value="G">G</option>
            <option value="D">D</option>
            <option value="A">A</option>
            <option value="E">E</option>
            <option value="B">B</option>
            <option value="F#">F#</option>
            <option value="F">F</option>
            <option value="Bb">Bb</option>
            <option value="Eb">Eb</option>
            <option value="Ab">Ab</option>
            <option value="Db">Db</option>
          </select>
        </div>

        {/* Scale Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Scale
          </label>
          <select
            value={params.scale}
            onChange={(e) => setParams({ ...params, scale: e.target.value as any })}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="major">Major</option>
            <option value="minor">Minor</option>
            <option value="pentatonic">Pentatonic</option>
            <option value="blues">Blues</option>
          </select>
        </div>

        {/* Style Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Style
          </label>
          <select
            value={params.style}
            onChange={(e) => setParams({ ...params, style: e.target.value as any })}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="pop">Pop</option>
            <option value="jazz">Jazz</option>
            <option value="classical">Classical</option>
            <option value="electronic">Electronic</option>
            <option value="rock">Rock</option>
          </select>
        </div>

        {/* Mood Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Mood
          </label>
          <select
            value={params.mood}
            onChange={(e) => setParams({ ...params, mood: e.target.value as any })}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value="happy">Happy</option>
            <option value="sad">Sad</option>
            <option value="energetic">Energetic</option>
            <option value="calm">Calm</option>
            <option value="mysterious">Mysterious</option>
          </select>
        </div>

        {/* Length */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Length (measures)
          </label>
          <input
            type="number"
            min="1"
            max="16"
            value={params.length}
            onChange={(e) => setParams({ ...params, length: parseInt(e.target.value) || 4 })}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Tempo */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tempo (BPM)
          </label>
          <input
            type="number"
            min="60"
            max="200"
            value={params.tempo}
            onChange={(e) => setParams({ ...params, tempo: parseInt(e.target.value) || 120 })}
            className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Keywords for Melody/Chords */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Keywords (optional)
          </label>
          <input
            type="text"
            value={params.keywords}
            onChange={(e) => setParams({ ...params, keywords: e.target.value })}
            placeholder="dreamy, upbeat, nostalgic, cinematic, etc."
            className="w-full bg-gray-700 text-white rounded px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>
        </div>
      )}

      <div className="flex space-x-4">
        {trackType === 'drum' ? (
          <button
            onClick={() => handleGenerate('drums')}
            disabled={isGenerating}
            className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            {isGenerating ? 'Generating...' : '🥁 Generate Drum Pattern'}
          </button>
        ) : (
          <>
            <button
              onClick={() => handleGenerate('melody')}
              disabled={isGenerating}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              {isGenerating ? 'Generating...' : '🎵 Generate Melody'}
            </button>
            
            <button
              onClick={() => handleGenerate('chords')}
              disabled={isGenerating}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              {isGenerating ? 'Generating...' : '🎹 Generate Chords'}
            </button>
          </>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-400">
        {trackType === 'drum' ? (
          <>
            <p>• ドラムパターン: AIが指定されたスタイルに基づいてドラムパターンを生成します</p>
            <p>• キーワードを入力すると、より具体的な雰囲気のパターンが生成されます</p>
            <p>• 生成されたパターンは選択中のドラムトラックに適用されます</p>
          </>
        ) : (
          <>
            <p>• メロディー: 主旋律を生成します</p>
            <p>• コード: 和音進行を生成します</p>
            <p>• キーワードを入力すると、より具体的な雰囲気の楽曲が生成されます</p>
            <p>• 生成されたノートは選択中のトラックに追加されます</p>
          </>
        )}
      </div>
    </div>
  );
}