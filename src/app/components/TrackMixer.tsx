'use client';

import { Track } from '../types/audio';

interface TrackMixerProps {
  track: Track;
  onVolumeChange: (trackId: string, volume: number) => void;
  onPanChange: (trackId: string, pan: number) => void;
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  onRemoveTrack: (trackId: string) => void;
}

export default function TrackMixer({
  track,
  onVolumeChange,
  onPanChange,
  onMuteToggle,
  onSoloToggle,
  onRemoveTrack,
}: TrackMixerProps) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg w-24 flex flex-col items-center space-y-3">
      <div className="text-white text-sm font-medium truncate w-full text-center">
        {track.name}
      </div>
      
      <div className="flex flex-col items-center space-y-2">
        <button
          onClick={() => onSoloToggle(track.id)}
          className={`px-2 py-1 text-xs rounded ${
            track.soloed
              ? 'bg-yellow-500 text-black'
              : 'bg-gray-600 text-white hover:bg-gray-500'
          }`}
        >
          SOLO
        </button>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onMuteToggle(track.id)}
            className={`px-2 py-1 text-xs rounded ${
              track.muted
                ? 'bg-red-500 text-white'
                : 'bg-gray-600 text-white hover:bg-gray-500'
            }`}
          >
            MUTE
          </button>
          
          <button
            onClick={() => onRemoveTrack(track.id)}
            className="px-1 py-1 bg-gray-600 hover:bg-gray-500 text-gray-300 hover:text-white text-xs rounded transition-colors"
            title="Delete track"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center space-y-2 w-full">
        <label className="text-white text-xs">PAN</label>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.1"
          value={track.pan}
          onChange={(e) => onPanChange(track.id, parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-white text-xs">
          {track.pan > 0 ? `R${Math.round(track.pan * 100)}` : 
           track.pan < 0 ? `L${Math.round(Math.abs(track.pan) * 100)}` : 'C'}
        </span>
      </div>

      <div className="flex flex-col items-center space-y-2 w-full flex-1">
        <label className="text-white text-xs">VOL</label>
        <div className="flex-1 w-full relative">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={track.volume}
            onChange={(e) => onVolumeChange(track.id, parseFloat(e.target.value))}
            className="w-full h-32 bg-gray-600 rounded-lg appearance-none cursor-pointer transform -rotate-90 origin-center"
            style={{ writingMode: 'vertical-lr' }}
          />
        </div>
        <span className="text-white text-xs">
          {Math.round(track.volume * 100)}%
        </span>
      </div>

    </div>
  );
}