'use client';

import { DrumPattern, DrumStep } from '../types/audio';

interface DrumPadsProps {
  pattern: DrumPattern;
  onPatternChange: (pattern: DrumPattern) => void;
  onDrumHit: (drumType: string) => void;
  isPlaying: boolean;
  currentStep: number;
}

const DRUM_TYPES = [
  { key: 'kick', name: 'Kick', color: 'bg-red-600', shortcut: 'Q' },
  { key: 'snare', name: 'Snare', color: 'bg-blue-600', shortcut: 'W' },
  { key: 'hihat', name: 'Hi-Hat', color: 'bg-yellow-600', shortcut: 'E' },
  { key: 'openhat', name: 'Open Hat', color: 'bg-green-600', shortcut: 'R' },
  { key: 'crash', name: 'Crash', color: 'bg-purple-600', shortcut: 'T' },
];

export default function DrumPads({
  pattern,
  onPatternChange,
  onDrumHit,
  isPlaying,
  currentStep,
}: DrumPadsProps) {
  const toggleStep = (stepIndex: number, drumType: string) => {
    const newSteps = [...pattern.steps];
    const step = newSteps[stepIndex];
    if (step) {
      (step as any)[drumType] = !(step as any)[drumType];
      onPatternChange({ ...pattern, steps: newSteps });
    }
  };

  const clearPattern = () => {
    const newSteps = pattern.steps.map(step => ({
      kick: false,
      snare: false,
      hihat: false,
      openhat: false,
      crash: false,
      velocity: step.velocity,
    }));
    onPatternChange({ ...pattern, steps: newSteps });
  };

  const randomizePattern = () => {
    const newSteps = pattern.steps.map(step => ({
      kick: Math.random() > 0.7,
      snare: Math.random() > 0.8,
      hihat: Math.random() > 0.5,
      openhat: Math.random() > 0.9,
      crash: Math.random() > 0.95,
      velocity: step.velocity,
    }));
    onPatternChange({ ...pattern, steps: newSteps });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">Drum Machine</h3>
        <div className="flex space-x-2">
          <button
            onClick={randomizePattern}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
          >
            Random
          </button>
          <button
            onClick={clearPattern}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Drum Pads */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {DRUM_TYPES.map((drum) => (
          <button
            key={drum.key}
            onClick={() => onDrumHit(drum.key)}
            className={`${drum.color} hover:opacity-80 text-white font-medium py-4 px-2 rounded-lg transition-all transform active:scale-95`}
          >
            <div className="text-center">
              <div className="text-sm">{drum.name}</div>
              <div className="text-xs opacity-75">{drum.shortcut}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Step Sequencer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-medium">Pattern</span>
          <span className="text-gray-400 text-xs">
            {pattern.length} steps
          </span>
        </div>

        {DRUM_TYPES.map((drum) => (
          <div key={drum.key} className="flex items-center space-x-1">
            <div className={`w-16 text-xs text-white font-medium py-1 px-2 rounded ${drum.color}`}>
              {drum.name}
            </div>
            
            <div className="flex space-x-1">
              {Array.from({ length: pattern.length }, (_, stepIndex) => {
                const step = pattern.steps[stepIndex];
                const isActive = step && (step as any)[drum.key];
                const isCurrent = isPlaying && currentStep === stepIndex;
                
                return (
                  <button
                    key={stepIndex}
                    onClick={() => toggleStep(stepIndex, drum.key)}
                    className={`w-6 h-6 rounded border transition-all ${
                      isActive
                        ? `${drum.color} border-white`
                        : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                    } ${
                      isCurrent ? 'ring-2 ring-yellow-400' : ''
                    }`}
                  >
                    {stepIndex % 4 === 0 && (
                      <div className="text-[8px] text-center leading-none">
                        {Math.floor(stepIndex / 4) + 1}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-400">
        Click pads to play sounds • Click grid to program pattern
      </div>
    </div>
  );
}