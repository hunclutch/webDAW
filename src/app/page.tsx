'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAudioContext } from './hooks/useAudioContext';
import { useHistory } from './hooks/useHistory';
import { useProject } from './hooks/useProject';
import { AudioEngine } from './lib/audioEngine';
import { Track, DAWState, Note, DrumPattern, ProjectFile } from './types/audio';
import TransportControls from './components/TransportControls';
import TrackCreator from './components/TrackCreator';
import PianoRoll from './components/PianoRoll';
import TrackViewer from './components/TrackViewer';
import InlineMidiViewer from './components/InlineMidiViewer';
import ExportModal from './components/ExportModal';
import { AudioExporter } from './lib/audioExporter';
import VirtualKeyboard from './components/VirtualKeyboard';
import DrumPads from './components/DrumPads';
import EffectRack from './components/EffectRack';
import MelodyGenerator from './components/MelodyGenerator';
import Settings from './components/Settings';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { useKeyboardPiano } from './hooks/useKeyboardPiano';

function HomeContent() {
  const { theme } = useTheme();
  const { initializeAudioContext, getMasterGain } = useAudioContext();
  const [audioEngine, setAudioEngine] = useState<AudioEngine | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'drums' | 'pianoroll'>('pianoroll');
  const [showTrackCreator, setShowTrackCreator] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showMelodyGenerator, setShowMelodyGenerator] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [projectName, setProjectName] = useState('Untitled Project');
  
  const initialDAWState: DAWState = {
    isPlaying: false,
    isRecording: false,
    currentTime: 0,
    bpm: 120,
    tracks: [],
    masterVolume: 0.8,
    notes: '',
  };

  const {
    state: dawState,
    canUndo,
    canRedo,
    undo,
    redo,
    pushState: setDawState,
    reset: resetHistory,
  } = useHistory(initialDAWState);

  const {
    exportProject,
    importProject,
    projectToDAWState,
    autoSave,
    loadAutoSave,
    clearAutoSave,
  } = useProject();

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [measures, setMeasures] = useState(20); // デフォルト20小節

  // 小節数が変更されたときにaudioEngineに反映
  useEffect(() => {
    if (audioEngine) {
      audioEngine.setMaxMeasures(measures);
    }
  }, [audioEngine, measures]);
  const [showPianoRoll, setShowPianoRoll] = useState(true); // ピアノロール表示状態（デフォルトで詳細表示）
  const [showExportModal, setShowExportModal] = useState(false); // エクスポートモーダル表示状態

  useEffect(() => {
    let animationFrame: number;
    
    if (isPlaying && audioEngine) {
      const updateTime = () => {
        setCurrentTime(audioEngine.getCurrentTime());
        animationFrame = requestAnimationFrame(updateTime);
      };
      updateTime();
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPlaying, audioEngine]);

  // 自動保存 (5秒間隔)
  useEffect(() => {
    const interval = setInterval(() => {
      if (dawState.tracks?.length > 0 || dawState.notes?.trim()) {
        autoSave(dawState);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [dawState, autoSave]);

  // 録音状況を常に監視してUIを更新
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (audioEngine) {
      interval = setInterval(() => {
        setIsRecording(audioEngine.getIsRecording());
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [audioEngine]);

  // 初回読み込み時に自動保存データを復元
  useEffect(() => {
    const autoSaveData = loadAutoSave();
    if (autoSaveData && (autoSaveData.tracks.length > 0 || autoSaveData.notes)) {
      const restoredState = projectToDAWState(autoSaveData);
      resetHistory(restoredState as DAWState);
      setProjectName(autoSaveData.name || 'Auto Saved Project');
    }
  }, [loadAutoSave, projectToDAWState, resetHistory]);

  const initAudio = useCallback(async () => {
    try {
      const audioContext = await initializeAudioContext();
      const masterGain = getMasterGain();
      if (audioContext && masterGain) {
        const engine = new AudioEngine(audioContext, masterGain);
        setAudioEngine(engine);
        engine.setMasterVolume(dawState.masterVolume);
        engine.setBPM(dawState.bpm);
      }
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }, [initializeAudioContext, getMasterGain, dawState.masterVolume, dawState.bpm]);

  const handleCreateTrack = useCallback(async (trackData: Omit<Track, 'id'>) => {
    if (!audioEngine) {
      await initAudio();
      return;
    }

    const newTrack: Track = {
      ...trackData,
      id: `track-${Date.now()}`,
    };

    setDawState({
      ...dawState,
      tracks: [...(dawState.tracks || []), newTrack],
    });

    setSelectedTrackId(newTrack.id);
    setShowTrackCreator(false);
  }, [audioEngine, initAudio, dawState, setDawState]);

  const handleDeleteTrack = useCallback((trackId: string) => {
    const updatedState = {
      ...dawState,
      tracks: (dawState.tracks || []).filter(track => track.id !== trackId),
    };

    setDawState(updatedState);
    
    // 削除されたトラックが選択されていた場合、選択を解除
    if (selectedTrackId === trackId) {
      setSelectedTrackId(null);
      setShowPianoRoll(false);
    }
  }, [dawState, setDawState, selectedTrackId]);

  const handlePlay = useCallback(async () => {
    if (!audioEngine) {
      await initAudio();
      return;
    }
    
    audioEngine.play(dawState.tracks || []);
    setIsPlaying(true);
  }, [audioEngine, initAudio, dawState.tracks]);

  const handleRecord = useCallback(async () => {
    if (!audioEngine) {
      await initAudio();
      return;
    }

    if (isRecording) {
      // 録音停止
      const recordedNotes = audioEngine.stopRecording();
      setIsRecording(false);

      // 録音されたノートを選択中のトラックに追加
      if (selectedTrackId && recordedNotes.length > 0) {
        setDawState({
          ...dawState,
          tracks: (dawState.tracks || []).map(track => {
            if (track.id === selectedTrackId) {
              const existingNotes = track.notes || [];
              return { ...track, notes: [...existingNotes, ...recordedNotes] };
            }
            return track;
          }),
        });
      }
    } else {
      // 録音開始
      if (selectedTrackId) {
        const selectedTrack = dawState.tracks?.find(track => track.id === selectedTrackId);
        if (selectedTrack && (selectedTrack.type === 'synth' || selectedTrack.type === 'bass')) {
          audioEngine.startRecording(selectedTrackId);
          setIsRecording(true);
        } else {
          alert('録音はシンセサイザーまたはベーストラックでのみ利用できます。対象のトラックを選択してください。');
        }
      } else {
        alert('録音するトラックを選択してください。');
      }
    }
  }, [audioEngine, initAudio, isRecording, selectedTrackId, dawState, setDawState]);

  const handlePause = useCallback(() => {
    if (audioEngine) {
      audioEngine.pause();
      setIsPlaying(false);
    }
  }, [audioEngine]);

  const handleStop = useCallback(() => {
    if (audioEngine) {
      audioEngine.stop();
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [audioEngine]);

  const handleBpmChange = useCallback((bpm: number) => {
    if (audioEngine) {
      audioEngine.setBPM(bpm);
    }
    setDawState({ ...dawState, bpm });
  }, [audioEngine, dawState, setDawState]);

  // ノートをドラムパターンに変換
  const notesToDrumPattern = useCallback((notes: Note[]): DrumPattern => {
    const steps = Array.from({ length: 16 }, () => ({
      kick: false,
      snare: false,
      hihat: false,
      openhat: false,
      crash: false,
      velocity: 0.8,
    }));

    const drumMapping = {
      'C4': 'kick',
      'D4': 'snare',
      'F#4': 'hihat',
      'A#4': 'openhat',
      'C5': 'crash',
    };

    notes.forEach(note => {
      const noteKey = `${note.note}${note.octave}`;
      const drumType = drumMapping[noteKey as keyof typeof drumMapping];
      if (drumType && note.start >= 0 && note.start < 16) {
        const stepIndex = Math.floor(note.start);
        if (steps[stepIndex]) {
          (steps[stepIndex] as any)[drumType] = true;
          steps[stepIndex].velocity = note.velocity;
        }
      }
    });

    return { steps, length: 16 };
  }, []);

  const handleNotesChange = useCallback((notes: Note[]) => {
    if (!selectedTrackId) return;
    
    setDawState({
      ...dawState,
      tracks: (dawState.tracks || []).map(track => {
        if (track.id === selectedTrackId) {
          // ドラムトラックの場合、ノートをドラムパターンにも変換
          if (track.type === 'drum') {
            const convertedPattern = notesToDrumPattern(notes);
            console.log('Converting notes to drum pattern:', { notes, convertedPattern });
            
            // ピアノロールでノートが配置されている場合は、そのノートを優先
            // ノートが空の場合はdrumPatternによる再生に戻る
            return { 
              ...track, 
              notes,
              drumPattern: convertedPattern
            };
          }
          return { ...track, notes };
        }
        return track;
      }),
    });
  }, [selectedTrackId, dawState, setDawState, notesToDrumPattern]);

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

    pattern.steps.forEach((step, stepIndex) => {
      Object.entries(drumMapping).forEach(([drumType, noteInfo]) => {
        if ((step as any)[drumType]) {
          notes.push({
            id: `drum-${drumType}-${stepIndex}-${Date.now()}`,
            note: noteInfo.note,
            octave: noteInfo.octave,
            start: stepIndex,
            duration: 1,
            velocity: step.velocity,
          });
        }
      });
    });

    return notes;
  }, []);

  const handleDrumPatternChange = useCallback((pattern: DrumPattern) => {
    if (!selectedTrackId) return;
    
    // DrumPadsで変更された場合、ノートをクリアしてパターンを優先
    // これにより、DrumPadsとピアノロールの重複再生を防ぐ
    setDawState({
      ...dawState,
      tracks: (dawState.tracks || []).map(track => {
        if (track.id === selectedTrackId) {
          console.log('Updating drum pattern for track:', track.name, pattern);
          return { 
            ...track, 
            drumPattern: pattern,
            notes: [] // DrumPadsでの編集時はノートをクリア
          };
        }
        return track;
      }),
    });
  }, [selectedTrackId, dawState, setDawState]);

  const handleNotePreview = useCallback((note: string, octave: number) => {
    if (audioEngine && selectedTrackId) {
      const selectedTrack = dawState.tracks?.find(track => track.id === selectedTrackId);
      if (selectedTrack?.type === 'drum') {
        // ドラムトラックの場合、音程に基づいてドラムサウンドを再生
        const drumMapping: { [key: string]: string } = {
          'C4': 'kick',
          'D4': 'snare', 
          'F#4': 'hihat',
          'A#4': 'openhat',
          'C5': 'crash',
        };
        const noteKey = `${note}${octave}`;
        const drumType = drumMapping[noteKey];
        if (drumType) {
          audioEngine.getSequencer().playDrumPreview(drumType);
        }
      } else {
        // シンセ・ベーストラックの場合
        audioEngine.getSequencer().playNotePreview(note, octave);
      }
    } else if (audioEngine) {
      // トラックが選択されていない場合はデフォルトでシンセプレビュー
      audioEngine.getSequencer().playNotePreview(note, octave);
    }
  }, [audioEngine, selectedTrackId, dawState.tracks]);

  const handleDrumPreview = useCallback((drumType: string) => {
    if (audioEngine) {
      audioEngine.getSequencer().playDrumPreview(drumType);
    }
  }, [audioEngine]);




  const handleVolumeChange = useCallback((trackId: string, volume: number) => {
    setDawState({
      ...dawState,
      tracks: (dawState.tracks || []).map(track =>
        track.id === trackId ? { ...track, volume } : track
      ),
    });
  }, [dawState, setDawState]);

  const handleMuteToggle = useCallback((trackId: string) => {
    setDawState({
      ...dawState,
      tracks: (dawState.tracks || []).map(track =>
        track.id === trackId ? { ...track, muted: !track.muted } : track
      ),
    });
  }, [dawState, setDawState]);

  const handleSoloToggle = useCallback((trackId: string) => {
    setDawState({
      ...dawState,
      tracks: (dawState.tracks || []).map(track =>
        track.id === trackId ? { ...track, soloed: !track.soloed } : track
      ),
    });
  }, [dawState, setDawState]);

  const handleExportProject = useCallback(() => {
    exportProject(dawState, projectName);
  }, [exportProject, dawState, projectName]);

  const handleImportProject = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importProject(file)
        .then((projectData) => {
          const restoredState = projectToDAWState(projectData);
          resetHistory(restoredState as DAWState);
          setProjectName(projectData.name);
          clearAutoSave();
        })
        .catch((error) => {
          alert('プロジェクトファイルの読み込みに失敗しました: ' + error.message);
        });
    }
    event.target.value = '';
  }, [importProject, projectToDAWState, resetHistory, clearAutoSave]);

  const handleNewProject = useCallback(() => {
    const shouldCreate = window.confirm('新しいプロジェクトを作成しますか？現在の作業内容は失われます。');
    if (shouldCreate) {
      resetHistory(initialDAWState);
      setProjectName('Untitled Project');
      setSelectedTrackId(null);
      setShowTrackCreator(false);
      setShowNotes(false);
      clearAutoSave();
    }
  }, [resetHistory, clearAutoSave]);

  const handleProjectNotesChange = useCallback((notes: string) => {
    setDawState({
      ...dawState,
      notes,
    });
  }, [dawState, setDawState]);

  const handleMelodyGenerated = useCallback((generatedNotes: Note[]) => {
    if (!selectedTrackId) {
      alert('メロディーを追加するトラックを選択してください。');
      return;
    }

    setDawState({
      ...dawState,
      tracks: (dawState.tracks || []).map(track => {
        if (track.id === selectedTrackId) {
          const existingNotes = track.notes || [];
          return { ...track, notes: [...existingNotes, ...generatedNotes] };
        }
        return track;
      }),
    });
    
    setShowMelodyGenerator(false);
  }, [selectedTrackId, dawState, setDawState]);

  const handleExportAudio = useCallback(async (format: 'wav' | 'mp3', filename: string, bitDepth: 16 | 24) => {
    if (!audioEngine) {
      alert('オーディオエンジンが初期化されていません。再生ボタンを押してから再度お試しください。');
      return;
    }

    try {
      const exporter = new AudioExporter(audioEngine.getAudioContext());
      await exporter.exportTracks(dawState.tracks || [], measures, dawState.bpm, format, bitDepth, filename);
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }, [audioEngine, dawState.tracks, dawState.bpm, measures]);

  const selectedTrack = dawState.tracks?.find(track => track.id === selectedTrackId) || null;
  const playheadPosition = audioEngine ? audioEngine.getPlayheadPosition() : 0;

  // キーボードピアノ機能の設定
  useKeyboardPiano({
    onNotePlay: (note: string, octave: number) => {
      handleNotePreview(note, octave);
      
      // 録音中の場合、ノートを記録
      if (audioEngine && audioEngine.getIsRecording()) {
        audioEngine.recordNote(note, octave, 0.8);
      }
    },
    enabled: true, // キーボード機能を常に有効にする
  });

  return (
      <div className={`h-screen flex flex-col overflow-hidden ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Bar - Logic Pro Style */}
      <div className={`border-b px-4 py-2 ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-slate-200 border-slate-300'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-lg font-semibold">WebDAW Studio</h1>
              <div className="text-xs text-gray-400">{projectName}</div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Project Menu */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleNewProject}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded"
                  title="New Project"
                >
                  New
                </button>
                <button
                  onClick={handleExportProject}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded"
                  title="Save Project"
                >
                  Save
                </button>
                <label className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded cursor-pointer" title="Load Project">
                  Load
                  <input
                    type="file"
                    accept=".webdaw"
                    onChange={handleImportProject}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded"
                  title="Export Audio"
                >
                  Export
                </button>
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className={`px-2 py-1 text-sm rounded transition-colors ${
                    showNotes
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-gray-600 hover:bg-gray-500 text-white'
                  }`}
                  title="Notes & Lyrics"
                >
                  <span className="inline-flex items-center space-x-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                    <span>Notes</span>
                  </span>
                </button>
              </div>

              {/* Edit Menu */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded"
                  title="Undo (Ctrl+Z)"
                >
                  ↶
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded"
                  title="Redo (Ctrl+Shift+Z)"
                >
                  ↷
                </button>
              </div>

              <button
                onClick={() => setShowTrackCreator(!showTrackCreator)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
              >
                + Track
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Measures Control */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-300">Measures:</label>
              <input
                type="number"
                min="1"
                max="200"
                value={measures}
                onChange={(e) => setMeasures(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            
            <TransportControls
              isPlaying={isPlaying}
              isRecording={isRecording}
              onPlay={handlePlay}
              onPause={handlePause}
              onStop={handleStop}
              onRecord={handleRecord}
              currentTime={currentTime}
              bpm={dawState.bpm}
              onBpmChange={handleBpmChange}
            />

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors"
              title="設定"
            >
              ⚙️ 設定
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Track List */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="font-semibold mb-2">Track Area</h2>
          </div>
          
          <div 
            className="flex-1 overflow-y-auto"
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Sidebar area double-clicked!');
              // サイドバーの空白部分のダブルクリックでシンプルビューに切り替え
              if (e.target === e.currentTarget || 
                  (e.target as HTMLElement).classList.contains('track-area-empty') ||
                  (e.target as HTMLElement).closest('.track-area-empty')) {
                console.log('Switching to simple view via sidebar double-click');
                setSelectedTrackId(null); // トラック選択を解除
                setShowPianoRoll(false); // シンプルビューに切り替え
              }
            }}
          >
            {(dawState.tracks || []).length === 0 ? (
              <div className="p-4 text-center text-gray-400 track-area-empty">
                <p>No tracks yet</p>
                <p className="text-sm mt-2">Click + Track to get started</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {(dawState.tracks || []).map((track) => (
                  <div
                    key={track.id}
                    className={`p-3 rounded cursor-pointer transition-all hover:bg-gray-700 ${
                      selectedTrackId === track.id 
                        ? showPianoRoll 
                          ? 'bg-blue-600 border-l-4 border-blue-300' 
                          : 'bg-green-600 border-l-4 border-green-300'
                        : 'bg-gray-750'
                    }`}
                    onClick={() => {
                      // 既に選択されているトラックの場合はビューを切り替え
                      if (selectedTrackId === track.id) {
                        if (showPianoRoll) {
                          // 詳細ビューから簡易ビューに切り替え
                          setSelectedTrackId(null);
                          setShowPianoRoll(false);
                        } else {
                          // 簡易ビューから詳細ビューに切り替え
                          setShowPianoRoll(true);
                        }
                      } else {
                        // 新しいトラックを選択
                        setSelectedTrackId(track.id);
                        
                        // ドラムトラックの場合、パターンとノートの同期を確保
                        if (track.type === 'drum') {
                          let updatedTrack = track;
                          let needsUpdate = false;

                          // drumPatternが未定義の場合は初期化
                          if (!track.drumPattern) {
                            const defaultDrumPattern = {
                              steps: Array.from({ length: 16 }, () => ({
                                kick: false,
                                snare: false,
                                hihat: false,
                                openhat: false,
                                crash: false,
                                velocity: 0.8,
                              })),
                              length: 16,
                            };
                            updatedTrack = { ...updatedTrack, drumPattern: defaultDrumPattern };
                            needsUpdate = true;
                          }

                          // ドラムパターンが存在してパターンに何かデータがある場合、
                          // ノートは空にしてパターンベースの再生を優先
                          if (updatedTrack.drumPattern) {
                            const hasActiveSteps = updatedTrack.drumPattern.steps.some(step => 
                              step.kick || step.snare || step.hihat || step.openhat || step.crash
                            );
                            
                            if (hasActiveSteps && (!updatedTrack.notes || updatedTrack.notes.length === 0)) {
                              // パターンにデータがあるが、ノートがない場合はパターンを優先
                              console.log('Initial sync: Using drum pattern for track:', track.name);
                            } else if (!hasActiveSteps && updatedTrack.notes && updatedTrack.notes.length > 0) {
                              // パターンは空だが、ノートがある場合はノートを優先
                              console.log('Initial sync: Using notes for track:', track.name);
                            }
                          }
                          
                          if (needsUpdate) {
                            setDawState({
                              ...dawState,
                              tracks: (dawState.tracks || []).map(t =>
                                t.id === track.id ? updatedTrack : t
                              ),
                            });
                          }
                        }
                        
                        // トラックタイプに応じてタブを切り替える
                        if (track.type === 'synth') setActiveTab('pianoroll');
                        if (track.type === 'drum') setActiveTab('drums'); // ドラムはDrum Padsをデフォルトに
                        if (track.type === 'bass') setActiveTab('pianoroll'); // ベースもピアノロールをデフォルトに
                        setShowPianoRoll(true);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm hover:text-blue-300 transition-colors">{track.name}</div>
                        <div className="text-xs text-gray-400 capitalize">{track.type}</div>
                        {selectedTrackId === track.id && (
                          <div className="text-xs text-blue-300 mt-1">
                            {showPianoRoll ? 'Click to switch to simple view' : 'Click to switch to detail view'}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMuteToggle(track.id);
                          }}
                          className={`w-6 h-6 text-xs rounded ${
                            track.muted ? 'bg-red-500' : 'bg-gray-600 hover:bg-gray-500'
                          }`}
                        >
                          M
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSoloToggle(track.id);
                          }}
                          className={`w-6 h-6 text-xs rounded ${
                            track.soloed ? 'bg-yellow-500' : 'bg-gray-600 hover:bg-gray-500'
                          }`}
                        >
                          S
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center space-x-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={track.volume}
                        onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
                        className="flex-1 h-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="text-xs w-8 text-right">
                        {Math.round(track.volume * 100)}
                      </span>
                    </div>
                    
                  </div>
                ))}
                {/* 空白エリアを追加してダブルクリックできるように */}
                <div 
                  className="p-4 text-center text-gray-500 text-xs opacity-60 track-area-empty"
                  style={{ minHeight: '100px' }}
                >
                  Click track names to switch views
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {showTrackCreator ? (
            <div className="p-6">
              <TrackCreator onCreateTrack={handleCreateTrack} />
            </div>
          ) : (
            <>
              {/* Tab Bar */}
              <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex space-x-1">
                    {!selectedTrack ? (
                      <div className="px-3 py-1 text-sm text-gray-400">
                        {showPianoRoll ? 'Piano Roll View' : 'Track Arrangement'}
                      </div>
                    ) : (
                      <>
                        {(selectedTrack.type === 'synth' || selectedTrack.type === 'bass') && (
                          <div className="flex items-center space-x-2">
                            <div className="px-3 py-1 text-sm text-gray-400">
                              {selectedTrack.name} - {selectedTrack.type === 'bass' ? 'Bass Generator' : 'Piano Roll'}
                            </div>
                            <button
                              onClick={() => setShowMelodyGenerator(true)}
                              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded"
                              title="Generate AI Melody"
                            >
                              🤖 AI
                            </button>
                          </div>
                        )}
                        {selectedTrack.type === 'drum' && (
                          <>
                            <button
                              onClick={() => setActiveTab('pianoroll')}
                              className={`px-3 py-1 text-sm rounded ${
                                activeTab === 'pianoroll'
                                  ? 'bg-gray-600 text-white'
                                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
                              }`}
                            >
                              Piano Roll
                            </button>
                            <button
                              onClick={() => setActiveTab('drums')}
                              className={`px-3 py-1 text-sm rounded ${
                                activeTab === 'drums'
                                  ? 'bg-gray-600 text-white'
                                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
                              }`}
                            >
                              Drum Pads
                            </button>
                            <button
                              onClick={() => setShowMelodyGenerator(true)}
                              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded ml-2"
                              title="Generate AI Melody"
                            >
                              🤖 AI
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {!selectedTrack && (
                      <button
                        onClick={() => setShowTrackCreator(true)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                      >
                        Create Track
                      </button>
                    )}
                    {selectedTrack && (
                      <button
                        onClick={() => setSelectedTrackId(null)}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded"
                        title="Back to Overview"
                      >
                        ← Back
                      </button>
                    )}
                    <button
                      onClick={() => setShowKeyboard(!showKeyboard)}
                      className={`p-2 rounded-full transition-colors ${
                        showKeyboard
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                      }`}
                      title="Toggle Virtual Keyboard"
                    >
                      🎹
                    </button>
                  </div>
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex-1 overflow-hidden" style={{ minWidth: '0' }}>
                <div className="h-full p-6">
                {!selectedTrack ? (
                  // Show track arrangement or piano roll overview
                  showPianoRoll ? (
                    <TrackViewer
                      tracks={dawState.tracks || []}
                      isPlaying={isPlaying}
                      playheadPosition={playheadPosition}
                      measures={measures}
                      onMeasuresChange={setMeasures}
                      onDeleteTrack={handleDeleteTrack}
                    />
                  ) : (
                    <InlineMidiViewer
                      tracks={dawState.tracks || []}
                      selectedTrackId={selectedTrackId}
                      isPlaying={isPlaying}
                      playheadPosition={playheadPosition}
                      measures={measures}
                      onMeasuresChange={setMeasures}
                      onTrackSelect={setSelectedTrackId}
                      onSwitchToDetailView={() => {
                        console.log('Switching to detail view');
                        setShowPianoRoll(true);
                      }}
                      onDeleteTrack={handleDeleteTrack}
                    />
                  )
                ) : (
                  // Show individual track editor when track is selected
                  <>
                    {activeTab === 'pianoroll' && (selectedTrack.type === 'synth' || selectedTrack.type === 'drum' || selectedTrack.type === 'bass') && (
                      <PianoRoll
                        notes={selectedTrack.notes}
                        onNotesChange={handleNotesChange}
                        onPreviewNote={handleNotePreview}
                        isPlaying={isPlaying}
                        playheadPosition={playheadPosition}
                        measures={measures}
                        onMeasuresChange={setMeasures}
                        trackType={selectedTrack.type}
                        drumPattern={selectedTrack.drumPattern}
                        onClose={() => setSelectedTrackId(null)}
                        onPlay={handlePlay}
                        onStop={handleStop}
                        onGenerateMelody={handleMelodyGenerated}
                      />
                    )}

                    
                    {activeTab === 'drums' && selectedTrack.type === 'drum' && (
                      <DrumPads
                        pattern={selectedTrack.drumPattern || {
                          steps: Array.from({ length: 16 }, () => ({
                            kick: false,
                            snare: false,
                            hihat: false,
                            openhat: false,
                            crash: false,
                            velocity: 0.8,
                          })),
                          length: 16,
                        }}
                        onPatternChange={handleDrumPatternChange}
                        onDrumHit={handleDrumPreview}
                        isPlaying={isPlaying}
                        currentStep={Math.floor(playheadPosition)}
                      />
                    )}
                  </>
                )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar - Inspector/Effects */}
        {selectedTrack && !showTrackCreator && (
          <div className="w-80 bg-gray-800 border-l border-gray-700">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold">Inspector</h3>
              <p className="text-sm text-gray-400">{selectedTrack.name}</p>
            </div>
            <div className="p-4">
              <EffectRack
                trackId={selectedTrack.id}
                effects={selectedTrack.effects}
                onEffectToggle={() => {}}
                onEffectParameterChange={() => {}}
                onAddEffect={() => {}}
                onRemoveEffect={() => {}}
              />
            </div>
          </div>
        )}
      </div>

      {/* Notes/Lyrics Panel */}
      {showNotes && (
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-medium">Notes & Lyrics</h3>
            <button
              onClick={() => setShowNotes(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <textarea
            value={dawState.notes || ''}
            onChange={(e) => handleProjectNotesChange(e.target.value)}
            placeholder="Write your lyrics, chord progressions, or any notes here..."
            className="w-full h-32 p-3 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none resize-vertical"
            style={{ minHeight: '128px', maxHeight: '300px' }}
          />
          <div className="mt-2 text-xs text-gray-400">
            Your notes are automatically saved with the project
          </div>
        </div>
      )}

      {/* Bottom Virtual Keyboard */}
      {showKeyboard && (
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <VirtualKeyboard
            onNotePlay={handleNotePreview}
            onNoteStop={() => {}}
          />
        </div>
      )}

      {/* Melody Generator Modal */}
      {showMelodyGenerator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <MelodyGenerator
            onMelodyGenerated={handleMelodyGenerated}
            onClose={() => setShowMelodyGenerator(false)}
          />
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportAudio}
        tracks={dawState.tracks || []}
        measures={measures}
      />

      {/* Settings Modal */}
      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
        />
      )}
      </div>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <HomeContent />
    </ThemeProvider>
  );
}