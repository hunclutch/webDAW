'use client';

import { useEffect, useRef, useCallback } from 'react';

export interface KeyMapping {
  key: string;
  note: string;
  octave: number;
}

// キーボードレイアウト（ASD配列）に基づくマッピング
const DEFAULT_KEY_MAPPINGS: KeyMapping[] = [
  // 中段（メインオクターブ4）- ASDFGHJK...
  { key: 'a', note: 'C', octave: 4 },
  { key: 'w', note: 'C#', octave: 4 },
  { key: 's', note: 'D', octave: 4 },
  { key: 'e', note: 'D#', octave: 4 },
  { key: 'd', note: 'E', octave: 4 },
  { key: 'f', note: 'F', octave: 4 },
  { key: 't', note: 'F#', octave: 4 },
  { key: 'g', note: 'G', octave: 4 },
  { key: 'y', note: 'G#', octave: 4 },
  { key: 'h', note: 'A', octave: 4 },
  { key: 'u', note: 'A#', octave: 4 },
  { key: 'j', note: 'B', octave: 4 },
  
  // 下段（低音オクターブ3）- ZXCVBNM...
  { key: 'z', note: 'C', octave: 3 },
  { key: 'x', note: 'D', octave: 3 },
  { key: 'c', note: 'E', octave: 3 },
  { key: 'v', note: 'F', octave: 3 },
  { key: 'b', note: 'G', octave: 3 },
  { key: 'n', note: 'A', octave: 3 },
  { key: 'm', note: 'B', octave: 3 },
  
  // 上段（高音オクターブ5）- QWERTY...
  { key: 'q', note: 'C', octave: 5 },
  { key: '2', note: 'C#', octave: 5 },
  { key: 'w', note: 'D', octave: 5 },
  { key: '3', note: 'D#', octave: 5 },
  { key: 'e', note: 'E', octave: 5 },
  { key: 'r', note: 'F', octave: 5 },
  { key: '5', note: 'F#', octave: 5 },
  { key: 't', note: 'G', octave: 5 },
  { key: '6', note: 'G#', octave: 5 },
  { key: 'y', note: 'A', octave: 5 },
  { key: '7', note: 'A#', octave: 5 },
  { key: 'u', note: 'B', octave: 5 },
];

interface UseKeyboardPianoOptions {
  onNotePlay: (note: string, octave: number) => void;
  onNoteStop?: (note: string, octave: number) => void;
  keyMappings?: KeyMapping[];
  enabled?: boolean;
}

export function useKeyboardPiano({
  onNotePlay,
  onNoteStop,
  keyMappings = DEFAULT_KEY_MAPPINGS,
  enabled = true,
}: UseKeyboardPianoOptions) {
  const pressedKeysRef = useRef<Set<string>>(new Set());

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // メタキー（Ctrl、Alt、Cmd等）が押されている場合は無視
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    
    // フォーカスされた入力要素がある場合は無視
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.hasAttribute('contenteditable')
    )) {
      return;
    }

    const key = event.key.toLowerCase();
    
    // 既に押されているキーは無視（リピート防止）
    if (pressedKeysRef.current.has(key)) return;
    
    const mapping = keyMappings.find(m => m.key === key);
    if (mapping) {
      event.preventDefault();
      pressedKeysRef.current.add(key);
      onNotePlay(mapping.note, mapping.octave);
    }
  }, [enabled, keyMappings, onNotePlay]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    const key = event.key.toLowerCase();
    const mapping = keyMappings.find(m => m.key === key);
    
    if (mapping && pressedKeysRef.current.has(key)) {
      pressedKeysRef.current.delete(key);
      if (onNoteStop) {
        onNoteStop(mapping.note, mapping.octave);
      }
    }
  }, [enabled, keyMappings, onNoteStop]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      pressedKeysRef.current.clear();
    };
  }, [handleKeyDown, handleKeyUp, enabled]);

  // 現在押されているキーを取得する関数
  const getPressedKeys = useCallback(() => {
    return Array.from(pressedKeysRef.current);
  }, []);

  // 特定のキーが押されているかチェックする関数
  const isKeyPressed = useCallback((key: string) => {
    return pressedKeysRef.current.has(key.toLowerCase());
  }, []);

  return {
    getPressedKeys,
    isKeyPressed,
    keyMappings,
  };
}