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
      prompt = `あなたは熟練した作曲家です。以下の条件で${mood}で${style}なメロディーを作成してください：

      【基本設定】
      - 調性: ${key} ${scale}スケール
      - 小節数: ${length}小節
      - テンポ: ${tempo} BPM
      - スタイル: ${style}
      - ムード: ${mood}
      ${keywords ? `- キーワード: ${keywords}（この要素を反映してください）` : ''}

      【出力形式】
      JSONの配列のみを返してください。説明は不要です。
      [{"note": "C", "octave": 4, "start": 0, "duration": 1, "velocity": 0.8}]
      
      【重要な制約】
      - 必ず${length}小節分の音楽を生成してください
      - start値の範囲: 0から${length * 4 - 1}まで使用
      - 各小節に音符を配置し、空の小節を作らない
      - 音符数の目安: 最低${length * 2}個以上の音符を生成
      
      【JSON形式の例】
      start値が0-${length * 4 - 1}の範囲内で、${length}小節すべてに音符を配置

      【音楽的指示】
      - メロディーラインは歌いやすく覚えやすいものにする
      - 音域は3オクターブから5オクターブまで（octave: 3-5）
      - リズムは4分音符(duration: 1.0)、8分音符(duration: 0.5)、2分音符(duration: 2.0)を組み合わせる
      - startは4分音符を基準とした位置（0から${length * 4 - 1}まで）
      - 小節の区切り: ${Array.from({length}, (_, i) => `${i + 1}小節目: start ${i * 4}-${i * 4 + 3}`).join('、')}
      - ベロシティは0.4から1.0の範囲で、表現豊かに設定
      - 全体で${length}小節（${length * 4}拍分の4分音符）の楽曲を作成
      - 必ず${length}小節すべてに音符を配置してください
      - 重要：${length}小節分の音楽を作ってください（短く終わらせないで）
      - 音符の総数は${length}小節に応じて適切に増やしてください
      - ${style === 'pop' ? 'キャッチーで親しみやすい' : 
          style === 'jazz' ? 'シンコペーションやブルーノートを含む' :
          style === 'classical' ? 'クラシカルで上品な' :
          style === 'electronic' ? 'シンセサイザーに適した' : 
          'ロック調でエネルギッシュな'}メロディーにする
      - ${mood === 'happy' ? '明るく躍動感のある' :
          mood === 'sad' ? '物悲しく情感豊かな' :
          mood === 'energetic' ? 'エネルギッシュで力強い' :
          mood === 'calm' ? '穏やかで安らぎのある' :
          'ミステリアスで神秘的な'}表現にする
      ${keywords ? `- 指定されたキーワード「${keywords}」の雰囲気や特徴を音楽に反映する` : ''}`;
    } else if (type === 'chords') {
      prompt = `あなたは熟練した作曲家です。以下の条件で${style}なコード進行を作成してください：

      【基本設定】
      - 調性: ${key} ${scale}スケール
      - 小節数: ${length}小節
      - スタイル: ${style}
      ${keywords ? `- キーワード: ${keywords}（この要素を反映してください）` : ''}

      【出力形式】
      JSONの配列のみを返してください。ルート音のみ（トライアドの最低音）を指定：
      [{"note": "C", "octave": 3, "start": 0, "duration": 4, "velocity": 0.6}]
      
      【重要な制約】
      - 必ず${length}個のコードを生成してください（${length}小節分）
      - 各コードは1小節（4拍）持続
      - start位置: 0, 4, 8, 12, ..., ${(length - 1) * 4}
      - 決して${length}個より少ないコード数にしないでください
      
      【JSON形式の例】
      正確に${length}個のコードオブジェクトを含む配列

      【音楽的指示】
      - 各コードは1小節（4拍）持続、duration: 4を使用
      - start位置: ${Array.from({length}, (_, i) => `${i + 1}小節目=${i * 4}`).join(', ')}
      - ルート音は3オクターブで指定
      - ${style === 'pop' ? 'I-V-vi-IV、vi-IV-I-V等のポップス定番進行' :
          style === 'jazz' ? 'ii-V-I、I-vi-ii-V等のジャズ定番進行' :
          style === 'classical' ? 'I-IV-V-I等のクラシカル進行' :
          style === 'electronic' ? 'シンプルで効果的な進行' :
          'パワフルなロック進行'}を使用
      - コード進行は音楽的に自然で流れるようにする
      - ベロシティは0.5から0.8の範囲で設定
      ${keywords ? `- 指定されたキーワード「${keywords}」に適したコード進行にする` : ''}`;
    } else if (type === 'drums') {
      prompt = `あなたは熟練したドラマーです。以下の条件でドラムパターンを作成してください：

      【基本設定】
      - スタイル: ${style}
      - テンポ: ${tempo} BPM  
      - 複雑さ: ${complexity}
      - 小節数: ${length}小節
      ${keywords ? `- キーワード: ${keywords}（この要素を反映してください）` : ''}

      【出力形式】
      JSONオブジェクトのみを返してください。説明は不要です。
      {"steps": [{"kick": true, "snare": false, "hihat": true, "openhat": false, "crash": false, "velocity": 0.8}], "length": ${length}}

      【ドラムパターン指示】
      - 16ステップ（16分音符）のパターンを作成
      - kick: キックドラム、snare: スネアドラム、hihat: ハイハット、openhat: オープンハイハット、crash: クラッシュシンバル
      - velocityは各楽器ごとに0.3から1.0の範囲で設定
      - ${style === 'rock' ? '4つ打ちキック、2拍4拍スネア中心' :
          style === 'pop' ? 'キャッチーで踊りやすいパターン' :
          style === 'jazz' ? 'スウィング感のあるパターン' :
          style === 'electronic' ? 'エレクトロニックで正確なパターン' :
          style === 'funk' ? 'グルーヴィーでシンコペーション多用' :
          'ラテンのリズムパターン'}を基調とする
      - ${complexity === 'simple' ? 'シンプルで覚えやすい' :
          complexity === 'medium' ? '適度な変化とフィル' :
          '複雑で技巧的な'}パターンにする
      ${keywords ? `- 指定されたキーワード「${keywords}」の雰囲気を反映したリズムパターンにする` : ''}`;
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
          content: 'あなたは経験豊富なプロの作曲家です。指定された小節数分の完全な楽曲を必ず生成してください。重要：ユーザーが16小節を指定した場合は16小節分、8小節なら8小節分の音楽を作成し、短縮しないでください。出力は必ずJSON形式のみで、説明文は一切含めないでください。'
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