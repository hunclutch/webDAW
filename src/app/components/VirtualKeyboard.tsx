'use client';

import { useState } from 'react';
import { useKeyboardPiano } from '../hooks/useKeyboardPiano';

interface VirtualKeyboardProps {
  onNotePlay: (note: string, octave: number) => void;
  onNoteStop: (note: string, octave: number) => void;
  octave?: number;
}

const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_KEYS = ['C#', 'D#', '', 'F#', 'G#', 'A#', ''];

export default function VirtualKeyboard({
  onNotePlay,
  onNoteStop,
  octave = 4,
}: VirtualKeyboardProps) {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [currentOctave, setCurrentOctave] = useState(octave);
  const [showKeyMappings, setShowKeyMappings] = useState(false);

  // キーボード操作のフック
  const { keyMappings, isKeyPressed } = useKeyboardPiano({
    onNotePlay,
    onNoteStop,
    enabled: true,
  });

  // キーボードキーからノート情報を取得
  const getKeyboardKeyForNote = (note: string, octave: number) => {
    const mapping = keyMappings.find(m => m.note === note && m.octave === octave);
    return mapping?.key.toUpperCase();
  };

  const handleKeyDown = (note: string) => {
    if (pressedKeys.has(note)) return;
    
    setPressedKeys(prev => new Set(prev).add(note));
    onNotePlay(note, currentOctave);
  };

  const handleKeyUp = (note: string) => {
    setPressedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(note);
      return newSet;
    });
    onNoteStop(note, currentOctave);
  };

  // キーボードで押されているかチェック
  const isNotePressed = (note: string, octave: number) => {
    const mapping = keyMappings.find(m => m.note === note && m.octave === octave);
    return mapping ? isKeyPressed(mapping.key) : false;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">Virtual Keyboard</h3>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowKeyMappings(!showKeyMappings)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
          >
            {showKeyMappings ? 'Hide Keys' : 'Show Keys'}
          </button>
          <div className="flex items-center space-x-2">
            <span className="text-white text-sm">Octave:</span>
            <select
              value={currentOctave}
              onChange={(e) => setCurrentOctave(parseInt(e.target.value))}
              className="bg-gray-700 text-white px-2 py-1 rounded"
            >
              {[1, 2, 3, 4, 5, 6].map(oct => (
                <option key={oct} value={oct}>{oct}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="relative">
        {/* White keys */}
        <div className="flex">
          {WHITE_KEYS.map((note, index) => {
            const isPressed = pressedKeys.has(note) || isNotePressed(note, currentOctave);
            const keyboardKey = getKeyboardKeyForNote(note, currentOctave);
            
            return (
              <button
                key={`${note}-white`}
                className={`w-12 h-32 border border-gray-300 font-medium rounded-b-lg transition-colors relative ${
                  isPressed
                    ? 'bg-blue-200 shadow-inner text-blue-800'
                    : 'bg-white text-black hover:bg-gray-100 shadow-md'
                }`}
                onMouseDown={() => handleKeyDown(note)}
                onMouseUp={() => handleKeyUp(note)}
                onMouseLeave={() => handleKeyUp(note)}
              >
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-center">
                  <div className="text-xs font-medium">
                    {note}{currentOctave}
                  </div>
                  {showKeyMappings && keyboardKey && (
                    <div className="text-xs bg-gray-200 text-gray-700 px-1 rounded mt-1">
                      {keyboardKey}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Black keys */}
        <div className="absolute top-0 flex">
          {BLACK_KEYS.map((note, index) => {
            if (!note) {
              return <div key={`spacer-${index}`} className="w-12" />;
            }
            
            const isPressed = pressedKeys.has(note) || isNotePressed(note, currentOctave);
            const keyboardKey = getKeyboardKeyForNote(note, currentOctave);
            
            return (
              <button
                key={`${note}-black`}
                className={`w-8 h-20 text-xs font-medium rounded-b-lg ml-8 transition-colors relative ${
                  isPressed
                    ? 'bg-blue-600 shadow-inner text-white'
                    : 'bg-gray-900 text-white hover:bg-gray-700 shadow-lg'
                }`}
                style={{ marginLeft: index === 0 ? '32px' : '16px' }}
                onMouseDown={() => handleKeyDown(note)}
                onMouseUp={() => handleKeyUp(note)}
                onMouseLeave={() => handleKeyUp(note)}
              >
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-center">
                  <div className="text-xs">
                    {note.replace('#', '♯')}
                  </div>
                  {showKeyMappings && keyboardKey && (
                    <div className="text-xs bg-gray-700 text-gray-200 px-1 rounded mt-1">
                      {keyboardKey}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-400">
        <div>Click keys or use keyboard to play notes</div>
        <div className="mt-1">
          Lower row (Z-M): Octave 3 | Middle row (Q-U): Octave 4 | Upper row (I-P): Octave 5
        </div>
      </div>
    </div>
  );
}