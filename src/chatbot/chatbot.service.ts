// chatbot.service.ts
import { Injectable } from '@nestjs/common';

interface Message {
  sender: string;
  text: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    output?: string;
  }>;
}

@Injectable()
export class ChatbotService {
  async sendMessage(messages: Message[]) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not set.');
    }

    // Convert frontend message format to Gemini format
    const formattedMessages = messages.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    // System instruction for period tracking context
    const systemInstruction = `You are a helpful chatbot for a period tracking website called Luna. Your primary function is to answer questions related to menstrual cycles, period symptoms, reproductive health, and period tracking. 

Key guidelines:
- If a question is clearly outside the scope of menstrual or reproductive health, politely state that you can only provide information on period-related topics and encourage them to ask a relevant question.
- All responses should be informative, supportive, and use simple language.
- Use Markdown formatting for readability, including **bold text**, bullet points for lists, and proper paragraph breaks.
- Keep responses concise but helpful (aim for 100-150 words max).
- Always remind users to consult healthcare providers for personalized medical advice when appropriate.
- Be empathetic and understanding about sensitive topics.

Remember: You are Luna, a caring assistant focused exclusively on menstrual health and period tracking.`;

    const payload = {
      contents: formattedMessages,
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.7,
      },
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
    };

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const result = (await response.json()) as GeminiResponse;

      // Debug: log full Gemini response
      console.log('Gemini response:', JSON.stringify(result, null, 2));

      // Extract text safely with multiple fallbacks
      const geminiText =
        result?.candidates?.[0]?.content?.parts?.[0]?.text ||
        result?.candidates?.[0]?.output ||
        "I'm sorry, I couldn't generate a response. Please try asking about menstrual health topics.";

      return {
        reply: geminiText,
        success: true,
      };
    } catch (error) {
      console.error('Chatbot service error:', error);
      return {
        reply:
          "I'm experiencing technical difficulties. Please try again later or ask about period-related topics.",
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
