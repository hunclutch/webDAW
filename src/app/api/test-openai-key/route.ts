import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'APIキーが提供されていません' },
        { status: 400 }
      );
    }

    if (!apiKey.startsWith('sk-')) {
      return NextResponse.json(
        { error: 'APIキーの形式が正しくありません' },
        { status: 400 }
      );
    }

    // OpenAI クライアントを作成
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // 簡単なテストリクエストを送信
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Hello! Just testing the API connection. Please respond with "API connection successful".'
          }
        ],
        max_tokens: 20,
        temperature: 0
      });

      if (response.choices[0]?.message?.content) {
        return NextResponse.json({ 
          success: true,
          message: 'APIキーが有効です'
        });
      } else {
        return NextResponse.json(
          { error: 'APIからの応答が不正です' },
          { status: 400 }
        );
      }
    } catch (openaiError: any) {
      console.error('OpenAI API Error:', openaiError);
      
      if (openaiError.status === 401) {
        return NextResponse.json(
          { error: 'APIキーが無効です' },
          { status: 401 }
        );
      } else if (openaiError.status === 429) {
        return NextResponse.json(
          { error: 'APIクォータ制限に達しています' },
          { status: 429 }
        );
      } else if (openaiError.status === 403) {
        return NextResponse.json(
          { error: 'APIアクセスが拒否されました' },
          { status: 403 }
        );
      } else {
        return NextResponse.json(
          { error: `OpenAI API エラー: ${openaiError.message}` },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('API Key test error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}