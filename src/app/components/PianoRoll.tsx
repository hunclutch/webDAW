'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Note } from '../types/audio';

interface PianoRollProps {
  notes: Note[];
  onNotesChange: (notes: Note[]) => void;
  onPreviewNote: (note: string, octave: number) => void;
  isPlaying: boolean;
  playheadPosition: number;
  measures?: number;
  onMeasuresChange?: (measures: number) => void;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVES = [1, 2, 3, 4, 5, 6, 7]; // Low to high for visual layout
const INITIAL_MEASURES = 60; // 60小節デフォルト
const STEPS_PER_MEASURE = 16; // 16分音符単位（4/4拍子）
const CELL_WIDTH = 24;
const CELL_HEIGHT = 20;
const DRAG_THRESHOLD = 5; // ドラッグと判定するピクセル距離

export default function PianoRoll({
  notes,
  onNotesChange,
  onPreviewNote,
  isPlaying,
  playheadPosition,
  measures = INITIAL_MEASURES,
  onMeasuresChange,
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
  const gridWidth = measures * STEPS_PER_MEASURE; // 小節数 × 16分音符
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  // C4を中央に配置とスクロール同期
  useEffect(() => {
    if (scrollContainerRef.current && gridScrollRef.current) {
      // C4の位置を計算 (オクターブ4のCは上から3番目のオクターブの最初の音)
      const octaveIndex = OCTAVES.indexOf(4);
      const noteIndex = NOTES.indexOf('C');
      const c4Position = ((OCTAVES.length - 1 - octaveIndex) * NOTES.length + (NOTES.length - 1 - noteIndex)) * CELL_HEIGHT;
      
      // コンテナの高さの半分を取得
      const containerHeight = scrollContainerRef.current.clientHeight;
      const scrollTop = c4Position - containerHeight / 2;
      
      const finalScrollTop = Math.max(0, scrollTop);
      scrollContainerRef.current.scrollTop = finalScrollTop;
      gridScrollRef.current.scrollTop = finalScrollTop;
    }
  }, []);
  
  // 小節数が変更されたときのcanvas再描画
  useEffect(() => {
    console.log('Measures updated to:', measures, 'Grid width:', gridWidth);
    
    // Canvasサイズを強制的に更新
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = gridWidth * CELL_WIDTH;
      canvas.height = NOTES.length * OCTAVES.length * CELL_HEIGHT;
      
      // Canvas要素のDOM属性も更新
      canvas.setAttribute('width', (gridWidth * CELL_WIDTH).toString());
      canvas.setAttribute('height', (NOTES.length * OCTAVES.length * CELL_HEIGHT).toString());
    }
  }, [measures, gridWidth]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    
    if (scrollContainerRef.current && gridScrollRef.current) {
      if (e.currentTarget === scrollContainerRef.current) {
        gridScrollRef.current.scrollTop = scrollTop;
      } else {
        scrollContainerRef.current.scrollTop = scrollTop;
      }
    }
  }, []);

  // const getNoteKey = (note: string, octave: number) => `${note}${octave}`;

  const positionToStep = (x: number) => {
    return Math.floor(x / CELL_WIDTH);
  };

  const positionToNote = (y: number) => {
    const noteIndex = Math.floor(y / CELL_HEIGHT);
    const totalNotes = NOTES.length * OCTAVES.length;
    if (noteIndex < 0 || noteIndex >= totalNotes) return null;
    
    const octaveIndex = Math.floor(noteIndex / NOTES.length);
    const noteInOctave = noteIndex % NOTES.length;
    
    return {
      note: NOTES[NOTES.length - 1 - noteInOctave],
      octave: OCTAVES[OCTAVES.length - 1 - octaveIndex],
    };
  };

  const stepToPosition = (step: number) => step * CELL_WIDTH;
  
  const noteToPosition = (note: string, octave: number) => {
    const octaveIndex = OCTAVES.indexOf(octave);
    const noteIndex = NOTES.indexOf(note);
    if (octaveIndex === -1 || noteIndex === -1) return -1;
    
    return ((OCTAVES.length - 1 - octaveIndex) * NOTES.length + (NOTES.length - 1 - noteIndex)) * CELL_HEIGHT;
  };

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
      const edge = isNearNoteEdge(clickedNote, step);
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
      const newDuration = Math.max(1, step - dragStartStep + 1);
      const updatedNotes = notes.map(n => 
        n.id === dragStartNote.id ? { ...n, duration: newDuration } : n
      );
      onNotesChange(updatedNotes);
    } else if (isResizing && resizeTarget && resizeEdge) {
      // 既存ノートのリサイズ中
      if (resizeEdge === 'end') {
        // 右端をドラッグ - 長さを変更
        const newDuration = Math.max(1, step - resizeTarget.start + 1);
        const updatedNotes = notes.map(n => 
          n.id === resizeTarget.id ? { ...n, duration: newDuration } : n
        );
        onNotesChange(updatedNotes);
      } else if (resizeEdge === 'start') {
        // 左端をドラッグ - 開始位置と長さを変更
        const newStart = Math.max(0, Math.min(step, resizeTarget.start + resizeTarget.duration - 1));
        const newDuration = resizeTarget.start + resizeTarget.duration - newStart;
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
      // ダブルクリックでノートを削除
      onNotesChange(notes.filter(n => n.id !== clickedNote.id));
    }
  };

  const isBlackKey = (note: string) => note.includes('#');

  // ノートの端をクリックしているかチェック（リサイズハンドル）
  const isNearNoteEdge = (note: Note, clickStep: number): 'start' | 'end' | null => {
    const noteStartStep = note.start;
    const noteEndStep = note.start + note.duration - 1; // 1ステップ手前が実際の終端
    
    if (Math.abs(clickStep - noteStartStep) <= 0.3) {
      return 'start'; // 左端
    }
    if (Math.abs(clickStep - noteEndStep) <= 0.3) {
      return 'end'; // 右端
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
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">Piano Roll</h3>
        <div className="flex items-center space-x-2">
          {onMeasuresChange && (
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-400">Measures:</label>
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
          <button
            onClick={() => onNotesChange([])}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="flex" style={{ height: '400px' }}>
        {/* Piano Keys */}
        <div 
          className="flex flex-col overflow-y-auto bg-gray-700" 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{ 
            minWidth: '64px',
            width: '64px'
          }}
        >
          {[...OCTAVES].reverse().map(octave =>
            [...NOTES].reverse().map(note => {
              const isBlack = isBlackKey(note);
              const isC4 = note === 'C' && octave === 4;
              return (
                <button
                  key={`${note}${octave}`}
                  onClick={() => handleKeyClick(note, octave)}
                  className={`w-16 border border-gray-600 text-xs font-mono flex items-center justify-center transition-colors flex-shrink-0 ${
                    isC4
                      ? 'bg-blue-500 text-white border-blue-400'
                      : isBlack
                      ? 'bg-gray-900 text-white hover:bg-gray-700'
                      : 'bg-white text-black hover:bg-gray-100'
                  }`}
                  style={{ 
                    height: `${CELL_HEIGHT}px`,
                    minHeight: `${CELL_HEIGHT}px`,
                    maxHeight: `${CELL_HEIGHT}px`
                  }}
                >
                  {note}{octave}
                </button>
              );
            })
          )}
        </div>

        {/* Grid */}
        <div 
          className="relative overflow-auto flex-1 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500" 
          ref={gridScrollRef}
          onScroll={handleScroll}
          style={{ 
            minWidth: '0',
            minHeight: '0'
          }}
        >
          <div 
            key={`grid-${measures}`} // Key変更で強制リレンダリング
            style={{ 
              width: `${gridWidth * CELL_WIDTH}px`, 
              height: `${NOTES.length * OCTAVES.length * CELL_HEIGHT}px`,
              position: 'relative'
            }}
          >
            <canvas
              key={`canvas-${measures}`} // Key変更で強制リレンダリング
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
                left: 0
              }}
            />
            
            {/* Grid lines */}
            <svg
              key={`svg-${measures}`} // Key変更で強制リレンダリング
              className="absolute top-0 left-0 pointer-events-none"
              width={gridWidth * CELL_WIDTH}
              height={NOTES.length * OCTAVES.length * CELL_HEIGHT}
            >
            {/* Vertical lines */}
            {Array.from({ length: gridWidth + 1 }, (_, i) => (
              <line
                key={`v-${i}`}
                x1={i * CELL_WIDTH}
                y1={0}
                x2={i * CELL_WIDTH}
                y2={NOTES.length * OCTAVES.length * CELL_HEIGHT}
                stroke={i % 4 === 0 ? '#6B7280' : '#374151'}
                strokeWidth={i % 4 === 0 ? 2 : 1}
              />
            ))}
            
            {/* Horizontal lines */}
            {Array.from({ length: NOTES.length * OCTAVES.length + 1 }, (_, i) => {
              const noteIndex = i % NOTES.length;
              const note = NOTES[NOTES.length - 1 - noteIndex];
              const isC = note === 'C';
              
              return (
                <line
                  key={`h-${i}`}
                  x1={0}
                  y1={i * CELL_HEIGHT}
                  x2={gridWidth * CELL_WIDTH}
                  y2={i * CELL_HEIGHT}
                  stroke={isC ? '#6B7280' : '#374151'}
                  strokeWidth={isC ? 2 : 1}
                />
              );
            })}
            
            {/* Notes */}
            {notes.map(note => {
              const x = stepToPosition(note.start);
              const y = noteToPosition(note.note, note.octave);
              const width = CELL_WIDTH * note.duration - 2;
              
              if (y === -1) return null;
              
              return (
                <g key={note.id}>
                  <rect
                    x={x + 1}
                    y={y + 1}
                    width={width}
                    height={CELL_HEIGHT - 2}
                    fill="#3B82F6"
                    stroke="#1E40AF"
                    strokeWidth={1}
                    rx={2}
                  />
                  {/* リサイズハンドル（左端） */}
                  <rect
                    x={x + 1}
                    y={y + 3}
                    width={6}
                    height={CELL_HEIGHT - 6}
                    fill="#1E40AF"
                    stroke="#1E40AF"
                    strokeWidth={1}
                    rx={1}
                  />
                  {/* リサイズハンドル（右端） */}
                  <rect
                    x={x + width - 3}
                    y={y + 3}
                    width={6}
                    height={CELL_HEIGHT - 6}
                    fill="#1E40AF"
                    stroke="#1E40AF"
                    strokeWidth={1}
                    rx={1}
                  />
                </g>
              );
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
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}