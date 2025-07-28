'use client';

import { useState, useEffect } from 'react';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [isValidKey, setIsValidKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // ローカルストレージからAPIキーを読み込み
  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setIsValidKey(validateApiKey(savedKey));
    }
  }, []);

  // APIキーの形式をバリデーション
  const validateApiKey = (key: string): boolean => {
    return key.startsWith('sk-') && key.length > 20;
  };

  // APIキーの変更ハンドラー
  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    setIsValidKey(validateApiKey(value));
    setMessage(''); // メッセージをクリア
  };

  // APIキーの保存
  const handleSave = async () => {
    if (!isValidKey) {
      setMessage('有効なOpenAI APIキーを入力してください（sk-で始まる必要があります）');
      return;
    }

    setIsSaving(true);
    try {
      // ローカルストレージに保存
      localStorage.setItem('openai_api_key', apiKey);
      
      // APIキーの有効性をテスト
      const testResponse = await fetch('/api/test-openai-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });

      if (testResponse.ok) {
        setMessage('APIキーが正常に保存されました');
      } else {
        const error = await testResponse.json();
        setMessage(`APIキーのテストに失敗しました: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      setMessage('APIキーの保存中にエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  // APIキーの削除
  const handleClear = () => {
    setApiKey('');
    setIsValidKey(false);
    localStorage.removeItem('openai_api_key');
    setMessage('APIキーが削除されました');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">設定</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* OpenAI API キー設定 */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">OpenAI API 設定</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                OpenAI API キー
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder="sk-..."
                  className={`w-full bg-gray-700 text-white rounded px-3 py-2 border ${
                    apiKey && !isValidKey 
                      ? 'border-red-500' 
                      : isValidKey 
                      ? 'border-green-500' 
                      : 'border-gray-600'
                  } focus:border-blue-500 focus:outline-none`}
                />
                {apiKey && (
                  <div className="absolute right-3 top-2">
                    {isValidKey ? (
                      <span className="text-green-500">✓</span>
                    ) : (
                      <span className="text-red-500">✗</span>
                    )}
                  </div>
                )}
              </div>
              {apiKey && !isValidKey && (
                <p className="text-red-400 text-sm mt-1">
                  APIキーは "sk-" で始まる必要があります
                </p>
              )}
            </div>

            <div className="text-sm text-gray-400 mb-4">
              <p>• OpenAI Platform（<a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">https://platform.openai.com/api-keys</a>）でAPIキーを取得できます</p>
              <p>• APIキーはローカルストレージに安全に保存され、ブラウザ上でのみ使用されます</p>
              <p>• メロディーとドラムパターンの生成にChatGPT（GPT-3.5-turbo）を使用します</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSave}
                disabled={!isValidKey || isSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded font-medium transition-colors"
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
              
              <button
                onClick={handleClear}
                disabled={!apiKey}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded font-medium transition-colors"
              >
                削除
              </button>
            </div>

            {message && (
              <div className={`mt-3 p-3 rounded ${
                message.includes('正常') || message.includes('削除') 
                  ? 'bg-green-800 text-green-200' 
                  : 'bg-red-800 text-red-200'
              }`}>
                {message}
              </div>
            )}
          </div>

          {/* その他の設定（将来の拡張用） */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">アプリケーション設定</h3>
            <div className="text-sm text-gray-400">
              <p>• 今後、オーディオ設定やMIDI設定などが追加される予定です</p>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-600">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}