import { corexRequest, NetworkError } from '../network/request.js';
import { Message } from '../../types.js';

export interface ProviderConfig {
    apiKey: string;
    model: string;
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
}

export interface ChatResponse {
    content: string;
    usage?: {
        inputTokens: number;
        outputTokens: number;
        totalTokens: number;
    };
}

export async function chatAnthropic(
    messages: Message[],
    userMessage: string,
    config: ProviderConfig,
    onToken: (token: string) => void
): Promise<ChatResponse> {
    const endpoint = 'https://api.anthropic.com/v1/messages';
    
    const formattedMessages = [
        ...messages.map(m => ({ 
            role: m.role as 'user' | 'assistant', 
            content: m.content 
        })),
        { role: 'user' as const, content: userMessage }
    ];
    
    const requestBody: any = {
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        system: config.systemPrompt,
        messages: formattedMessages,
        stream: true,
    };
    
    const response = await corexRequest(
        endpoint,
        {
            method: 'POST',
            headers: {
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            timeout: 60000,
        },
        'anthropic'
    );
    
    let fullContent = '';
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    
    if (response && response.forEach) {
        for (const event of response) {
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                const text = event.delta.text;
                fullContent += text;
                onToken(text);
            }
            if (event.type === 'message_delta' && event.usage) {
                usage = {
                    inputTokens: event.usage.input_tokens || 0,
                    outputTokens: event.usage.output_tokens || 0,
                    totalTokens: (event.usage.input_tokens || 0) + (event.usage.output_tokens || 0),
                };
            }
        }
    }
    
    return { content: fullContent, usage };
}

export async function detectProvider(apiKey: string): Promise<string> {
    const key = apiKey.trim();
    
    if (key.startsWith('sk-ant-')) {
        return 'anthropic';
    }
    if (key.startsWith('AIza')) {
        return 'gemini';
    }
    if (key.startsWith('sk-or-v1-') || key.startsWith('sk-or-')) {
        return 'openrouter';
    }
    if (key.startsWith('sk-proj-')) {
        return 'openai';
    }
    if (key.startsWith('sk-') && !key.startsWith('sk-or-')) {
        return 'openai';
    }
    if (key.startsWith('ds-') || key.toLowerCase().includes('deepseek')) {
        return 'deepseek';
    }
    
    throw new Error(`Cannot detect provider from API key. Please check your key format.`);
}
