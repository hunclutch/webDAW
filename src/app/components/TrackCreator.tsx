'use client';

import { Track, SynthSettings } from '../types/audio';

interface TrackCreatorProps {
  onCreateTrack: (track: Omit<Track, 'id'>) => void;
}

const SYNTH_PRESETS: { [key: string]: SynthSettings } = {
  lead: {
    waveform: 'sawtooth',
    attack: 0.01,
    decay: 0.3,
    sustain: 0.6,
    release: 0.8,
    filterFreq: 3000,
    filterQ: 2,
  },
  bass: {
    waveform: 'square',
    attack: 0.01,
    decay: 0.4,
    sustain: 0.8,
    release: 0.3,
    filterFreq: 800,
    filterQ: 1,
  },
  pad: {
    waveform: 'sine',
    attack: 0.8,
    decay: 0.2,
    sustain: 0.9,
    release: 1.5,
    filterFreq: 2000,
    filterQ: 0.5,
  },
  pluck: {
    waveform: 'triangle',
    attack: 0.01,
    decay: 0.5,
    sustain: 0.3,
    release: 0.7,
    filterFreq: 4000,
    filterQ: 3,
  },
};

export default function TrackCreator({ onCreateTrack }: TrackCreatorProps) {
  const createSynthTrack = (preset: string) => {
    const track: Omit<Track, 'id'> = {
      name: `${preset.charAt(0).toUpperCase() + preset.slice(1)} Synth`,
      type: 'synth',
      audioBuffer: null,
      volume: 0.8,
      pan: 0,
      muted: false,
      soloed: false,
      effects: [],
      notes: [],
      synthSettings: SYNTH_PRESETS[preset],
    };
    onCreateTrack(track);
  };

  const createDrumTrack = () => {
    const track: Omit<Track, 'id'> = {
      name: 'Drum Track',
      type: 'drum',
      audioBuffer: null,
      volume: 0.8,
      pan: 0,
      muted: false,
      soloed: false,
      effects: [],
      notes: [],
      drumPattern: {
        steps: Array.from({ length: 16 }, () => ({
          kick: false,
          snare: false,
          hihat: false,
          openhat: false,
          crash: false,
          velocity: 0.8,
        })),
        length: 16,
      },
    };
    onCreateTrack(track);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-6">Create New Track</h2>
      
      <div className="space-y-6">
        {/* Synthesizer Tracks */}
        <div>
          <h3 className="text-lg font-medium text-white mb-3">Synthesizer</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.keys(SYNTH_PRESETS).map((preset) => (
              <button
                key={preset}
                onClick={() => createSynthTrack(preset)}
                className="p-4 bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white rounded-lg transition-all transform hover:scale-105"
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">🎹</div>
                  <div className="font-medium capitalize">{preset}</div>
                  <div className="text-xs opacity-75 mt-1">
                    {SYNTH_PRESETS[preset].waveform}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Drum Track */}
        <div>
          <h3 className="text-lg font-medium text-white mb-3">Drums</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={createDrumTrack}
              className="p-4 bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white rounded-lg transition-all transform hover:scale-105"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">🥁</div>
                <div className="font-medium">Drum Machine</div>
                <div className="text-xs opacity-75 mt-1">
                  16-step sequencer
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-white mb-2">Getting Started</h4>
        <ul className="text-xs text-gray-300 space-y-1">
          <li>• Create synthesizer tracks for melodies and basslines</li>
          <li>• Add drum tracks for rhythm patterns</li>
          <li>• Use the piano roll to compose melodies</li>
          <li>• Program drum patterns with the step sequencer</li>
          <li>• Mix and add effects to your tracks</li>
        </ul>
      </div>
    </div>
  );
}