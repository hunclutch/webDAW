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
      prompt = `${length}小節の${style}メロディーを${key} ${scale}スケールで作成してください。

JSON配列で返してください：
[{"note": "C", "octave": 4, "start": 0, "duration": 1, "velocity": 0.8}]

条件:
- ${length}小節 = ${length * 4}拍（start: 0-${length * 4 - 1}）
- 各小節に音符を配置
- octave: 3-5
- duration: 4分音符=1.0, 8分音符=0.5, 2分音符=2.0
- velocity: 0.4-1.0
- ${mood}な雰囲気${keywords ? `、${keywords}の要素を含む` : ''}

${length}小節分の完全なメロディーを生成してください。`;
    } else if (type === 'chords') {
      prompt = `${length}小節の${style}コード進行を${key} ${scale}スケールで作成してください。

JSON配列で返してください：
[{"note": "C", "octave": 3, "start": 0, "duration": 4, "velocity": 0.6}]

条件:
- ${length}個のコード（各コード1小節=4拍）
- start位置: 0, 4, 8, 12...（4の倍数）
- octave: 3
- duration: 4
- velocity: 0.5-0.8
${keywords ? `- ${keywords}の要素を含む` : ''}

${length}個のコードで完全な進行を作成してください。`;
    } else if (type === 'drums') {
      prompt = `${style}スタイルの${complexity}なドラムパターンを作成してください。

JSONオブジェクトで返してください：
{"steps": [{"kick": true, "snare": false, "hihat": true, "openhat": false, "crash": false, "velocity": 0.8}], "length": ${length}}

条件:
- 16ステップの配列
- kick, snare, hihat, openhat, crash (true/false)
- velocity: 0.3-1.0
- ${style}の特徴を反映
${keywords ? `- ${keywords}の雰囲気を含む` : ''}

16ステップの完全なパターンを作成してください。`;
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
          content: '音楽データをJSON形式で生成してください。説明は不要で、JSONのみ返してください。指定された小節数分の完全な音楽を作成してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: Math.max(1000, length * 100) // Dynamic token limit based on measure count
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
    
    if (requestType === 'drums') {
      // Return fallback drum pattern on error
      const fallbackPattern = generateFallbackDrumPattern(4);
      return NextResponse.json({ pattern: fallbackPattern });
    } else {
      // Return fallback melody on error
      const fallbackNotes = generateFallbackMelody(4);
      return NextResponse.json({ notes: fallbackNotes });
    }
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