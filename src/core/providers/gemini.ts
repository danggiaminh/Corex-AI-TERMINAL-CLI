import { corexRequest } from '../network/request.js';
import { Message } from '../../types.js';
import { ProviderConfig, ChatResponse } from './anthropic.js';

export async function chatGemini(
    messages: Message[],
    userMessage: string,
    config: ProviderConfig,
    onToken: (token: string) => void
): Promise<ChatResponse> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?alt=sse`;
    
    const contents = [
        ...messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        })),
        { role: 'user', parts: [{ text: userMessage }] }
    ];
    
    const response = await corexRequest(
        endpoint,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents,
                generationConfig: {
                    temperature: config.temperature,
                    maxOutputTokens: config.maxTokens,
                },
                systemInstruction: {
                    parts: [{ text: config.systemPrompt }]
                }
            }),
            timeout: 60000,
        },
        'gemini'
    );
    
    let fullContent = '';
    
    if (response && response.forEach) {
        for (const chunk of response) {
            if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
                const text = chunk.candidates[0].content.parts[0].text;
                fullContent += text;
                onToken(text);
            }
        }
    }
    
    return { content: fullContent };
}
