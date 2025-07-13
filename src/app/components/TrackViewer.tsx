'use client';

import { useRef, useCallback } from 'react';
import { Track } from '../types/audio';

interface TrackViewerProps {
  tracks: Track[];
  isPlaying: boolean;
  playheadPosition: number;
  measures?: number;
  onMeasuresChange?: (measures: number) => void;
  onDeleteTrack?: (trackId: string) => void;
}

// const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']; // 未使用
// const OCTAVES = [7, 6, 5, 4, 3, 2, 1]; // 未使用
const INITIAL_MEASURES = 20; // 20小節デフォルト
const STEPS_PER_MEASURE = 4; // 4分音符単位（4/4拍子で4分音符4つ = 1小節）
const CELL_WIDTH = 12; // Smaller cells for overview
// const CELL_HEIGHT = 10; // 未使用
const TRACK_HEIGHT = 60; // Height per track lane

// Track colors for visualization
const TRACK_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

export default function TrackViewer({
  tracks,
  isPlaying,
  playheadPosition,
  measures = INITIAL_MEASURES,
  onMeasuresChange,
  onDeleteTrack,
}: TrackViewerProps) {
  const gridWidth = measures * STEPS_PER_MEASURE; // 小節数 × 16分音符
  const gridScrollRef = useRef<HTMLDivElement>(null);

  const synthTracks = tracks.filter(track => track.type === 'synth');

  // スクロールハンドラーは無限スクロール不要なので簡略化
  const handleScroll = useCallback(() => {
    // スクロールイベントのみ処理
  }, []);

  const stepToPosition = (step: number) => step * CELL_WIDTH;
  
  const noteToMidiNumber = (note: string, octave: number) => {
    const noteNumbers: { [key: string]: number } = {
      'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
      'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
    };
    return octave * 12 + noteNumbers[note];
  };

  // Get track color
  const getTrackColor = (trackIndex: number) => {
    return TRACK_COLORS[trackIndex % TRACK_COLORS.length];
  };

  return (
    <div className="bg-gray-800 rounded-lg h-full flex flex-col" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      {/* Fixed Header */}
      <div className="flex items-center justify-between p-4 pb-2 border-b border-gray-700 flex-shrink-0">
        <h3 className="text-white font-medium">Track Overview</h3>
        <div className="flex items-center space-x-4">
          {onMeasuresChange && (
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400 whitespace-nowrap">Measures:</label>
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
          <div className="text-sm text-gray-400 whitespace-nowrap">
            {synthTracks.length} synth tracks
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 p-4 pt-2 overflow-hidden">
        <div className="h-96 flex flex-col">
        {/* Track Labels */}
        <div className="flex">
          <div className="w-40 flex flex-col">
            {synthTracks.map((track, index) => (
              <div
                key={track.id}
                className="h-15 flex items-center px-3 border-b border-gray-700"
                style={{ height: `${TRACK_HEIGHT}px` }}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: getTrackColor(index) }}
                    />
                    <div>
                      <div className="text-sm font-medium text-white">{track.name}</div>
                      <div className="text-xs text-gray-400">{track.notes.length} notes</div>
                    </div>
                  </div>
                  {onDeleteTrack && (
                    <button
                      onClick={() => onDeleteTrack(track.id)}
                      className="ml-2 px-2 py-1 bg-gray-600 hover:bg-gray-500 text-gray-300 hover:text-white text-xs rounded transition-colors"
                      title="Delete track"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
            {synthTracks.length === 0 && (
              <div className="h-15 flex items-center justify-center text-gray-400 text-sm">
                No synth tracks
              </div>
            )}
          </div>

          {/* Track Content */}
          <div 
            className="flex-1 overflow-x-auto"
            ref={gridScrollRef}
            onScroll={handleScroll}
          >
            <div className="relative" style={{ width: `${gridWidth * CELL_WIDTH}px` }}>
              {/* Grid lines */}
              <svg
                className="absolute top-0 left-0 pointer-events-none"
                width={gridWidth * CELL_WIDTH}
                height={synthTracks.length * TRACK_HEIGHT}
              >
                {/* Vertical lines (measures) */}
                {Array.from({ length: Math.floor(gridWidth / 4) + 1 }, (_, i) => (
                  <line
                    key={`measure-${i}`}
                    x1={i * 4 * CELL_WIDTH}
                    y1={0}
                    x2={i * 4 * CELL_WIDTH}
                    y2={synthTracks.length * TRACK_HEIGHT}
                    stroke="#4B5563"
                    strokeWidth={2}
                  />
                ))}
                
                {/* Beat lines */}
                {Array.from({ length: gridWidth + 1 }, (_, i) => (
                  <line
                    key={`beat-${i}`}
                    x1={i * CELL_WIDTH}
                    y1={0}
                    x2={i * CELL_WIDTH}
                    y2={synthTracks.length * TRACK_HEIGHT}
                    stroke="#374151"
                    strokeWidth={1}
                  />
                ))}

                {/* Track separator lines */}
                {Array.from({ length: synthTracks.length + 1 }, (_, i) => (
                  <line
                    key={`track-${i}`}
                    x1={0}
                    y1={i * TRACK_HEIGHT}
                    x2={gridWidth * CELL_WIDTH}
                    y2={i * TRACK_HEIGHT}
                    stroke="#374151"
                    strokeWidth={1}
                  />
                ))}
                
                {/* Notes for each track */}
                {synthTracks.map((track, trackIndex) => {
                  const trackColor = getTrackColor(trackIndex);
                  const trackY = trackIndex * TRACK_HEIGHT;
                  
                  // Group notes by time to create MIDI blocks
                  const noteBlocks: { [key: number]: { minPitch: number; maxPitch: number; duration: number } } = {};
                  
                  track.notes.forEach(note => {
                    const step = Math.floor(note.start);
                    const pitch = noteToMidiNumber(note.note, note.octave);
                    
                    if (!noteBlocks[step]) {
                      noteBlocks[step] = { minPitch: pitch, maxPitch: pitch, duration: note.duration };
                    } else {
                      noteBlocks[step].minPitch = Math.min(noteBlocks[step].minPitch, pitch);
                      noteBlocks[step].maxPitch = Math.max(noteBlocks[step].maxPitch, pitch);
                      noteBlocks[step].duration = Math.max(noteBlocks[step].duration, note.duration);
                    }
                  });
                  
                  return Object.entries(noteBlocks).map(([step, block]) => {
                    const x = stepToPosition(parseInt(step));
                    const width = CELL_WIDTH * block.duration - 1;
                    const height = Math.max(8, Math.min(TRACK_HEIGHT - 10, (block.maxPitch - block.minPitch + 1) * 2));
                    const y = trackY + (TRACK_HEIGHT - height) / 2;
                    
                    return (
                      <rect
                        key={`${track.id}-${step}`}
                        x={x + 1}
                        y={y}
                        width={width}
                        height={height}
                        fill={trackColor}
                        fillOpacity={0.8}
                        stroke={trackColor}
                        strokeWidth={1}
                        rx={2}
                      />
                    );
                  });
                })}
                
                {/* Playhead */}
                {isPlaying && (
                  <line
                    x1={stepToPosition(playheadPosition)}
                    y1={0}
                    x2={stepToPosition(playheadPosition)}
                    y2={synthTracks.length * TRACK_HEIGHT}
                    stroke="#EF4444"
                    strokeWidth={3}
                  />
                )}
              </svg>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Instructions */}
      {synthTracks.length === 0 && (
        <div className="p-4 pt-2 text-center text-gray-400">
          <p>Create synth tracks to see MIDI data visualization</p>
        </div>
      )}
    </div>
  );
}