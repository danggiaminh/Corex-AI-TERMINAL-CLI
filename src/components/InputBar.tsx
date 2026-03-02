import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { theme } from '../themes/themes.js';

interface InputBarProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: (value: string) => void;
    isDisabled: boolean;
}

const InputBar: React.FC<InputBarProps> = ({
    value,
    onChange,
    onSubmit,
    isDisabled,
}: InputBarProps) => {
    const separator = '─'.repeat(process.stdout.columns || 80);

    return (
        <Box flexDirection="column">
            <Box>
                <Text color={theme.border}>{separator}</Text>
            </Box>
            <Box paddingX={1}>
                <Text bold color={theme.primary}>
                    {'> '}
                </Text>
                <TextInput
                    value={value}
                    onChange={onChange}
                    onSubmit={onSubmit}
                    placeholder={isDisabled ? '' : ''}
                    focus={!isDisabled}
                    showCursor={true}
                />
            </Box>
        </Box>
    );
};

export default InputBar;
