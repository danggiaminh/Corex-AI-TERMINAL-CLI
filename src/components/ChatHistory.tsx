import React from 'react';
import { Box, Text } from 'ink';
import { Message } from '../types.js';
import { theme } from '../themes/themes.js';
import ThinkingDots from './ThinkingDots.js';

interface ChatHistoryProps {
    messages: Message[];
    isThinking: boolean;
    streamingText: string;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({
    messages,
    isThinking,
    streamingText,
}: ChatHistoryProps) => {
    return (
        <Box flexDirection="column" flexGrow={1} paddingX={1}>
            {messages.map((msg: Message, i: number) => (
                <Box key={i} flexDirection="column" marginBottom={1}>
                    {msg.role === 'user' ? (
                        <Text color={theme.textDim}>{`> ${msg.content}`}</Text>
                    ) : (
                        <Text color={theme.highlight}>{msg.content}</Text>
                    )}
                </Box>
            ))}

            {streamingText && (
                <Box flexDirection="column" marginBottom={1}>
                    <Text color={theme.highlight}>{streamingText}</Text>
                </Box>
            )}

            {isThinking && !streamingText && (
                <Box marginBottom={1}>
                    <ThinkingDots />
                </Box>
            )}
        </Box>
    );
};

export default ChatHistory;
