'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Note } from '../types/audio';

interface PianoRollProps {
  notes: Note[];
  onNotesChange: (notes: Note[]) => void;
  onPreviewNote: (note: string, octave: number) => void;
  isPlaying: boolean;
  playheadPosition: number;
  measures?: number;
  onMeasuresChange?: (measures: number) => void;
  onSwitchToSimpleView?: () => void;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVES = [7, 6, 5, 4, 3, 2, 1]; // High to low for visual layout
const INITIAL_MEASURES = 60; // 60小節デフォルト
const STEPS_PER_MEASURE = 16; // 16分音符単位（4/4拍子）
const CELL_WIDTH = 24;
const CELL_HEIGHT = 20;

export default function PianoRoll({
  notes,
  onNotesChange,
  onPreviewNote,
  isPlaying,
  playheadPosition,
  measures = INITIAL_MEASURES,
  onMeasuresChange,
  onSwitchToSimpleView,
}: PianoRollProps) {
  // const [selectedNote, setSelectedNote] = useState<string | null>(null); // 未使用のためコメントアウト
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'add' | 'remove'>('add');
  const gridWidth = measures * STEPS_PER_MEASURE; // 小節数 × 16分音符
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  // C4を中央に配置とスクロール同期
  useEffect(() => {
    if (scrollContainerRef.current && gridScrollRef.current) {
      // C4の位置を計算 (オクターブ4のCは上から3番目のオクターブの最初の音)
      const octaveIndex = OCTAVES.indexOf(4);
      const noteIndex = NOTES.indexOf('C');
      const c4Position = (octaveIndex * NOTES.length + noteIndex) * CELL_HEIGHT;
      
      // コンテナの高さの半分を取得
      const containerHeight = scrollContainerRef.current.clientHeight;
      const scrollTop = c4Position - containerHeight / 2;
      
      const finalScrollTop = Math.max(0, scrollTop);
      scrollContainerRef.current.scrollTop = finalScrollTop;
      gridScrollRef.current.scrollTop = finalScrollTop;
    }
  }, []);
  
  // 小節数が変更されたときのログ出力
  useEffect(() => {
    console.log('Measures updated to:', measures, 'Grid width:', gridWidth);
  }, [measures, gridWidth]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    
    if (scrollContainerRef.current && gridScrollRef.current) {
      if (e.currentTarget === scrollContainerRef.current) {
        gridScrollRef.current.scrollTop = scrollTop;
      } else {
        scrollContainerRef.current.scrollTop = scrollTop;
      }
    }
  }, []);

  // const getNoteKey = (note: string, octave: number) => `${note}${octave}`;

  const positionToStep = (x: number) => {
    return Math.floor(x / CELL_WIDTH);
  };

  const positionToNote = (y: number) => {
    const noteIndex = Math.floor(y / CELL_HEIGHT);
    const totalNotes = NOTES.length * OCTAVES.length;
    if (noteIndex < 0 || noteIndex >= totalNotes) return null;
    
    const octaveIndex = Math.floor(noteIndex / NOTES.length);
    const noteInOctave = noteIndex % NOTES.length;
    
    return {
      note: NOTES[noteInOctave],
      octave: OCTAVES[octaveIndex],
    };
  };

  const stepToPosition = (step: number) => step * CELL_WIDTH;
  
  const noteToPosition = (note: string, octave: number) => {
    const octaveIndex = OCTAVES.indexOf(octave);
    const noteIndex = NOTES.indexOf(note);
    if (octaveIndex === -1 || noteIndex === -1) return -1;
    
    return (octaveIndex * NOTES.length + noteIndex) * CELL_HEIGHT;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const step = positionToStep(x);
    const noteData = positionToNote(y);
    
    if (!noteData || step < 0 || step >= gridWidth) return;

    const existingNote = notes.find(
      n => n.note === noteData.note && 
           n.octave === noteData.octave && 
           Math.floor(n.start) === step
    );

    if (existingNote) {
      // Remove note
      setDrawMode('remove');
      onNotesChange(notes.filter(n => n.id !== existingNote.id));
    } else {
      // Add note
      setDrawMode('add');
      const newNote: Note = {
        id: `note-${Date.now()}-${Math.random()}`,
        note: noteData.note,
        octave: noteData.octave,
        start: step,
        duration: 1,
        velocity: 0.8,
      };
      onNotesChange([...notes, newNote]);
      onPreviewNote(noteData.note, noteData.octave);
    }

    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const step = positionToStep(x);
    const noteData = positionToNote(y);
    
    if (!noteData || step < 0 || step >= gridWidth) return;

    const existingNote = notes.find(
      n => n.note === noteData.note && 
           n.octave === noteData.octave && 
           Math.floor(n.start) === step
    );

    if (drawMode === 'add' && !existingNote) {
      const newNote: Note = {
        id: `note-${Date.now()}-${Math.random()}`,
        note: noteData.note,
        octave: noteData.octave,
        start: step,
        duration: 1,
        velocity: 0.8,
      };
      onNotesChange([...notes, newNote]);
    } else if (drawMode === 'remove' && existingNote) {
      onNotesChange(notes.filter(n => n.id !== existingNote.id));
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleKeyClick = (note: string, octave: number) => {
    onPreviewNote(note, octave);
  };

  const isBlackKey = (note: string) => note.includes('#');

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">Piano Roll</h3>
        <div className="flex items-center space-x-2">
          {onSwitchToSimpleView && (
            <button
              onClick={onSwitchToSimpleView}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
            >
              Simple View
            </button>
          )}
          {onMeasuresChange && (
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">Measures:</label>
              <input
                type="number"
                min="1"
                max="200"
                value={measures}
                onChange={(e) => onMeasuresChange(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}
          <button
            onClick={() => onNotesChange([])}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="flex h-96">
        {/* Piano Keys */}
        <div 
          className="flex flex-col overflow-y-auto" 
          ref={scrollContainerRef}
          onScroll={handleScroll}
        >
          {OCTAVES.map(octave =>
            NOTES.map(note => {
              const isBlack = isBlackKey(note);
              const isC4 = note === 'C' && octave === 4;
              return (
                <button
                  key={`${note}${octave}`}
                  onClick={() => handleKeyClick(note, octave)}
                  className={`w-16 h-5 border border-gray-600 text-xs font-mono flex items-center justify-center transition-colors ${
                    isC4
                      ? 'bg-blue-500 text-white border-blue-400'
                      : isBlack
                      ? 'bg-gray-900 text-white hover:bg-gray-700'
                      : 'bg-white text-black hover:bg-gray-100'
                  }`}
                  style={{ height: `${CELL_HEIGHT}px` }}
                >
                  {note}{octave}
                </button>
              );
            })
          )}
        </div>

        {/* Grid */}
        <div 
          className="relative overflow-auto flex-1" 
          ref={gridScrollRef}
          onScroll={handleScroll}
        >
          <canvas
            ref={canvasRef}
            width={gridWidth * CELL_WIDTH}
            height={NOTES.length * OCTAVES.length * CELL_HEIGHT}
            className="border border-gray-600 cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          
          {/* Grid lines */}
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            width={gridWidth * CELL_WIDTH}
            height={NOTES.length * OCTAVES.length * CELL_HEIGHT}
          >
            {/* Vertical lines */}
            {Array.from({ length: gridWidth + 1 }, (_, i) => (
              <line
                key={`v-${i}`}
                x1={i * CELL_WIDTH}
                y1={0}
                x2={i * CELL_WIDTH}
                y2={NOTES.length * OCTAVES.length * CELL_HEIGHT}
                stroke={i % 4 === 0 ? '#6B7280' : '#374151'}
                strokeWidth={i % 4 === 0 ? 2 : 1}
              />
            ))}
            
            {/* Horizontal lines */}
            {Array.from({ length: NOTES.length * OCTAVES.length + 1 }, (_, i) => {
              const noteIndex = i % NOTES.length;
              const note = NOTES[noteIndex];
              const isC = note === 'C';
              
              return (
                <line
                  key={`h-${i}`}
                  x1={0}
                  y1={i * CELL_HEIGHT}
                  x2={gridWidth * CELL_WIDTH}
                  y2={i * CELL_HEIGHT}
                  stroke={isC ? '#6B7280' : '#374151'}
                  strokeWidth={isC ? 2 : 1}
                />
              );
            })}
            
            {/* Notes */}
            {notes.map(note => {
              const x = stepToPosition(note.start);
              const y = noteToPosition(note.note, note.octave);
              const width = CELL_WIDTH * note.duration - 2;
              
              if (y === -1) return null;
              
              return (
                <rect
                  key={note.id}
                  x={x + 1}
                  y={y + 1}
                  width={width}
                  height={CELL_HEIGHT - 2}
                  fill="#3B82F6"
                  stroke="#1E40AF"
                  strokeWidth={1}
                  rx={2}
                />
              );
            })}
            
            {/* Playhead */}
            {isPlaying && (
              <line
                x1={stepToPosition(playheadPosition)}
                y1={0}
                x2={stepToPosition(playheadPosition)}
                y2={NOTES.length * OCTAVES.length * CELL_HEIGHT}
                stroke="#EF4444"
                strokeWidth={2}
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}