'use client';

import { useEffect, useRef, useState } from 'react';

export const useAudioContext = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const initializeAudioContext = async () => {
    if (audioContextRef.current) {
      return audioContextRef.current;
    }

    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.connect(audioContextRef.current.destination);
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      setIsInitialized(true);
      return audioContextRef.current;
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error);
      throw error;
    }
  };

  const getAudioContext = () => audioContextRef.current;
  const getMasterGain = () => masterGainRef.current;

  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    isInitialized,
    initializeAudioContext,
    getAudioContext,
    getMasterGain,
  };
};