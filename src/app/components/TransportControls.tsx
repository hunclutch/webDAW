'use client';

interface TransportControlsProps {
  isPlaying: boolean;
  isRecording: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onRecord: () => void;
  currentTime: number;
  bpm: number;
  onBpmChange: (bpm: number) => void;
}

export default function TransportControls({
  isPlaying,
  isRecording,
  onPlay,
  onPause,
  onStop,
  onRecord,
  currentTime,
  bpm,
  onBpmChange,
}: TransportControlsProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-1">
        <button
          onClick={isPlaying ? onPause : onPlay}
          className={`p-2 rounded ${
            isPlaying
              ? 'bg-orange-500 hover:bg-orange-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        
        <button
          onClick={onStop}
          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded"
        >
          ⏹️
        </button>
        
        <button
          onClick={onRecord}
          className={`p-2 rounded ${
            isRecording
              ? 'bg-red-600 animate-pulse text-white'
              : 'bg-gray-600 hover:bg-gray-500 text-white'
          }`}
        >
          🔴
        </button>
      </div>

      <div className="flex items-center space-x-3 text-white text-sm">
        <div className="bg-gray-900 px-2 py-1 rounded font-mono">
          {formatTime(currentTime)}
        </div>
        
        <div className="flex items-center space-x-1">
          <label>BPM:</label>
          <input
            type="number"
            min="60"
            max="200"
            value={bpm}
            onChange={(e) => onBpmChange(parseInt(e.target.value))}
            className="bg-gray-700 text-white px-2 py-1 rounded w-14 text-center text-sm"
          />
        </div>
      </div>
    </div>
  );
}