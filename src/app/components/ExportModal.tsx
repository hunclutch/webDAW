'use client';

import { useState } from 'react';
import { Track } from '../types/audio';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: 'wav' | 'mp3', filename: string, bitDepth: 16 | 24) => void;
  tracks: Track[];
  measures: number;
}

export default function ExportModal({
  isOpen,
  onClose,
  onExport,
  tracks,
  measures,
}: ExportModalProps) {
  const [format, setFormat] = useState<'wav' | 'mp3'>('wav');
  const [filename, setFilename] = useState('my-song');
  const [bitDepth, setBitDepth] = useState<16 | 24>(16);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!filename.trim()) {
      alert('Please enter a filename');
      return;
    }

    setIsExporting(true);
    try {
      await onExport(format, filename.trim(), bitDepth);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const synthTracks = tracks.filter(track => track.type === 'synth');
  const drumTracks = tracks.filter(track => track.type === 'drum');
  const totalNotes = synthTracks.reduce((sum, track) => sum + track.notes.length, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Export Audio</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            disabled={isExporting}
          >
            ✕
          </button>
        </div>

        {/* Project Info */}
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <h3 className="text-sm font-medium text-white mb-2">Project Info</h3>
          <div className="text-xs text-gray-300 space-y-1">
            <div>Measures: {measures}</div>
            <div>Synth Tracks: {synthTracks.length}</div>
            <div>Drum Tracks: {drumTracks.length}</div>
            <div>Total Notes: {totalNotes}</div>
          </div>
        </div>

        {/* Format Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white mb-3">
            Export Format
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="format"
                value="wav"
                checked={format === 'wav'}
                onChange={(e) => setFormat(e.target.value as 'wav')}
                className="mr-3"
                disabled={isExporting}
              />
              <span className="text-gray-300">
                WAV (Uncompressed, High Quality)
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="format"
                value="mp3"
                checked={format === 'mp3'}
                onChange={(e) => setFormat(e.target.value as 'mp3')}
                className="mr-3"
                disabled={isExporting}
              />
              <span className="text-gray-300">
                MP3 (Compressed, Smaller File Size)
              </span>
            </label>
          </div>
        </div>

        {/* Bit Depth Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white mb-3">
            Audio Quality {format === 'mp3' && <span className="text-xs text-gray-400">(WAV only)</span>}
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="bitDepth"
                value="16"
                checked={bitDepth === 16}
                onChange={(e) => setBitDepth(parseInt(e.target.value) as 16 | 24)}
                className="mr-3"
                disabled={isExporting || format === 'mp3'}
              />
              <span className="text-gray-300">
                16-bit (Standard CD Quality)
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="bitDepth"
                value="24"
                checked={bitDepth === 24}
                onChange={(e) => setBitDepth(parseInt(e.target.value) as 16 | 24)}
                className="mr-3"
                disabled={isExporting || format === 'mp3'}
              />
              <span className="text-gray-300">
                24-bit (High Resolution Audio)
              </span>
            </label>
          </div>
        </div>

        {/* Filename Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white mb-2">
            Filename
          </label>
          <div className="flex">
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-l border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="Enter filename"
              disabled={isExporting}
            />
            <div className="px-3 py-2 bg-gray-600 text-gray-300 rounded-r border border-gray-600 border-l-0">
              .{format}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded"
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:bg-gray-500"
            disabled={isExporting || tracks.length === 0}
          >
            {isExporting ? (format === 'mp3' ? 'Encoding MP3...' : 'Rendering WAV...') : 'Export'}
          </button>
        </div>

        {tracks.length === 0 && (
          <div className="mt-4 p-3 bg-yellow-600 bg-opacity-20 border border-yellow-600 rounded text-yellow-200 text-sm">
            ⚠️ No tracks to export. Create some tracks first.
          </div>
        )}

        {format === 'mp3' && (
          <div className="mt-4 p-3 bg-blue-600 bg-opacity-20 border border-blue-600 rounded text-blue-200 text-sm">
            ℹ️ MP3 export uses 128kbps compression. First export may take longer as MP3 encoder loads.
          </div>
        )}
      </div>
    </div>
  );
}