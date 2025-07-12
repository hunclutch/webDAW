'use client';

import { useState } from 'react';

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

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">Virtual Keyboard</h3>
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

      <div className="relative">
        {/* White keys */}
        <div className="flex">
          {WHITE_KEYS.map((note, index) => (
            <button
              key={`${note}-white`}
              className={`w-12 h-32 bg-white border border-gray-300 text-black font-medium rounded-b-lg transition-colors ${
                pressedKeys.has(note)
                  ? 'bg-blue-200 shadow-inner'
                  : 'hover:bg-gray-100 shadow-md'
              }`}
              onMouseDown={() => handleKeyDown(note)}
              onMouseUp={() => handleKeyUp(note)}
              onMouseLeave={() => handleKeyUp(note)}
            >
              <span className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs">
                {note}{currentOctave}
              </span>
            </button>
          ))}
        </div>

        {/* Black keys */}
        <div className="absolute top-0 flex">
          {BLACK_KEYS.map((note, index) => {
            if (!note) {
              return <div key={`spacer-${index}`} className="w-12" />;
            }
            
            return (
              <button
                key={`${note}-black`}
                className={`w-8 h-20 bg-gray-900 text-white text-xs font-medium rounded-b-lg ml-8 transition-colors ${
                  pressedKeys.has(note)
                    ? 'bg-blue-600 shadow-inner'
                    : 'hover:bg-gray-700 shadow-lg'
                }`}
                style={{ marginLeft: index === 0 ? '32px' : '16px' }}
                onMouseDown={() => handleKeyDown(note)}
                onMouseUp={() => handleKeyUp(note)}
                onMouseLeave={() => handleKeyUp(note)}
              >
                {note}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-400">
        Click and hold keys to play notes
      </div>
    </div>
  );
}