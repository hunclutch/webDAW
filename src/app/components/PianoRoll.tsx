'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Note, DrumPattern } from '../types/audio';
import BasslineGenerator from './BasslineGenerator';
import MelodyGenerator from './MelodyGenerator';

interface PianoRollProps {
  notes: Note[];
  onNotesChange: (notes: Note[]) => void;
  onPreviewNote: (note: string, octave: number) => void;
  isPlaying: boolean;
  playheadPosition: number;
  measures?: number;
  onMeasuresChange?: (measures: number) => void;
  trackType?: 'synth' | 'drum' | 'bass' | 'audio';
  drumPattern?: DrumPattern;
  onClose?: () => void;
  onPlay?: () => void;
  onStop?: () => void;
  onGenerateMelody?: (generatedNotes: Note[]) => void;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVES = [1, 2, 3, 4, 5, 6, 7]; // Low to high for visual layout
const INITIAL_MEASURES = 20; // 20小節デフォルト
// 1小節 = 16ステップ（16分音符ベース）
const BASE_CELL_WIDTH = 24;
const CELL_HEIGHT = 20;
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2, 3, 4]; // ズームレベル
const DRAG_THRESHOLD = 5; // ドラッグと判定するピクセル距離

// ドラム用のマッピング（オクターブ4の音程をドラムに対応）
const DRUM_MAPPING = [
  { note: 'C', octave: 4, name: 'Kick', color: '#EF4444' },
  { note: 'D', octave: 4, name: 'Snare', color: '#3B82F6' },
  { note: 'F#', octave: 4, name: 'Hi-Hat', color: '#EAB308' },
  { note: 'A#', octave: 4, name: 'Open Hat', color: '#22C55E' },
  { note: 'C', octave: 5, name: 'Crash', color: '#A855F7' },
];

export default function PianoRoll({
  notes,
  onNotesChange,
  onPreviewNote,
  isPlaying,
  playheadPosition,
  measures = INITIAL_MEASURES,
  onMeasuresChange,
  trackType = 'synth',
  drumPattern,
  onClose,
  onGenerateMelody,
  onPlay,
  onStop,
}: PianoRollProps) {
  // const [selectedNote, setSelectedNote] = useState<string | null>(null); // 未使用のためコメントアウト
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'add' | 'remove' | 'resize' | 'move'>('add');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartNote, setDragStartNote] = useState<Note | null>(null);
  const [dragStartStep, setDragStartStep] = useState<number>(0);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeTarget, setResizeTarget] = useState<Note | null>(null);
  const [resizeEdge, setResizeEdge] = useState<'start' | 'end' | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [moveTarget, setMoveTarget] = useState<Note | null>(null);
  const [moveStartPos, setMoveStartPos] = useState<{ x: number; y: number } | null>(null);
  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  const [lastPreviewTime, setLastPreviewTime] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(2); // デフォルトズームレベルインデックス
  const [showBassGenerator, setShowBassGenerator] = useState(false);
  const [showMelodyGenerator, setShowMelodyGenerator] = useState(false);
  const gridWidth = measures * 16; // 小節数 × 16分音符（1小節 = 16ステップ）

  // ドラムパターンをノートに変換
  const drumPatternToNotes = useCallback((pattern: DrumPattern): Note[] => {
    const notes: Note[] = [];
    const drumMapping = {
      kick: { note: 'C', octave: 4 },
      snare: { note: 'D', octave: 4 },
      hihat: { note: 'F#', octave: 4 },
      openhat: { note: 'A#', octave: 4 },
      crash: { note: 'C', octave: 5 },
    };

    // 全小節にわたってパターンを繰り返し
    for (let measure = 0; measure < measures; measure++) {
      pattern.steps.forEach((step, stepIndex) => {
        Object.entries(drumMapping).forEach(([drumType, noteInfo]) => {
          if ((step as any)[drumType]) {
            notes.push({
              id: `drum-${drumType}-${measure}-${stepIndex}-${Date.now()}`,
              note: noteInfo.note,
              octave: noteInfo.octave,
              start: measure * 16 + stepIndex, // 16ステップ/小節
              duration: 1,
              velocity: step.velocity,
            });
          }
        });
      });
    }

    return notes;
  }, [measures]);

  // 表示用のノート配列（実際のnotesかドラムパターンから変換）
  const displayNotes = trackType === 'drum' && drumPattern && notes.length === 0 
    ? drumPatternToNotes(drumPattern)
    : notes;
  const CELL_WIDTH = BASE_CELL_WIDTH * ZOOM_LEVELS[zoomLevel]; // ズームに応じたセル幅
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  const positionToNote = useCallback((y: number) => {
    const totalNotes = NOTES.length * OCTAVES.length;
    const indexFromTop = Math.floor(y / CELL_HEIGHT);
    if (indexFromTop < 0 || indexFromTop >= totalNotes) return null;

    const indexFromBottom = totalNotes - 1 - indexFromTop;
    const octaveIndex = Math.floor(indexFromBottom / NOTES.length);
    const noteIndex = indexFromBottom % NOTES.length;

    return {
      note: NOTES[noteIndex],
      octave: OCTAVES[octaveIndex],
    };
  }, []);

  const noteToPosition = useCallback((note: string, octave: number) => {
    const octaveIndex = OCTAVES.indexOf(octave);
    const noteIndex = NOTES.indexOf(note);
    if (octaveIndex === -1 || noteIndex === -1) return -1;

    const totalNotes = NOTES.length * OCTAVES.length;
    const indexFromBottom = octaveIndex * NOTES.length + noteIndex;
    const indexFromTop = totalNotes - 1 - indexFromBottom;
    
    return indexFromTop * CELL_HEIGHT;
  }, []);

  // C4を中央に配置とスクロール同期
  useEffect(() => {
    if (scrollContainerRef.current && gridScrollRef.current) {
      const c4Position = noteToPosition('C', 4);
      if (c4Position === -1) return;

      // コンテナの高さの半分を取得
      const containerHeight = scrollContainerRef.current.clientHeight;
      const scrollTop = c4Position - containerHeight / 2 + CELL_HEIGHT / 2;
      
      const finalScrollTop = Math.max(0, scrollTop);
      scrollContainerRef.current.scrollTop = finalScrollTop;
      gridScrollRef.current.scrollTop = finalScrollTop;
    }
  }, [noteToPosition]);
  
  // 小節数やズームレベルが変更されたときのcanvas再描画
  useEffect(() => {
    console.log('Canvas update - Measures:', measures, 'Grid width:', gridWidth, 'Zoom:', ZOOM_LEVELS[zoomLevel]);
    
    // Canvasサイズを強制的に更新
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const newWidth = gridWidth * CELL_WIDTH;
      const newHeight = NOTES.length * OCTAVES.length * CELL_HEIGHT;
      
      // Canvas内部解像度を設定
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // CSS表示サイズも更新
      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;
      
      console.log('Canvas resized to:', { width: newWidth, height: newHeight });
    }
  }, [measures, gridWidth, CELL_WIDTH, zoomLevel]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const scrollLeft = e.currentTarget.scrollLeft;
    
    if (scrollContainerRef.current && gridScrollRef.current && rulerRef.current) {
      if (e.currentTarget === scrollContainerRef.current) {
        // ピアノキーのスクロール → グリッドの縦スクロール同期
        gridScrollRef.current.scrollTop = scrollTop;
      } else if (e.currentTarget === gridScrollRef.current) {
        // グリッドのスクロール → ピアノキーの縦スクロール同期 + ルーラーの横スクロール同期
        scrollContainerRef.current.scrollTop = scrollTop;
        rulerRef.current.scrollLeft = scrollLeft;
      } else if (e.currentTarget === rulerRef.current) {
        // ルーラーのスクロール → グリッドの横スクロール同期
        gridScrollRef.current.scrollLeft = scrollLeft;
      }
    }
  }, []);

  // const getNoteKey = (note: string, octave: number) => `${note}${octave}`;

  const positionToStep = (x: number) => {
    return Math.round((x / CELL_WIDTH) * 4) / 4; // 0.25ステップ単位で丸める
  };

  const stepToPosition = (step: number) => step * CELL_WIDTH;

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const step = positionToStep(x);
    const noteData = positionToNote(y);
    
    if (!noteData || step < 0 || step >= gridWidth) return;

    // マウス位置を記録
    setMouseDownPos({ x, y });
    setHasMoved(false);

    const clickedNote = getNoteAtPosition(step, noteData);

    if (clickedNote) {
      // 既存ノートをクリックした場合
      const edge = isNearNoteEdge(clickedNote, x);
      if (edge) {
        // ノートの端をクリック - リサイズモード準備
        setResizeTarget(clickedNote);
        setResizeEdge(edge);
        setDrawMode('resize');
      } else {
        // ノートの中央をクリック - 移動モード準備
        setDrawMode('move');
        setMoveTarget(clickedNote);
        setMoveStartPos({ x, y });
      }
    } else {
      // 空の場所をクリック - 新しいノート作成準備
      setDrawMode('add');
      const newNote: Note = {
        id: `note-${Date.now()}-${Math.random()}`,
        note: noteData.note,
        octave: noteData.octave,
        start: step,
        duration: 1,
        velocity: 0.8,
      };
      
      setDragStartNote(newNote);
      setDragStartStep(step);
      onNotesChange([...notes, newNote]);
      
      // プレビュー音の再生頻度を制限（100ms間隔）
      const now = Date.now();
      if (now - lastPreviewTime > 100) {
        onPreviewNote(noteData.note, noteData.octave);
        setLastPreviewTime(now);
      }
    }

    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const step = positionToStep(x);
    
    // マウスが移動したかチェック
    if (mouseDownPos && !hasMoved) {
      const deltaX = Math.abs(x - mouseDownPos.x);
      const deltaY = Math.abs(y - mouseDownPos.y);
      if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
        setHasMoved(true);
        
        // ドラッグ開始時の処理
        if (drawMode === 'add' && dragStartNote) {
          setIsDragging(true);
        } else if (drawMode === 'resize' && resizeTarget) {
          setIsResizing(true);
        } else if (drawMode === 'move' && moveTarget) {
          setIsMoving(true);
        }
      }
    }

    if (step < 0 || step >= gridWidth) return;

    if (isDragging && dragStartNote) {
      // 新しいノートのドラッグ中 - 長さを調整
      const newDuration = Math.max(0.25, step - dragStartStep + 1);
      const updatedNotes = notes.map(n => 
        n.id === dragStartNote.id ? { ...n, duration: newDuration } : n
      );
      onNotesChange(updatedNotes);
    } else if (isResizing && resizeTarget && resizeEdge) {
      // 既存ノートのリサイズ中
      if (resizeEdge === 'end') {
        // 右端をドラッグ - 右に伸びる（正の方向）、左に縮む（負の方向）
        const newEnd = Math.max(resizeTarget.start + 0.25, step + 1); // 最小0.25ステップの長さを保証
        const newDuration = newEnd - resizeTarget.start;
        const updatedNotes = notes.map(n => 
          n.id === resizeTarget.id ? { ...n, duration: newDuration } : n
        );
        onNotesChange(updatedNotes);
      } else if (resizeEdge === 'start') {
        // 左端をドラッグ - 左に伸びる（負の方向）、右に縮む（正の方向）
        const originalEnd = resizeTarget.start + resizeTarget.duration;
        const newStart = Math.max(0, Math.min(step, originalEnd - 0.25)); // 最小0.25ステップの長さを保証
        const newDuration = originalEnd - newStart;
        const updatedNotes = notes.map(n => 
          n.id === resizeTarget.id ? { ...n, start: newStart, duration: newDuration } : n
        );
        onNotesChange(updatedNotes);
      }
    } else if (isMoving && moveTarget) {
      // ノートの移動中 - 位置と音程を変更
      const noteData = positionToNote(y);
      if (noteData) {
        const updatedNotes = notes.map(n => 
          n.id === moveTarget.id ? { 
            ...n, 
            start: step,
            note: noteData.note,
            octave: noteData.octave
          } : n
        );
        onNotesChange(updatedNotes);
      }
    } else if (hasMoved && drawMode === 'add') {
      // 従来のドローモード - 新しいノート追加
      const noteData = positionToNote(y);
      
      if (!noteData) return;

      const existingNote = notes.find(
        n => n.note === noteData.note && 
             n.octave === noteData.octave && 
             Math.floor(n.start) === step
      );

      if (!existingNote) {
        const newNote: Note = {
          id: `note-${Date.now()}-${Math.random()}`,
          note: noteData.note,
          octave: noteData.octave,
          start: step,
          duration: 1,
          velocity: 0.8,
        };
        onNotesChange([...notes, newNote]);
      }
    }
  };

  const handleMouseUp = () => {
    // ドラッグしていない場合のクリック処理（削除はダブルクリックに変更）
    // 単一クリックではノート削除を行わない（移動機能と競合するため）
    

    setIsDrawing(false);
    setIsDragging(false);
    setDragStartNote(null);
    setDragStartStep(0);
    setIsResizing(false);
    setResizeTarget(null);
    setResizeEdge(null);
    setIsMoving(false);
    setMoveTarget(null);
    setMoveStartPos(null);
    setMouseDownPos(null);
    setHasMoved(false);
  };

  const handleKeyClick = (note: string, octave: number) => {
    // ピアノキーのクリックは制限なしでプレビュー音を再生
    onPreviewNote(note, octave);
  };

  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const step = positionToStep(x);
    const noteData = positionToNote(y);
    
    if (!noteData || step < 0 || step >= gridWidth) return;

    const clickedNote = getNoteAtPosition(step, noteData);
    if (clickedNote) {
      // リサイズハンドル以外の場所でダブルクリックした場合のみ削除
      const edge = isNearNoteEdge(clickedNote, x);
      if (!edge) {
        onNotesChange(notes.filter(n => n.id !== clickedNote.id));
      }
    }
  };

  const isBlackKey = (note: string) => note.includes('#');

  // ドラム名を取得するヘルパー関数
  const getDrumName = (note: string, octave: number): string | null => {
    if (trackType !== 'drum') return null;
    const drumMapping = DRUM_MAPPING.find(d => d.note === note && d.octave === octave);
    return drumMapping ? drumMapping.name : null;
  };

  // ドラムカラーを取得するヘルパー関数
  const getDrumColor = (note: string, octave: number): string | null => {
    if (trackType !== 'drum') return null;
    const drumMapping = DRUM_MAPPING.find(d => d.note === note && d.octave === octave);
    return drumMapping ? drumMapping.color : null;
  };

  // ノートの端をクリックしているかチェック（リサイズハンドル）
  const isNearNoteEdge = (note: Note, clickX: number): 'start' | 'end' | null => {
    const noteStartPixel = stepToPosition(note.start);
    const noteEndPixel = stepToPosition(note.start + note.duration);
    const RESIZE_HANDLE_WIDTH = 8; // リサイズハンドルの幅（ピクセル）
    
    // 左端のリサイズハンドル領域
    if (clickX >= noteStartPixel && clickX <= noteStartPixel + RESIZE_HANDLE_WIDTH) {
      return 'start';
    }
    // 右端のリサイズハンドル領域  
    if (clickX >= noteEndPixel - RESIZE_HANDLE_WIDTH && clickX <= noteEndPixel) {
      return 'end';
    }
    return null; // 中央
  };

  // ノートをクリックしているかチェック
  const getNoteAtPosition = (step: number, noteData: { note: string; octave: number }): Note | null => {
    return notes.find(n => 
      n.note === noteData.note && 
      n.octave === noteData.octave && 
      step >= n.start && 
      step < n.start + n.duration
    ) || null;
  };

  return (
    <div className="bg-gray-800 rounded-lg flex flex-col" style={{ 
      position: 'fixed',
      top: '20px',
      left: '20px',
      right: '20px',
      bottom: '20px',
      width: 'calc(100vw - 40px)',
      height: 'calc(100vh - 40px)',
      zIndex: 1000
    }}>
      {/* Fixed Header */}
      <div className="flex items-center p-4 pb-2 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center space-x-4">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
              title="メインビューに戻る"
            >
              <span>←</span>
              <span>戻る</span>
            </button>
          )}
          <h3 className="text-white font-medium">Piano Roll</h3>
        </div>
        
        <div className="flex items-center space-x-4 flex-1 ml-6">
          {/* Transport Controls */}
          {(onPlay || onStop) && (
            <div className="flex items-center space-x-2">
              {onPlay && (
                <button
                  onClick={onPlay}
                  disabled={isPlaying}
                  className="w-8 h-8 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white rounded flex items-center justify-center transition-colors"
                  title="Play"
                >
                  ▶
                </button>
              )}
              {onStop && (
                <button
                  onClick={onStop}
                  disabled={!isPlaying}
                  className="w-8 h-8 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white rounded flex items-center justify-center transition-colors"
                  title="Stop"
                >
                  ⏹
                </button>
              )}
            </div>
          )}

          {/* AI Melody Generator Button */}
          {onGenerateMelody && (
            <button
              onClick={() => setShowMelodyGenerator(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded font-medium transition-colors"
              title="Generate AI Melody"
            >
              🤖 AI Melody
            </button>
          )}
          
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
          
          {/* ズームコントロール */}
          <div className="flex items-center space-x-1">
            <label className="text-sm text-gray-400 whitespace-nowrap">Zoom:</label>
            <button
              onClick={() => setZoomLevel(Math.max(0, zoomLevel - 1))}
              disabled={zoomLevel === 0}
              className="w-8 h-8 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded flex items-center justify-center"
              title="Zoom Out"
            >
              -
            </button>
            <span className="text-sm text-gray-300 w-12 text-center">
              {Math.round(ZOOM_LEVELS[zoomLevel] * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(Math.min(ZOOM_LEVELS.length - 1, zoomLevel + 1))}
              disabled={zoomLevel === ZOOM_LEVELS.length - 1}
              className="w-8 h-8 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded flex items-center justify-center"
              title="Zoom In"
            >
              +
            </button>
          </div>
          
          {/* Bass Generator Button (for bass tracks only) */}
          {trackType === 'bass' && (
            <button
              onClick={() => setShowBassGenerator(!showBassGenerator)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                showBassGenerator
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-white'
              }`}
              title="Bass Generator"
            >
              🎸 Generator
            </button>
          )}
          
          {/* Spacer to push close button to the right */}
          <div className="flex-1"></div>
          
          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 bg-red-600 hover:bg-red-700 text-white text-lg rounded flex items-center justify-center transition-colors"
              title="ピアノロールを閉じる"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 p-4 pt-2 overflow-hidden" style={{ minHeight: 0 }}>
        <div className="flex border border-gray-600 rounded h-full" style={{ minWidth: 0, minHeight: 0 }}>
        {/* Piano Keys */}
        <div className="flex flex-col bg-gray-700 flex-shrink-0" style={{ width: '80px', minHeight: 0 }}>
          {/* Spacer to align with ruler */}
          <div style={{ height: '30px', borderBottom: '1px solid #4B5563' }}></div>
          
          <div 
            className="overflow-y-hidden flex-1" 
            ref={scrollContainerRef}
            onScroll={handleScroll}
          >
          {[...OCTAVES].reverse().map(octave =>
            [...NOTES].reverse().map(note => {
              const isBlack = isBlackKey(note);
              const isC4 = note === 'C' && octave === 4;
              const drumName = getDrumName(note, octave);
              const drumColor = getDrumColor(note, octave);
              
              return (
                <button
                  key={`${note}${octave}`}
                  onClick={() => handleKeyClick(note, octave)}
                  className={`border-r border-gray-600 text-xs font-mono flex items-center justify-center transition-colors flex-shrink-0 ${
                    drumName
                      ? 'text-white border-gray-500' // ドラムキーの場合
                      : isC4
                      ? 'bg-blue-500 text-white border-blue-400'
                      : isBlack
                      ? 'bg-gray-900 text-white hover:bg-gray-700'
                      : 'bg-white text-black hover:bg-gray-100'
                  }`}
                  style={{ 
                    width: '80px',
                    height: `${CELL_HEIGHT}px`,
                    minHeight: `${CELL_HEIGHT}px`,
                    maxHeight: `${CELL_HEIGHT}px`,
                    backgroundColor: drumColor || undefined,
                    boxSizing: 'border-box'
                  }}
                >
                  {drumName || `${note}${octave}`}
                </button>
              );
            })
          )}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
          {/* Time Ruler */}
          <div 
            ref={rulerRef}
            className="bg-gray-700 border-b border-gray-600"
            style={{ 
              height: '30px',
              overflowX: 'auto',
              overflowY: 'hidden',
              width: '100%'
            }}
            onScroll={handleScroll}
          >
            <div 
              style={{ 
                width: `${gridWidth * CELL_WIDTH}px`,
                height: '30px',
                position: 'relative'
              }}
            >
              {/* Beat labels */}
              {Array.from({ length: Math.ceil(gridWidth / 4) }, (_, i) => {
                const beatNumber = i + 1;
                const measureNumber = Math.ceil(beatNumber / 4);
                const beatInMeasure = ((beatNumber - 1) % 4) + 1;
                return (
                  <div
                    key={`beat-${i}`}
                    className="absolute text-xs text-gray-300 font-mono"
                    style={{
                      left: `${i * 4 * CELL_WIDTH}px`,
                      top: '2px',
                      width: `${4 * CELL_WIDTH}px`,
                      textAlign: 'center'
                    }}
                  >
                    {measureNumber}.{beatInMeasure}
                  </div>
                );
              })}
              
              {/* 16th note subdivisions */}
              {Array.from({ length: gridWidth }, (_, i) => {
                const is16thNote = (i % 4) !== 0;
                const subdivision = (i % 4) + 1;
                return is16thNote ? (
                  <div
                    key={`sub-${i}`}
                    className="absolute text-xs text-gray-500 font-mono"
                    style={{
                      left: `${i * CELL_WIDTH}px`,
                      top: '16px',
                      width: `${CELL_WIDTH}px`,
                      textAlign: 'center',
                      fontSize: '10px'
                    }}
                  >
                    {subdivision}
                  </div>
                ) : null;
              })}
            </div>
          </div>
          
          {/* Piano Roll Grid */}
          <div 
            className="relative flex-1" 
            ref={gridScrollRef}
            onScroll={handleScroll}
            style={{ 
              overflow: 'auto',
              width: '100%',
              minHeight: 0
            }}
          >
          <div 
            key={`grid-container-${measures}-${gridWidth}-${zoomLevel}`}
            style={{ 
              width: `${gridWidth * CELL_WIDTH}px`,
              height: `${NOTES.length * OCTAVES.length * CELL_HEIGHT}px`,
              position: 'relative',
              backgroundColor: '#111827'
            }}
          >
            <canvas
              key={`canvas-${measures}-${gridWidth}-${zoomLevel}`}
              ref={canvasRef}
              width={gridWidth * CELL_WIDTH}
              height={NOTES.length * OCTAVES.length * CELL_HEIGHT}
              className="border border-gray-600 cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDoubleClick={handleCanvasDoubleClick}
              style={{
                display: 'block',
                position: 'absolute',
                top: 0,
                left: 0,
                width: `${gridWidth * CELL_WIDTH}px`,
                height: `${NOTES.length * OCTAVES.length * CELL_HEIGHT}px`,
                backgroundColor: '#1F2937'
              }}
            />
            
            {/* Grid lines */}
            <svg
              key={`svg-${measures}-${gridWidth}-${zoomLevel}`}
              className="absolute top-0 left-0 pointer-events-none"
              width={gridWidth * CELL_WIDTH}
              height={NOTES.length * OCTAVES.length * CELL_HEIGHT}
              style={{
                width: `${gridWidth * CELL_WIDTH}px`,
                height: `${NOTES.length * OCTAVES.length * CELL_HEIGHT}px`
              }}
            >
            {/* Vertical lines */}
            {Array.from({ length: gridWidth + 1 }, (_, i) => (
              <line
                key={`v-${i}`}
                x1={i * CELL_WIDTH}
                y1={0}
                x2={i * CELL_WIDTH}
                y2={NOTES.length * OCTAVES.length * CELL_HEIGHT}
                stroke={i % 16 === 0 ? '#8B5CF6' : i % 4 === 0 ? '#6B7280' : '#374151'}
                strokeWidth={i % 16 === 0 ? 3 : i % 4 === 0 ? 2 : 1}
              />
            ))}
            
            {/* Horizontal lines */}
            {Array.from({ length: NOTES.length * OCTAVES.length + 1 }, (_, i) => {
              // In our vertical layout (high notes on top), an octave separator line
              // should be drawn between C of one octave and B of the octave below it.
              // This corresponds to the line at the top of each 'B' note's row.
              // The rows for 'B' notes are at indices 12, 24, 36, etc.
              // So, the line is an octave separator if its index `i` is a multiple of 12 (for i > 0).
              const isOctaveSeparator = i > 0 && i % NOTES.length === 0;
              
              return (
                <line
                  key={`h-${i}`}
                  x1={0}
                  y1={i * CELL_HEIGHT}
                  x2={gridWidth * CELL_WIDTH}
                  y2={i * CELL_HEIGHT}
                  stroke={isOctaveSeparator ? '#6B7280' : '#374151'}
                  strokeWidth={isOctaveSeparator ? 2 : 1}
                />
              );
            })}
            
            {/* Notes */}
            {displayNotes.map((note, index) => {
              const x = stepToPosition(note.start);
              const y = noteToPosition(note.note, note.octave);
              const width = CELL_WIDTH * note.duration - 3;
              
              if (y === -1) return null;
              
              // Ensure unique key by combining note.id with index and timestamp
              const uniqueKey = `${note.id}-${index}-${note.start}-${note.note}${note.octave}`;
              
              return (
                <g key={uniqueKey}>
                  {/* メインノートボディ */}
                  <rect
                    x={x + 2}
                    y={y + 2}
                    width={width}
                    height={CELL_HEIGHT - 4}
                    fill="url(#noteGradient)"
                    stroke="#1E40AF"
                    strokeWidth={2}
                    rx={4}
                    style={{ filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))' }}
                  />
                  {/* インナーハイライト */}
                  <rect
                    x={x + 3}
                    y={y + 3}
                    width={Math.max(0, width - 2)}
                    height={2}
                    fill="rgba(255,255,255,0.3)"
                    rx={2}
                  />
                  {/* リサイズハンドル（左端） */}
                  <rect
                    x={x + 2}
                    y={y + 4}
                    width={4}
                    height={CELL_HEIGHT - 8}
                    fill="#60A5FA"
                    stroke="#1E40AF"
                    strokeWidth={1}
                    rx={2}
                    style={{ opacity: 0.8 }}
                  />
                  {/* リサイズハンドル（右端） */}
                  <rect
                    x={x + width - 2}
                    y={y + 4}
                    width={4}
                    height={CELL_HEIGHT - 8}
                    fill="#60A5FA"
                    stroke="#1E40AF"
                    strokeWidth={1}
                    rx={2}
                    style={{ opacity: 0.8 }}
                  />
                  {/* ノート名表示（長いノートのみ） */}
                  {width > 40 && (
                    <text
                      x={x + 8}
                      y={y + CELL_HEIGHT / 2 + 3}
                      fontSize="10"
                      fill="white"
                      fontFamily="monospace"
                      style={{ pointerEvents: 'none', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                    >
                      {note.note}{note.octave}
                    </text>
                  )}
                </g>
              );
            })}
            
            {/* グラデーション定義 */}
            <defs>
              <linearGradient id="noteGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="50%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#1E40AF" />
              </linearGradient>
            </defs>
            
            {/* Playhead */}
            {isPlaying && (
              <line
                x1={stepToPosition(playheadPosition)}
                y1={0}
                x2={stepToPosition(playheadPosition)}
                y2={NOTES.length * OCTAVES.length * CELL_HEIGHT}
                stroke="#EF4444"
                strokeWidth={2}
              />
            )}
            </svg>
          </div>
        </div>
        </div>
        </div>
      </div>

      {/* Bass Generator Panel */}
      {trackType === 'bass' && showBassGenerator && (
        <div className="border-t border-gray-700 p-4 flex-shrink-0">
          <BasslineGenerator
            onGenerateBaseline={onNotesChange}
            measures={measures}
          />
        </div>
      )}

      {/* Melody Generator Modal */}
      {showMelodyGenerator && onGenerateMelody && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <MelodyGenerator
            onMelodyGenerated={(generatedNotes) => {
              onGenerateMelody(generatedNotes);
              setShowMelodyGenerator(false);
            }}
            onClose={() => setShowMelodyGenerator(false)}
          />
        </div>
      )}
    </div>
  );
}