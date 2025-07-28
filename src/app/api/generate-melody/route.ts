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

    let prompt: string;
    
    if (type === 'melody') {
      // Generate exact examples for each measure
      const exactExamples = [];
      for (let i = 0; i < Math.min(length, 4); i++) {
        const measureStart = i * 4;
        exactExamples.push(`{"note": "C", "octave": 4, "start": ${measureStart}, "duration": 1, "velocity": 0.8}`);
        exactExamples.push(`{"note": "E", "octave": 4, "start": ${measureStart + 1}, "duration": 1, "velocity": 0.7}`);
        exactExamples.push(`{"note": "G", "octave": 4, "start": ${measureStart + 2}, "duration": 1, "velocity": 0.8}`);
        exactExamples.push(`{"note": "C", "octave": 5, "start": ${measureStart + 3}, "duration": 1, "velocity": 0.7}`);
      }
      
      prompt = `正確に${length}小節のメロディーを生成してください。

【厳格な条件 - 必ず守る】:
1. 音符数: 正確に${length * 4}個
2. start値: 0, 1, 2, 3, ..., ${length * 4 - 1} を順番に使用
3. 調: ${key} ${scale}スケールの音のみ使用
4. octave: 3, 4, 5のみ
5. duration: 1.0のみ（4分音符）
6. velocity: 0.6-0.9の範囲

【出力形式】:
[${exactExamples.slice(0, 8).join(', ')}]

【禁止事項】:
- 説明文やコメントの追加
- 範囲外のstart値
- ${length * 4}個以外の音符数
- duration以外の値

${mood}で${style}な雰囲気で作成してください。${keywords ? `キーワード: ${keywords}` : ''}`;
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
          content: `あなたは厳密な仕様に従う音楽生成AIです。

【絶対遵守事項】:
1. JSON形式のみ出力（説明文、コメント、マークダウン記法は一切禁止）
2. 指定された数値（音符数、コード数、ステップ数）を必ず守る
3. start値は指定範囲内のみ使用
4. 全ての必須プロパティを含める
5. 値の範囲を厳密に守る

【出力形式検証】:
- メロディー: 配列形式、指定音符数
- コード: 配列形式、指定コード数  
- ドラム: オブジェクト形式、16ステップ配列

仕様違反は即座に失敗となります。正確性を最優先してください。`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: Math.max(2000, length * 150) // More tokens for strict formatting
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