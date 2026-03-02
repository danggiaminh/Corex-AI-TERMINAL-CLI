import React, { useState, useCallback } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useInput } from 'ink';
import { theme } from '../themes/themes.js';

interface ApiKeyScreenProps {
    onSubmit: (apiKey: string) => void;
}

const ApiKeyScreen: React.FC<ApiKeyScreenProps> = ({ onSubmit }: ApiKeyScreenProps) => {
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);

    useInput((input, key) => {
        if (key.ctrl && input === 'v') {
            setShowKey((prev) => !prev);
        }
    });

    const handleSubmit = useCallback(() => {
        if (apiKey.trim()) {
            onSubmit(apiKey.trim());
        }
    }, [apiKey, onSubmit]);

    const displayValue = showKey ? apiKey : apiKey.replace(/./g, '•');

    return (
        <Box
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            height="100%"
        >
            <Box flexDirection="column" alignItems="center">
                <Text bold color={theme.primary}>COREX</Text>
            </Box>
            <Box marginTop={1} flexDirection="column" alignItems="center">
                <Text color={theme.textDim}>AI GATEWAY</Text>
            </Box>
            <Box marginTop={6} flexDirection="column" alignItems="center">
                <Text color={theme.textDim}>Enter an API key</Text>
            </Box>
            <Box marginTop={2} flexDirection="row" alignItems="center">
                <Text color={theme.primary}>{'>'} </Text>
                <TextInput
                    value={displayValue}
                    onChange={setApiKey}
                    onSubmit={handleSubmit}
                    placeholder=""
                    mask={!showKey ? '•' : undefined}
                    focus={true}
                />
            </Box>
            <Box marginTop={3} flexDirection="column" alignItems="center">
                <Text color={theme.textDim} dimColor>
                    Ctrl+V to toggle visibility • Enter to continue
                </Text>
            </Box>
        </Box>
    );
};

export default ApiKeyScreen;
