// chatbot.service.ts
import { Injectable } from '@nestjs/common';
import fetch from 'node-fetch';

@Injectable()
export class ChatbotService {
  async sendMessage(message: string) {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not set.');
    }

    const payload = {
      contents: [{ role: 'user', parts: [{ text: message }] }],
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    const result = await response.json();

    // 👀 Debug: log full Gemini response
    console.log('Gemini response:', JSON.stringify(result, null, 2));

    // ✅ Extract text safely
    const geminiText =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ??
      result?.candidates?.[0]?.output ?? // fallback if API structure differs
      null;

    return { reply: geminiText };
  }
}
