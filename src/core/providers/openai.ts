import { corexRequest } from '../network/request.js';
import { Message } from '../../types.js';
import { ProviderConfig, ChatResponse } from './anthropic.js';

export async function chatOpenAI(
    messages: Message[],
    userMessage: string,
    config: ProviderConfig,
    onToken: (token: string) => void,
    baseURL: string = 'https://api.openai.com/v1'
): Promise<ChatResponse> {
    const endpoint = `${baseURL}/chat/completions`;
    
    const formattedMessages = [
        { role: 'system', content: config.systemPrompt },
        ...messages.map(m => ({ 
            role: m.role as 'user' | 'assistant', 
            content: m.content 
        })),
        { role: 'user' as const, content: userMessage }
    ];
    
    const response = await corexRequest(
        endpoint,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: config.model,
                messages: formattedMessages,
                temperature: config.temperature,
                max_tokens: config.maxTokens,
                stream: true,
            }),
            timeout: 60000,
        },
        baseURL.includes('openrouter') ? 'openrouter' : baseURL.includes('deepseek') ? 'deepseek' : 'openai'
    );
    
    let fullContent = '';
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    
    if (response && response.forEach) {
        for (const chunk of response) {
            if (chunk.choices?.[0]?.delta?.content) {
                const text = chunk.choices[0].delta.content;
                fullContent += text;
                onToken(text);
            }
            if (chunk.usage) {
                usage = {
                    inputTokens: chunk.usage.prompt_tokens || 0,
                    outputTokens: chunk.usage.completion_tokens || 0,
                    totalTokens: chunk.usage.total_tokens || 0,
                };
            }
        }
    }
    
    return { content: fullContent, usage };
}
