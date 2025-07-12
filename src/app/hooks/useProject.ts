'use client';

import { useCallback, useEffect } from 'react';
import { DAWState, ProjectFile, ProjectTrack } from '../types/audio';

const PROJECT_VERSION = '1.0.0';
const AUTO_SAVE_KEY = 'webdaw-autosave';

export function useProject() {
  // プロジェクトをエクスポート
  const exportProject = useCallback((dawState: DAWState, projectName: string = 'Untitled Project') => {
    const projectData: ProjectFile = {
      name: projectName,
      version: PROJECT_VERSION,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      bpm: dawState.bpm,
      masterVolume: dawState.masterVolume,
      tracks: dawState.tracks?.map(track => ({
        id: track.id,
        name: track.name,
        type: track.type,
        volume: track.volume,
        pan: track.pan,
        muted: track.muted,
        soloed: track.soloed,
        notes: track.notes || [],
        synthSettings: track.synthSettings,
        drumPattern: track.drumPattern,
        effects: track.effects || [],
      })) || [],
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.replace(/[^a-z0-9]/gi, '_')}.webdaw`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  // プロジェクトをインポート
  const importProject = useCallback((file: File): Promise<ProjectFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const projectData: ProjectFile = JSON.parse(content);
          
          // 基本的なバリデーション
          if (!projectData.name || !projectData.version || !projectData.tracks) {
            throw new Error('Invalid project file format');
          }
          
          resolve(projectData);
        } catch (error) {
          reject(new Error('Failed to parse project file'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }, []);

  // DAWStateをプロジェクトデータから復元
  const projectToDAWState = useCallback((projectData: ProjectFile): Partial<DAWState> => {
    return {
      bpm: projectData.bpm,
      masterVolume: projectData.masterVolume,
      tracks: projectData.tracks.map(track => ({
        ...track,
        audioBuffer: null, // オーディオバッファは再生成が必要
      })),
      isPlaying: false,
      isRecording: false,
      currentTime: 0,
    };
  }, []);

  // 自動保存
  const autoSave = useCallback((dawState: DAWState) => {
    try {
      const projectData: ProjectFile = {
        name: 'Auto Save',
        version: PROJECT_VERSION,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        bpm: dawState.bpm,
        masterVolume: dawState.masterVolume,
        tracks: dawState.tracks?.map(track => ({
          id: track.id,
          name: track.name,
          type: track.type,
          volume: track.volume,
          pan: track.pan,
          muted: track.muted,
          soloed: track.soloed,
          notes: track.notes || [],
          synthSettings: track.synthSettings,
          drumPattern: track.drumPattern,
          effects: track.effects || [],
        })) || [],
      };

      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(projectData));
    } catch (error) {
      console.warn('Auto save failed:', error);
    }
  }, []);

  // 自動保存データを読み込み
  const loadAutoSave = useCallback((): ProjectFile | null => {
    try {
      const saved = localStorage.getItem(AUTO_SAVE_KEY);
      if (saved) {
        const projectData: ProjectFile = JSON.parse(saved);
        return projectData;
      }
    } catch (error) {
      console.warn('Failed to load auto save:', error);
    }
    return null;
  }, []);

  // 自動保存データをクリア
  const clearAutoSave = useCallback(() => {
    localStorage.removeItem(AUTO_SAVE_KEY);
  }, []);

  return {
    exportProject,
    importProject,
    projectToDAWState,
    autoSave,
    loadAutoSave,
    clearAutoSave,
  };
}