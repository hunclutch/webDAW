'use client';

import { useRef, useCallback } from 'react';
import { Track } from '../types/audio';

interface InlineMidiViewerProps {
  tracks: Track[];
  selectedTrackId: string | null;
  isPlaying: boolean;
  playheadPosition: number;
  measures: number;
  onMeasuresChange: (measures: number) => void;
  onTrackSelect: (trackId: string) => void;
  onSwitchToDetailView?: () => void;
  onDeleteTrack?: (trackId: string) => void;
}

const STEPS_PER_MEASURE = 4; // 4分音符単位（4/4拍子で4分音符4つ = 1小節）
const CELL_WIDTH = 8; // より小さなセル
const TRACK_HEIGHT = 60; // サイドトラックと同じ高さ

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

export default function InlineMidiViewer({
  tracks,
  selectedTrackId,
  isPlaying,
  playheadPosition,
  measures,
  onMeasuresChange,
  onTrackSelect,
  onSwitchToDetailView,
  onDeleteTrack,
}: InlineMidiViewerProps) {
  const gridScrollRef = useRef<HTMLDivElement>(null);
  
  const gridWidth = measures * STEPS_PER_MEASURE;
  const synthTracks = tracks.filter(track => track.type === 'synth');

  const handleScroll = useCallback(() => {
    // スクロールイベントの処理
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
    <div className="bg-gray-800 rounded-lg flex flex-col" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      {/* Fixed Header */}
      <div className="flex items-center justify-between p-4 pb-2 border-b border-gray-700 flex-shrink-0">
        <h3 className="text-white font-medium">Track Arrangement</h3>
        <div className="flex items-center space-x-4">
          {onSwitchToDetailView && (
            <button
              onClick={onSwitchToDetailView}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded whitespace-nowrap"
            >
              Piano Roll View
            </button>
          )}
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
          <div className="text-sm text-gray-400 whitespace-nowrap">
            {synthTracks.length} tracks
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 p-4 pt-2">

      <div className="flex">
        {/* Track Labels - サイドトラックと同じスタイル */}
        <div className="w-80 flex flex-col border-r border-gray-700">
          {synthTracks.map((track, index) => (
            <div
              key={track.id}
              className={`p-3 cursor-pointer transition-all hover:bg-gray-700 border-b border-gray-700 ${
                selectedTrackId === track.id ? 'bg-blue-600' : 'bg-gray-750'
              }`}
              style={{ height: `${TRACK_HEIGHT}px` }}
              onClick={() => onTrackSelect(track.id)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm text-white">{track.name}</div>
                  <div className="text-xs text-gray-400 capitalize">{track.type}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: getTrackColor(index) }}
                    />
                    <span className="text-xs text-gray-400">{track.notes.length}</span>
                  </div>
                  {onDeleteTrack && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTrack(track.id);
                      }}
                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded opacity-70 hover:opacity-100"
                      title="Delete track"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mt-2 flex items-center space-x-2">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={track.volume}
                  onChange={() => {}} // 読み取り専用
                  className="flex-1 h-1"
                  onClick={(e) => e.stopPropagation()}
                  disabled
                />
                <span className="text-xs w-8 text-right">
                  {Math.round(track.volume * 100)}
                </span>
              </div>
            </div>
          ))}
          {synthTracks.length === 0 && (
            <div className="h-15 flex items-center justify-center text-gray-400 text-sm">
              No synth tracks
            </div>
          )}
        </div>

        {/* MIDI Content */}
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
              {Array.from({ length: measures + 1 }, (_, i) => (
                <line
                  key={`measure-${i}`}
                  x1={i * STEPS_PER_MEASURE * CELL_WIDTH}
                  y1={0}
                  x2={i * STEPS_PER_MEASURE * CELL_WIDTH}
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
                  x2={i * 4 * CELL_WIDTH}
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
                const noteBlocks: { [key: number]: { minPitch: number; maxPitch: number; duration: number; count: number } } = {};
                
                track.notes.forEach(note => {
                  const step = Math.floor(note.start);
                  const pitch = noteToMidiNumber(note.note, note.octave);
                  
                  if (!noteBlocks[step]) {
                    noteBlocks[step] = { minPitch: pitch, maxPitch: pitch, duration: note.duration, count: 1 };
                  } else {
                    noteBlocks[step].minPitch = Math.min(noteBlocks[step].minPitch, pitch);
                    noteBlocks[step].maxPitch = Math.max(noteBlocks[step].maxPitch, pitch);
                    noteBlocks[step].duration = Math.max(noteBlocks[step].duration, note.duration);
                    noteBlocks[step].count++;
                  }
                });
                
                return Object.entries(noteBlocks).map(([step, block]) => {
                  const x = stepToPosition(parseInt(step));
                  const width = Math.max(4, CELL_WIDTH * block.duration - 1);
                  const height = Math.max(8, Math.min(TRACK_HEIGHT - 10, 
                    Math.max(12, (block.maxPitch - block.minPitch + 1) * 2 + block.count * 2)
                  ));
                  const y = trackY + (TRACK_HEIGHT - height) / 2;
                  
                  return (
                    <rect
                      key={`${track.id}-${step}`}
                      x={x + 1}
                      y={y}
                      width={width}
                      height={height}
                      fill={trackColor}
                      fillOpacity={selectedTrackId === track.id ? 1 : 0.7}
                      stroke={trackColor}
                      strokeWidth={selectedTrackId === track.id ? 2 : 1}
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

      {/* Instructions */}
      {synthTracks.length === 0 && (
        <div className="p-4 pt-2 text-center text-gray-400">
          <p>Create synth tracks to see MIDI arrangement</p>
        </div>
      )}
    </div>
  );
}