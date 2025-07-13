'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Note, Track } from '../types/audio';

interface MultiTrackPianoRollProps {
  tracks: Track[];
  selectedTrackId: string | null;
  onNotesChange: (notes: Note[]) => void;
  onPreviewNote: (note: string, octave: number) => void;
  isPlaying: boolean;
  playheadPosition: number;
  measures?: number;
  onMeasuresChange?: (measures: number) => void;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVES = [1, 2, 3, 4, 5, 6, 7]; // Low to high for visual layout
const INITIAL_MEASURES = 20; // デフォルト20小節
// 1小節 = 16ステップ（16分音符ベース）
const BASE_CELL_WIDTH = 24;
const CELL_HEIGHT = 20;
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2, 3, 4]; // ズームレベル
const DRAG_THRESHOLD = 5; // ドラッグと判定するピクセル距離

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

export default function MultiTrackPianoRoll({
  tracks,
  selectedTrackId,
  onNotesChange,
  onPreviewNote,
  isPlaying,
  playheadPosition,
  measures = INITIAL_MEASURES,
  onMeasuresChange,
}: MultiTrackPianoRollProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'add' | 'remove' | 'resize' | 'move'>('add');
  const gridWidth = measures * 16; // 小節数 × 16分音符（1小節 = 16ステップ）
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
    console.log('MultiTrack Canvas update - Measures:', measures, 'Grid width:', gridWidth, 'Zoom:', ZOOM_LEVELS[zoomLevel]);
    
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
      
      console.log('MultiTrack Canvas resized to:', { width: newWidth, height: newHeight });
    }
    
    // スクロールコンテナが正しくスクロール可能になるよう確保
    if (gridScrollRef.current) {
      const scrollContainer = gridScrollRef.current;
      const newWidth = gridWidth * CELL_WIDTH;
      console.log('MultiTrack Scroll container should handle width:', newWidth);
      
      // 強制的にスクロール領域を更新
      scrollContainer.scrollLeft = scrollContainer.scrollLeft; // 現在位置を維持
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

  const positionToStep = (x: number) => {
    return Math.round((x / CELL_WIDTH) * 4) / 4; // 0.25ステップ単位で丸める
  };

  const stepToPosition = (step: number) => step * CELL_WIDTH;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!selectedTrackId) return;
    
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

    const selectedTrack = tracks.find(t => t.id === selectedTrackId);
    if (!selectedTrack || selectedTrack.type !== 'synth') return;

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
      onNotesChange([...selectedTrack.notes, newNote]);
      
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
    if (!isDrawing || !selectedTrackId) return;

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

    const selectedTrack = tracks.find(t => t.id === selectedTrackId);
    if (!selectedTrack || selectedTrack.type !== 'synth') return;

    if (isDragging && dragStartNote) {
      // 新しいノートのドラッグ中 - 長さを調整
      const newDuration = Math.max(0.25, step - dragStartStep + 1);
      const updatedNotes = selectedTrack.notes.map(n => 
        n.id === dragStartNote.id ? { ...n, duration: newDuration } : n
      );
      onNotesChange(updatedNotes);
    } else if (isResizing && resizeTarget && resizeEdge) {
      // 既存ノートのリサイズ中
      if (resizeEdge === 'end') {
        // 右端をドラッグ - 右に伸びる（正の方向）、左に縮む（負の方向）
        const newEnd = Math.max(resizeTarget.start + 0.25, step + 1); // 最小0.25ステップの長さを保証
        const newDuration = newEnd - resizeTarget.start;
        const updatedNotes = selectedTrack.notes.map(n => 
          n.id === resizeTarget.id ? { ...n, duration: newDuration } : n
        );
        onNotesChange(updatedNotes);
      } else if (resizeEdge === 'start') {
        // 左端をドラッグ - 左に伸びる（負の方向）、右に縮む（正の方向）
        const originalEnd = resizeTarget.start + resizeTarget.duration;
        const newStart = Math.max(0, Math.min(step, originalEnd - 0.25)); // 最小0.25ステップの長さを保証
        const newDuration = originalEnd - newStart;
        const updatedNotes = selectedTrack.notes.map(n => 
          n.id === resizeTarget.id ? { ...n, start: newStart, duration: newDuration } : n
        );
        onNotesChange(updatedNotes);
      }
    } else if (isMoving && moveTarget && selectedTrackId) {
      // ノートの移動中 - 位置と音程を変更
      const noteData = positionToNote(y);
      if (noteData) {
        const selectedTrack = tracks.find(t => t.id === selectedTrackId);
        if (selectedTrack) {
          const updatedNotes = selectedTrack.notes.map(n => 
            n.id === moveTarget.id ? { 
              ...n, 
              start: step,
              note: noteData.note,
              octave: noteData.octave
            } : n
          );
          onNotesChange(updatedNotes);
        }
      }
    } else if (hasMoved && drawMode === 'add') {
      // 従来のドローモード - 新しいノート追加
      const noteData = positionToNote(y);
      
      if (!noteData) return;

      const existingNote = selectedTrack.notes.find(
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
        onNotesChange([...selectedTrack.notes, newNote]);
      }
    }
  };

  const handleMouseUp = () => {
    
    // ドラッグしていない場合のクリック処理
    if (!hasMoved && drawMode === 'remove' && mouseDownPos && selectedTrackId) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const step = positionToStep(mouseDownPos.x);
        const noteData = positionToNote(mouseDownPos.y);
        if (noteData) {
          const clickedNote = getNoteAtPosition(step, noteData);
          if (clickedNote && !isNearNoteEdge(clickedNote, mouseDownPos.x)) {
            // ノートを削除
            const selectedTrack = tracks.find(t => t.id === selectedTrackId);
            if (selectedTrack) {
              onNotesChange(selectedTrack.notes.filter(n => n.id !== clickedNote.id));
            }
          }
        }
      }
    }

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
    onPreviewNote(note, octave);
  };

  const handleClearTrack = () => {
    if (selectedTrackId) {
      onNotesChange([]);
    }
  };

  const isBlackKey = (note: string) => note.includes('#');

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
    const selectedTrack = tracks.find(t => t.id === selectedTrackId);
    if (!selectedTrack) return null;
    
    return selectedTrack.notes.find(n => 
      n.note === noteData.note && 
      n.octave === noteData.octave && 
      step >= n.start && 
      step < n.start + n.duration
    ) || null;
  };

  // Get track color
  const getTrackColor = (trackId: string) => {
    const trackIndex = tracks.findIndex(t => t.id === trackId);
    return TRACK_COLORS[trackIndex % TRACK_COLORS.length];
  };

  return (
    <div className="bg-gray-800 rounded-lg flex flex-col" style={{ 
      width: '100%',
      maxWidth: '100%',
      height: '700px',
      minHeight: '500px'
    }}>
      {/* Fixed Header */}
      <div className="flex items-center p-4 pb-2 border-b border-gray-700 flex-shrink-0">
        <h3 className="text-white font-medium mr-6">Multi-Track Piano Roll</h3>
        <div className="flex items-center space-x-4 flex-1">
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
          
          {/* Spacer to push Clear Track to the right */}
          <div className="flex-1"></div>
          
          {selectedTrackId && (
            <button
              onClick={handleClearTrack}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded whitespace-nowrap"
            >
              Clear Track
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 p-4 pt-2 overflow-hidden" style={{ minHeight: '0' }}>
        <div className="flex border border-gray-600 rounded h-full">
        {/* Piano Keys */}
        <div className="flex flex-col bg-gray-700 flex-shrink-0" style={{ width: '80px' }}>
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
              return (
                <button
                  key={`${note}${octave}`}
                  onClick={() => handleKeyClick(note, octave)}
                  className={`border-r border-gray-600 text-xs font-mono flex items-center justify-center transition-colors flex-shrink-0 ${
                    isC4
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
                    boxSizing: 'border-box'
                  }}
                >
                  {note}{octave}
                </button>
              );
            })
          )}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 flex flex-col">
          {/* Time Ruler */}
          <div 
            ref={rulerRef}
            className="bg-gray-700 border-b border-gray-600 overflow-x-hidden"
            style={{ height: '30px' }}
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
              width: '100%'
            }}
          >
          <div 
            key={`multitrack-grid-container-${measures}-${gridWidth}-${zoomLevel}`}
            style={{ 
              width: `${gridWidth * CELL_WIDTH}px`, 
              height: `${NOTES.length * OCTAVES.length * CELL_HEIGHT}px`,
              position: 'relative',
              backgroundColor: '#111827'
            }}
          >
            <canvas
              key={`multitrack-canvas-${measures}-${gridWidth}-${zoomLevel}`} // より詳細なキーで確実にリレンダリング
              ref={canvasRef}
              width={gridWidth * CELL_WIDTH}
              height={NOTES.length * OCTAVES.length * CELL_HEIGHT}
              className="border border-gray-600 cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
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
              key={`multitrack-svg-${measures}-${gridWidth}-${zoomLevel}`} // より詳細なキーで確実にリレンダリング
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
            
            {/* Notes for all tracks */}
            {tracks.map((track) => {
              if (track.type !== 'synth') return null;
              
              const trackColor = getTrackColor(track.id);
              const isSelected = track.id === selectedTrackId;
              const opacity = isSelected ? 1 : 0.6;
              
              return track.notes.map(note => {
                const x = stepToPosition(note.start);
                const y = noteToPosition(note.note, note.octave);
                const width = CELL_WIDTH * note.duration - 3;
                const gradientId = `gradient-${track.id}`;
                
                if (y === -1) return null;
                
                return (
                  <g key={note.id}>
                    {/* メインノートボディ */}
                    <rect
                      x={x + 2}
                      y={y + 2}
                      width={width}
                      height={CELL_HEIGHT - 4}
                      fill={isSelected ? `url(#${gradientId})` : trackColor}
                      fillOpacity={opacity}
                      stroke={trackColor}
                      strokeWidth={isSelected ? 2 : 1}
                      rx={4}
                      style={{ filter: isSelected ? 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))' : 'none' }}
                    />
                    {/* インナーハイライト（選択されたトラックのみ） */}
                    {isSelected && (
                      <rect
                        x={x + 3}
                        y={y + 3}
                        width={Math.max(0, width - 2)}
                        height={2}
                        fill="rgba(255,255,255,0.3)"
                        rx={2}
                      />
                    )}
                    {/* リサイズハンドル（選択されたトラックのみ） */}
                    {isSelected && (
                      <>
                        <rect
                          x={x + 2}
                          y={y + 4}
                          width={4}
                          height={CELL_HEIGHT - 8}
                          fill={trackColor}
                          stroke={trackColor}
                          strokeWidth={1}
                          rx={2}
                          style={{ opacity: 0.9 }}
                        />
                        <rect
                          x={x + width - 2}
                          y={y + 4}
                          width={4}
                          height={CELL_HEIGHT - 8}
                          fill={trackColor}
                          stroke={trackColor}
                          strokeWidth={1}
                          rx={2}
                          style={{ opacity: 0.9 }}
                        />
                      </>
                    )}
                    {/* ノート名表示（長いノートかつ選択されたトラックのみ） */}
                    {isSelected && width > 40 && (
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
              });
            })}
            
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
            
            {/* グラデーション定義 */}
            <defs>
              {tracks.filter(track => track.type === 'synth').map((track) => {
                const trackColor = getTrackColor(track.id);
                const gradientId = `gradient-${track.id}`;
                return (
                  <linearGradient key={gradientId} id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={trackColor} stopOpacity="0.9" />
                    <stop offset="50%" stopColor={trackColor} stopOpacity="0.7" />
                    <stop offset="100%" stopColor={trackColor} stopOpacity="0.5" />
                  </linearGradient>
                );
              })}
            </defs>
            </svg>
          </div>
        </div>
        </div>
        </div>
      </div>

      {/* Track Legend */}
      <div className="p-4 pt-2 border-t border-gray-700 flex-shrink-0 overflow-y-auto" style={{ maxHeight: '80px' }}>
        <div className="flex flex-wrap gap-2">
          {tracks.filter(track => track.type === 'synth').map((track) => (
            <div
              key={track.id}
              className={`flex items-center space-x-2 px-2 py-1 rounded text-sm ${
                track.id === selectedTrackId 
                  ? 'bg-gray-600 text-white' 
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: getTrackColor(track.id) }}
              />
              <span>{track.name}</span>
              <span className="text-xs text-gray-400">({track.notes.length} notes)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}