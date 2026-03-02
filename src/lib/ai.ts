import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { Message, TokenUsage, CorexConfig } from '../types.js';

let anthropic: Anthropic | null = null;
let gemini: GoogleGenerativeAI | null = null;
let openai: OpenAI | null = null;

export function initAI(apiKey: string, config: CorexConfig): void {
    const { provider } = config;
    // Reset clients
    anthropic = null;
    gemini = null;
    openai = null;

    if (provider === 'anthropic') {
        anthropic = new Anthropic({ apiKey });
    } else if (provider === 'gemini') {
        gemini = new GoogleGenerativeAI(apiKey);
    } else if (provider === 'openai') {
        openai = new OpenAI({ apiKey });
    } else if (provider === 'openrouter') {
        openai = new OpenAI({ 
            apiKey, 
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                "HTTP-Referer": "https://github.com/corex-ai", 
                "X-Title": "COREX CLI",
            }
        });
    } else if (provider === 'deepseek') {
        openai = new OpenAI({ 
            apiKey, 
            baseURL: 'https://api.deepseek.com' 
        });
    }
}

export async function sendMessage(
    history: Message[],
    userMessage: string,
    config: CorexConfig,
    onToken: (token: string) => void,
    onComplete: (fullText: string, usage: TokenUsage) => void,
    onError: (error: Error) => void,
    imageContent?: string | null
): Promise<void> {
    const { provider, model, systemPrompt, temperature, maxTokens } = config;

    try {
        if (provider === 'anthropic' && anthropic) {
            const currentMessageContent: any[] = [{ type: 'text', text: userMessage }];
            if (imageContent) {
                currentMessageContent.push({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: 'image/png', // Assuming png for simplicity or detect?
                        data: imageContent,
                    }
                });
            }

            const stream = anthropic.messages.stream({
                model,
                max_tokens: maxTokens,
                temperature,
                system: systemPrompt,
                messages: [
                    ...history.map(m => ({ 
                        role: m.role as 'user' | 'assistant', 
                        content: m.content 
                    })),
                    { role: 'user', content: currentMessageContent as any } // Cast because SDK types might be strict
                ],
            });

            let fullText = '';
            stream.on('text', (text) => {
                fullText += text;
                onToken(text);
            });

            const finalMessage = await stream.finalMessage();
            onComplete(fullText, {
                inputTokens: finalMessage.usage?.input_tokens || 0,
                outputTokens: finalMessage.usage?.output_tokens || 0,
                totalTokens: (finalMessage.usage?.input_tokens || 0) + (finalMessage.usage?.output_tokens || 0),
            });

        } else if (provider === 'gemini' && gemini) {
            const genModel = gemini.getGenerativeModel({ model });
            const chat = genModel.startChat({
                history: history.map(m => ({ 
                    role: m.role === 'user' ? 'user' : 'model', 
                    parts: [{ text: m.content }] 
                })),
                generationConfig: { maxOutputTokens: maxTokens, temperature },
            });

            const parts: any[] = [{ text: userMessage }];
            if (imageContent) {
                parts.push({
                    inlineData: {
                        mimeType: 'image/png',
                        data: imageContent
                    }
                });
            }

            const result = await chat.sendMessageStream(parts);
            let fullText = '';
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullText += chunkText;
                onToken(chunkText);
            }
            onComplete(fullText, { inputTokens: 0, outputTokens: 0, totalTokens: 0 });

        } else if ((provider === 'openai' || provider === 'openrouter' || provider === 'deepseek') && openai) {
            let messages: any[] = [
                { role: 'system', content: systemPrompt },
                ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
            ];

            const userMsgObj: any = { role: 'user', content: userMessage };
            if (imageContent) {
                userMsgObj.content = [
                    { type: 'text', text: userMessage },
                    { 
                        type: 'image_url', 
                        image_url: {
                            url: `data:image/png;base64,${imageContent}`
                        }
                    }
                ];
            }
            messages.push(userMsgObj);

            const stream = await openai.chat.completions.create({
                model,
                messages,
                stream: true,
                temperature,
                max_tokens: maxTokens,
            });

            let fullText = '';
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    fullText += content;
                    onToken(content);
                }
            }
            onComplete(fullText, { inputTokens: 0, outputTokens: 0, totalTokens: 0 });

        } else {
            throw new Error(`Provider ${provider} not initialized.`);
        }
    } catch (err: any) {
        let message = err.message || 'An unexpected error occurred.';
        if (err.status === 401) message = 'Invalid API key. Run /config to update.';
        onError(new Error(message));
    }
}
