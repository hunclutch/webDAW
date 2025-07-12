'use client';

import { Effect } from '../types/audio';

interface EffectRackProps {
  trackId: string;
  effects: Effect[];
  onEffectToggle: (trackId: string, effectId: string) => void;
  onEffectParameterChange: (trackId: string, effectId: string, parameter: string, value: number) => void;
  onAddEffect: (trackId: string, effectType: Effect['type']) => void;
  onRemoveEffect: (trackId: string, effectId: string) => void;
}

export default function EffectRack({
  trackId,
  effects,
  onEffectToggle,
  onEffectParameterChange,
  onAddEffect,
  onRemoveEffect,
}: EffectRackProps) {
  return (
    <div className="bg-gray-700 p-4 rounded-lg">
      <h3 className="text-white font-medium mb-3">Effects</h3>
      
      <div className="space-y-3">
        {effects.map((effect) => (
          <div key={effect.id} className="bg-gray-800 p-3 rounded border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium">{effect.name}</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onEffectToggle(trackId, effect.id)}
                  className={`px-2 py-1 text-xs rounded ${
                    effect.enabled
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  {effect.enabled ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => onRemoveEffect(trackId, effect.id)}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  ×
                </button>
              </div>
            </div>
            
            {effect.enabled && (
              <div className="space-y-2">
                {Object.entries(effect.parameters).map(([param, value]) => (
                  <div key={param} className="flex items-center space-x-2">
                    <label className="text-white text-xs w-16">{param}:</label>
                    <input
                      type="range"
                      min={getParameterRange(effect.type, param).min}
                      max={getParameterRange(effect.type, param).max}
                      step={getParameterRange(effect.type, param).step}
                      value={value}
                      onChange={(e) =>
                        onEffectParameterChange(
                          trackId,
                          effect.id,
                          param,
                          parseFloat(e.target.value)
                        )
                      }
                      className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-white text-xs w-12 text-right">
                      {value.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        
        <div className="flex space-x-2">
          <select
            onChange={(e) => {
              if (e.target.value) {
                onAddEffect(trackId, e.target.value as Effect['type']);
                e.target.value = '';
              }
            }}
            className="bg-gray-800 text-white px-3 py-2 rounded text-sm"
            defaultValue=""
          >
            <option value="" disabled>Add Effect</option>
            <option value="filter">Filter</option>
            <option value="delay">Delay</option>
            <option value="reverb">Reverb</option>
            <option value="distortion">Distortion</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function getParameterRange(effectType: Effect['type'], parameter: string) {
  const ranges: Record<string, Record<string, { min: number; max: number; step: number }>> = {
    filter: {
      frequency: { min: 20, max: 20000, step: 10 },
      resonance: { min: 0.1, max: 30, step: 0.1 },
    },
    delay: {
      time: { min: 0, max: 1, step: 0.01 },
      feedback: { min: 0, max: 0.9, step: 0.01 },
      wet: { min: 0, max: 1, step: 0.01 },
    },
    reverb: {
      roomSize: { min: 0, max: 1, step: 0.01 },
      dampening: { min: 0, max: 1, step: 0.01 },
      wet: { min: 0, max: 1, step: 0.01 },
    },
    distortion: {
      amount: { min: 0, max: 100, step: 1 },
      tone: { min: 0, max: 1, step: 0.01 },
    },
  };

  return ranges[effectType]?.[parameter] || { min: 0, max: 1, step: 0.01 };
}