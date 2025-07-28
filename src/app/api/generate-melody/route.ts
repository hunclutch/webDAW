import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  let requestType = 'melody'; // Default fallback
  
  try {
    console.log('ChatGPT API request started');
    const body = await request.json();
    const {
      key = 'C',
      scale = 'major',
      length = 4,
      tempo = 120,
      style = 'pop',
      mood = 'happy',
      type = 'melody',
      keywords = '',
      complexity = 'medium',
      apiKey
    } = body;
    
    requestType = type; // Store type for error handling

    // Check if user provided API key or use environment variable as fallback
    let openaiApiKey = apiKey;
    if (!openaiApiKey) {
      openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new Error('OpenAI APIキーが設定されていません。設定ページでAPIキーを入力するか、環境変数を設定してください。');
      }
    }

    if (!openaiApiKey.startsWith('sk-')) {
      throw new Error('OpenAI APIキーの形式が正しくありません（sk-で始まる必要があります）');
    }

    // Create OpenAI client with the provided API key
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Helper function to get scale notes
    const getScaleNotes = (key: string, scale: string) => {
      const noteMap: { [key: string]: number } = {
        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
        'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
      };
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const rootIndex = noteMap[key] || 0;
      
      let intervals: number[];
      if (scale === 'minor') {
        intervals = [0, 2, 3, 5, 7, 8, 10]; // Natural minor
      } else if (scale === 'pentatonic') {
        intervals = [0, 2, 4, 7, 9]; // Major pentatonic
      } else if (scale === 'blues') {
        intervals = [0, 3, 5, 6, 7, 10]; // Blues scale
      } else {
        intervals = [0, 2, 4, 5, 7, 9, 11]; // Major scale
      }
      
      return intervals.map(interval => noteNames[(rootIndex + interval) % 12]);
    };

    let prompt: string;
    
    if (type === 'melody') {
      // Generate varied melodic examples based on style and mood
      const getMelodicExamples = () => {
        const scaleNotes = getScaleNotes(key, scale);
        const examples = [];
        
        // Create different melodic patterns based on style
        if (style === 'jazz') {
          examples.push(`{"note": "${scaleNotes[6] || scaleNotes[0]}", "octave": 4, "start": 0, "duration": 0.5, "velocity": 0.7}`);
          examples.push(`{"note": "${scaleNotes[0]}", "octave": 4, "start": 0.5, "duration": 1.5, "velocity": 0.8}`);
        } else if (style === 'electronic') {
          examples.push(`{"note": "${scaleNotes[0]}", "octave": 5, "start": 0, "duration": 0.25, "velocity": 0.9}`);
          examples.push(`{"note": "${scaleNotes[2] || scaleNotes[1]}", "octave": 5, "start": 0.25, "duration": 0.25, "velocity": 0.8}`);
        } else if (style === 'classical') {
          examples.push(`{"note": "${scaleNotes[0]}", "octave": 4, "start": 0, "duration": 2, "velocity": 0.6}`);
          examples.push(`{"note": "${scaleNotes[1] || scaleNotes[0]}", "octave": 4, "start": 2, "duration": 1, "velocity": 0.7}`);
        } else {
          examples.push(`{"note": "${scaleNotes[0]}", "octave": 4, "start": 0, "duration": 1, "velocity": 0.8}`);
          examples.push(`{"note": "${scaleNotes[2] || scaleNotes[1] || scaleNotes[0]}", "octave": 4, "start": 1, "duration": 1, "velocity": 0.7}`);
        }
        return examples.slice(0, 4);
      };
      
      prompt = `${style}スタイルの${mood}なメロディーを${length}小節分生成してください。

【基本要件】:
- 総時間: ${length * 4}拍分
- 調: ${key} ${scale}スケール
- オクターブ: 3-5の範囲
- デュレーション: 0.25-4.0の範囲（4分音符基準）
- ベロシティ: 0.4-1.0の範囲

【スタイル特性を活かして】:
${style === 'jazz' ? '- シンコペーション、7th音程、スウィング感' : 
  style === 'electronic' ? '- 短い音符、高い音域、アクセント' :
  style === 'classical' ? '- 長い音符、滑らかな進行、表現豊か' :
  style === 'rock' ? '- パワフル、リズミカル、中音域中心' :
  '- キャッチーなメロディ、覚えやすいフレーズ'}

【ムード表現】:
${mood === 'happy' ? '明るく跳ねるような音程配置' :
  mood === 'sad' ? '下降気味、マイナー寄りの音程' :
  mood === 'energetic' ? '急速な音符変化、高音域活用' :
  mood === 'calm' ? 'ゆったりとした長めの音符' :
  '神秘的な音程関係、予想外の展開'}

${keywords ? `追加要素: ${keywords}` : ''}

【出力形式】: JSON配列のみ（例: [${getMelodicExamples().slice(0, 2).join(', ')}]）`;
    } else if (type === 'chords') {
      // Generate exact chord examples
      const chordExamples = [];
      const basicChords = ['C', 'F', 'G', 'Am'];
      for (let i = 0; i < Math.min(length, 4); i++) {
        const chordNote = basicChords[i % basicChords.length];
        chordExamples.push(`{"note": "${chordNote}", "octave": 3, "start": ${i * 4}, "duration": 4, "velocity": 0.7}`);
      }
      
      prompt = `正確に${length}個のコード進行を生成してください。

【厳格な条件 - 必ず守る】:
1. コード数: 正確に${length}個
2. start値: ${Array.from({length}, (_, i) => i * 4).join(', ')}
3. 調: ${key} ${scale}の和音のみ
4. octave: 3のみ
5. duration: 4のみ
6. velocity: 0.6-0.8の範囲

【出力形式】:
[${chordExamples.join(', ')}]

【禁止事項】:
- 説明文やコメントの追加
- 指定以外のstart値
- ${length}個以外のコード数
- duration 4以外の値

${style}スタイルで作成してください。${keywords ? `キーワード: ${keywords}` : ''}`;
    } else if (type === 'drums') {
      const exampleStep = `{"kick": true, "snare": false, "hihat": true, "openhat": false, "crash": false, "velocity": 0.8}`;
      
      prompt = `ドラムパターンを生成してください。

【厳格な条件 - 必ず守る】:
1. 正確に16個のstepsを持つ配列
2. 各stepは必須プロパティ: kick, snare, hihat, openhat, crash (true/false), velocity (数値)
3. velocity: 0.5-1.0の範囲のみ
4. lengthプロパティ: ${length}

【出力形式】:
{"steps": [${exampleStep}, ${exampleStep}, ...（16個）], "length": ${length}}

【禁止事項】:
- 説明文やコメントの追加
- 16個以外のsteps数
- 必須プロパティの欠落
- 範囲外のvelocity値

${style}スタイルの${complexity}レベルで作成してください。${keywords ? `キーワード: ${keywords}` : ''}`;
    } else {
      throw new Error(`Unsupported generation type: ${type}`);
    }

    console.log('Sending request to ChatGPT with parameters:', { key, scale, length, tempo, style, mood, type });
    console.log('Generated prompt:', prompt);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは創造性豊かな音楽生成AIです。多様で魅力的な音楽を作成します。

【出力ルール】:
1. JSON形式のみ出力（説明文禁止）
2. 各音符: {"note": "C", "octave": 4, "start": 0, "duration": 1, "velocity": 0.8}
3. スタイルとムードを活かした独創的なメロディー
4. 音符の配置、長さ、強さに変化をつける
5. 同じパターンの繰り返しを避ける

【創造性のポイント】:
- リズムバリエーション（様々なduration）
- 音域の変化（octave 3-5）
- 強弱の表現（velocity 0.4-1.0）
- スタイル固有の特徴を反映
- ムードに適した音程関係

毎回新しく、印象的なメロディーを生成してください。`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8, // Increased for more creative variation
      max_tokens: Math.max(2000, length * 150)
    });
    
    console.log('ChatGPT response received:', response.choices[0]?.message?.content);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('ChatGPTからの応答がありません');
    }

    // Clean up the response and extract JSON
    let cleanContent = content.trim();
    
    // Remove code block markers if present
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Parse the JSON response with better error handling
    let melodyData;
    try {
      melodyData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('JSON解析エラー:', parseError);
      console.error('受信したコンテンツ:', content);
      throw new Error('ChatGPTの応答をJSON形式で解析できませんでした');
    }

    if (type === 'drums') {
      // For drum patterns, validate it's an object with steps
      if (!melodyData || typeof melodyData !== 'object' || !melodyData.steps) {
        throw new Error('ChatGPTの応答がドラムパターン形式ではありません');
      }
      const stepsCount = melodyData.steps?.length || 0;
      console.log('Successfully generated drum pattern with', stepsCount, 'steps');
      return NextResponse.json({ pattern: melodyData });
    } else {
      // Validate that it's an array for melody/chords
      if (!Array.isArray(melodyData)) {
        throw new Error('ChatGPTの応答が配列形式ではありません');
      }
      // Convert to Note format with unique IDs and validation for melody/chords
      const notes = melodyData
        .filter((noteData: any) => {
          // Basic validation
          return noteData.note && 
                 typeof noteData.octave === 'number' && 
                 typeof noteData.start === 'number' && 
                 typeof noteData.duration === 'number' && 
                 typeof noteData.velocity === 'number';
        })
        .map((noteData: any, index: number) => ({
          id: `chatgpt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
          note: noteData.note,
          octave: Math.max(1, Math.min(7, noteData.octave)), // Clamp octave to valid range
          start: Math.max(0, noteData.start), // Ensure positive start time
          duration: Math.max(0.25, noteData.duration), // Minimum duration
          velocity: Math.max(0.1, Math.min(1.0, noteData.velocity)) // Clamp velocity
        }));

      if (notes.length === 0) {
        throw new Error('ChatGPTから有効な音符データを取得できませんでした');
      }

      console.log('Successfully generated notes:', notes.length, 'notes');
      return NextResponse.json({ notes });
    }
  } catch (error) {
    console.error('Error generating melody:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    
    // Return error response instead of fallback
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        error: true,
        message: errorMessage,
        type: requestType
      },
      { status: 500 }
    );
  }
}

function generateFallbackMelody(length: number) {
  const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const fallbackNotes = [];
  
  for (let measure = 0; measure < length; measure++) {
    for (let beat = 0; beat < 4; beat++) {
      const noteIndex = (measure * 4 + beat) % notes.length;
      fallbackNotes.push({
        id: `fallback-api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${measure}-${beat}`,
        note: notes[noteIndex],
        octave: 4,
        start: measure * 4 + beat,
        duration: 1,
        velocity: 0.7
      });
    }
  }
  
  return fallbackNotes;
}

function generateFallbackDrumPattern(length: number) {
  // Basic rock drum pattern
  const basicStep = {
    kick: false,
    snare: false,
    hihat: false,
    openhat: false,
    crash: false,
    velocity: 0.8
  };

  const steps = [];
  
  // Create a basic 16-step rock pattern
  for (let i = 0; i < 16; i++) {
    const step = { ...basicStep };
    
    // Kick on beats 1 and 3 (steps 0, 8)
    if (i === 0 || i === 8) {
      step.kick = true;
      step.velocity = 0.9;
    }
    
    // Snare on beats 2 and 4 (steps 4, 12)
    if (i === 4 || i === 12) {
      step.snare = true;
      step.velocity = 0.85;
    }
    
    // Hi-hat on every other step
    if (i % 2 === 0) {
      step.hihat = true;
      step.velocity = 0.6;
    }
    
    steps.push(step);
  }

  return {
    steps: steps,
    length: length
  };
}