export interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}

export type ThemeName = 'default' | 'matrix' | 'cyberpunk' | 'ocean' | 'blood';

export interface Theme {
    label: string;
    userText: string;
    aiText: string;
    border: string;
    accent: string;
    statusBar: string;
    headerGradient: string[];
}

export interface CorexConfig {
    apiKey: string;
    provider: 'anthropic' | 'gemini' | 'openai' | 'openrouter' | 'deepseek';
    model: string;
    theme: ThemeName;
    systemPrompt: string;
    maxTokens: number;
    temperature: number;
    saveHistory: boolean;
    userName: string;
}
