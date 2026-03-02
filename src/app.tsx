import React, { useState, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { CorexConfig, Message } from './types.js';
import { addMessage } from './lib/history.js';
import ChatHistory from './components/ChatHistory.js';
import InputBar from './components/InputBar.js';
import TopBar from './components/TopBar.js';
import StatusArea from './components/StatusArea.js';
import BootScreen from './components/BootScreen.js';
import ApiKeyScreen from './components/ApiKeyScreen.js';
import { theme } from './themes/themes.js';
import { detectProvider } from './core/providers/index.js';
import { chatAnthropic, chatOpenAI, chatGemini, ProviderConfig } from './core/providers/index.js';
import { NetworkError, parseApiError } from './core/network/request.js';

interface AppProps {
    config: CorexConfig;
}

type Screen = 'boot' | 'apiKey' | 'chat';

const App: React.FC<AppProps> = ({ config: initialConfig }: AppProps) => {
    const { exit } = useApp();
    const [screen, setScreen] = useState<Screen>('boot');
    const [config, setConfig] = useState<CorexConfig>(initialConfig);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [streamingText, setStreamingText] = useState('');
    const [status, setStatus] = useState<'idle' | 'typing' | 'thinking'>('idle');
    const [providerName, setProviderName] = useState<string>('Not Connected');

    useInput((input, key) => {
        if (screen !== 'chat') return;

        if (key.ctrl && input === 'c') {
            process.stdout.write('\x1b[?25h');
            exit();
            process.exit(0);
        }

        if (key.ctrl && input === 'l') {
            setMessages([]);
        }

        if (key.ctrl && input === 'k') {
            setMessages([]);
            setInputValue('');
        }

        if (key.tab) {
            // Future command mode placeholder
        }
    });

    const handleBootComplete = useCallback(() => {
        setScreen('apiKey');
    }, []);

    const handleApiKeySubmit = useCallback(async (apiKey: string) => {
        try {
            const provider = await detectProvider(apiKey);
            setProviderName(provider);
            setConfig({ ...config, apiKey, provider: provider as any });
            setScreen('chat');
        } catch (error: any) {
            setMessages([{ 
                role: 'assistant', 
                content: `Error: ${error.message}` 
            }]);
            setScreen('chat');
        }
    }, [config]);

    const addSystemMessage = useCallback((text: string) => {
        setMessages((prev: Message[]) => [...prev, { role: 'assistant', content: text }]);
    }, []);

    const handleSubmit = useCallback(
        async (value: string) => {
            const trimmed = value.trim();
            if (!trimmed || isThinking) return;

            setInputValue('');
            setStatus('typing');

            const userMsg: Message = { role: 'user', content: trimmed };
            setMessages((prev: Message[]) => [...prev, userMsg]);
            addMessage('user', trimmed);

            setStatus('thinking');
            setIsThinking(true);
            setStreamingText('');

            try {
                const providerConfig: ProviderConfig = {
                    apiKey: config.apiKey,
                    model: config.model,
                    systemPrompt: config.systemPrompt,
                    temperature: config.temperature,
                    maxTokens: config.maxTokens,
                };

                let response: { content: string; usage?: any };

                switch (config.provider) {
                    case 'anthropic':
                        response = await chatAnthropic(
                            messages,
                            trimmed,
                            providerConfig,
                            (token) => setStreamingText(prev => prev + token)
                        );
                        break;
                    case 'gemini':
                        response = await chatGemini(
                            messages,
                            trimmed,
                            providerConfig,
                            (token) => setStreamingText(prev => prev + token)
                        );
                        break;
                    case 'openai':
                    case 'openrouter':
                    case 'deepseek':
                        const baseURL = config.provider === 'openrouter' 
                            ? 'https://openrouter.ai/api/v1'
                            : config.provider === 'deepseek'
                                ? 'https://api.deepseek.com'
                                : 'https://api.openai.com/v1';
                        response = await chatOpenAI(
                            messages,
                            trimmed,
                            providerConfig,
                            (token) => setStreamingText(prev => prev + token),
                            baseURL
                        );
                        break;
                    default:
                        throw new Error(`Unknown provider: ${config.provider}`);
                }

                const assistantMsg: Message = { 
                    role: 'assistant', 
                    content: response.content 
                };
                setMessages((prev: Message[]) => [...prev, assistantMsg]);
                addMessage('assistant', response.content);
                setStreamingText('');

            } catch (error: any) {
                let errorMessage: string;

                if (error instanceof NetworkError) {
                    errorMessage = error.message;
                } else if (error.status === 401) {
                    errorMessage = 'Invalid API key. Run /config to update.';
                } else if (error.status === 429) {
                    errorMessage = 'Rate limit exceeded. Please wait and try again.';
                } else if (error.status >= 500) {
                    errorMessage = 'Provider service unavailable.';
                } else {
                    errorMessage = parseApiError(error, 'An unexpected error occurred.');
                }

                addSystemMessage(errorMessage);
                setStreamingText('');
            } finally {
                setIsThinking(false);
                setStatus('idle');
            }
        },
        [config, messages, isThinking, addMessage, addSystemMessage]
    );

    const handleInputChange = useCallback(
        (value: string) => {
            setInputValue(value);
            if (value.length > 0 && status === 'idle') {
                setStatus('typing');
            } else if (value.length === 0) {
                setStatus('idle');
            }
        },
        [status]
    );

    if (screen === 'boot') {
        return <BootScreen onComplete={handleBootComplete} />;
    }

    if (screen === 'apiKey') {
        return <ApiKeyScreen onSubmit={handleApiKeySubmit} />;
    }

    return (
        <Box flexDirection="column" height="100%">
            <TopBar provider={providerName} />
            <Box flexDirection="row" justifyContent="flex-end" paddingX={1}>
                <StatusArea status={status} />
            </Box>
            <ChatHistory
                messages={messages}
                isThinking={isThinking}
                streamingText={streamingText}
            />
            <InputBar
                value={inputValue}
                onChange={handleInputChange}
                onSubmit={handleSubmit}
                isDisabled={isThinking}
            />
        </Box>
    );
};

export default App;
