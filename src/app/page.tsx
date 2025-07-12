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

export default function Home() {
  const { initializeAudioContext, getMasterGain } = useAudioContext();
  const [audioEngine, setAudioEngine] = useState<AudioEngine | null>(null);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'drums' | 'pianoroll'>('pianoroll');
  const [showTrackCreator, setShowTrackCreator] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [projectName, setProjectName] = useState('Untitled Project');
  
  const initialDAWState: DAWState = {
    isPlaying: false,
    isRecording: false,
    currentTime: 0,
    bpm: 120,
    tracks: [],
    masterVolume: 0.8,
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
  const [measures, setMeasures] = useState(60); // デフォルト60小節
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
      if (dawState.tracks && dawState.tracks.length > 0) {
        autoSave(dawState);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [dawState, autoSave]);

  // 初回読み込み時に自動保存データを復元
  useEffect(() => {
    const autoSaveData = loadAutoSave();
    if (autoSaveData && autoSaveData.tracks.length > 0) {
      const shouldRestore = window.confirm('前回の作業データが見つかりました。復元しますか？');
      if (shouldRestore) {
        const restoredState = projectToDAWState(autoSaveData);
        resetHistory(restoredState as DAWState);
        setProjectName(autoSaveData.name);
      }
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

  const handlePlay = useCallback(async () => {
    if (!audioEngine) {
      await initAudio();
      return;
    }
    
    audioEngine.play(dawState.tracks || []);
    setIsPlaying(true);
  }, [audioEngine, initAudio, dawState.tracks]);

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

  const handleNotesChange = useCallback((notes: Note[]) => {
    if (!selectedTrackId) return;
    
    setDawState({
      ...dawState,
      tracks: (dawState.tracks || []).map(track =>
        track.id === selectedTrackId ? { ...track, notes } : track
      ),
    });
  }, [selectedTrackId, dawState, setDawState]);

  const handleDrumPatternChange = useCallback((pattern: DrumPattern) => {
    if (!selectedTrackId) return;
    
    setDawState({
      ...dawState,
      tracks: (dawState.tracks || []).map(track =>
        track.id === selectedTrackId ? { ...track, drumPattern: pattern } : track
      ),
    });
  }, [selectedTrackId, dawState, setDawState]);

  const handleNotePreview = useCallback((note: string, octave: number) => {
    if (audioEngine) {
      audioEngine.getSequencer().playNotePreview(note, octave, selectedTrackId || undefined);
    }
  }, [audioEngine, selectedTrackId]);

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
      clearAutoSave();
    }
  }, [resetHistory, clearAutoSave]);

  const handleExportAudio = useCallback(async (format: 'wav' | 'mp3', filename: string) => {
    if (!audioEngine) {
      alert('オーディオエンジンが初期化されていません。再生ボタンを押してから再度お試しください。');
      return;
    }

    try {
      const exporter = new AudioExporter(audioEngine.getAudioContext());
      await exporter.exportTracks(dawState.tracks || [], measures, dawState.bpm, format);
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }, [audioEngine, dawState.tracks, dawState.bpm, measures]);

  const selectedTrack = dawState.tracks?.find(track => track.id === selectedTrackId) || null;
  const playheadPosition = audioEngine ? audioEngine.getPlayheadPosition() : 0;

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* Top Bar - Logic Pro Style */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
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
          
          <TransportControls
            isPlaying={isPlaying}
            isRecording={isRecording}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            onRecord={() => setIsRecording(!isRecording)}
            currentTime={currentTime}
            bpm={dawState.bpm}
            onBpmChange={handleBpmChange}
          />
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
                <p className="text-xs mt-4 opacity-60">Double-click here for simple view</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {(dawState.tracks || []).map((track) => (
                  <div
                    key={track.id}
                    className={`p-3 rounded cursor-pointer transition-all hover:bg-gray-700 ${
                      selectedTrackId === track.id ? 'bg-blue-600' : 'bg-gray-750'
                    }`}
                    onClick={() => {
                      setSelectedTrackId(track.id);
                      // トラックタイプに応じてタブを切り替える
                      if (track.type === 'synth') setActiveTab('pianoroll');
                      if (track.type === 'drum') setActiveTab('drums');
                      setShowPianoRoll(true);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{track.name}</div>
                        <div className="text-xs text-gray-400 capitalize">{track.type}</div>
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
                  Double-click here for simple view
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
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Simple View button clicked from track editor! Current showPianoRoll:', showPianoRoll);
                            setSelectedTrackId(null); // トラック選択を解除
                            setShowPianoRoll(false); // シンプルビューに切り替え
                            console.log('Deselected track and set showPianoRoll to false');
                          }}
                          className="px-3 py-1 text-sm rounded bg-red-600 hover:bg-red-700 text-white"
                        >
                          Simple View
                        </button>
                        {selectedTrack.type === 'synth' && (
                          <div className="px-3 py-1 text-sm text-gray-400">
                            {selectedTrack.name} - Piano Roll
                          </div>
                        )}
                        {selectedTrack.type === 'drum' && (
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
              <div className="flex-1 p-6 overflow-auto">
                {!selectedTrack ? (
                  // Show track arrangement or piano roll overview
                  showPianoRoll ? (
                    <TrackViewer
                      tracks={dawState.tracks || []}
                      isPlaying={isPlaying}
                      playheadPosition={playheadPosition}
                      measures={measures}
                      onMeasuresChange={setMeasures}
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
                    />
                  )
                ) : (
                  // Show individual track editor when track is selected
                  <>
                    {activeTab === 'pianoroll' && selectedTrack.type === 'synth' && (
                      <PianoRoll
                        notes={selectedTrack.notes}
                        onNotesChange={handleNotesChange}
                        onPreviewNote={handleNotePreview}
                        isPlaying={isPlaying}
                        playheadPosition={playheadPosition}
                        measures={measures}
                        onMeasuresChange={setMeasures}
                        onSwitchToSimpleView={() => {
                          console.log('Switching to simple view from PianoRoll component');
                          setSelectedTrackId(null);
                          setShowPianoRoll(false);
                        }}
                      />
                    )}
                    
                    {activeTab === 'drums' && selectedTrack.type === 'drum' && selectedTrack.drumPattern && (
                      <DrumPads
                        pattern={selectedTrack.drumPattern}
                        onPatternChange={handleDrumPatternChange}
                        onDrumHit={handleDrumPreview}
                        isPlaying={isPlaying}
                        currentStep={Math.floor(playheadPosition)}
                      />
                    )}
                  </>
                )}
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

      {/* Bottom Virtual Keyboard */}
      {showKeyboard && (
        <div className="bg-gray-800 border-t border-gray-700 p-4">
          <VirtualKeyboard
            onNotePlay={handleNotePreview}
            onNoteStop={() => {}}
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
    </div>
  );
}