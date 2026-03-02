import React from 'react';
import { Box, Text } from 'ink';
import { Theme, ThemeName } from '../types.js';

interface StatusBarProps {
    model: string;
    totalTokens: number;
    themeName: ThemeName;
    theme: Theme;
}

const StatusBar: React.FC<StatusBarProps> = ({
    model,
    totalTokens,
    themeName,
    theme,
}) => {
    return (
        <Box>
            <Text color={theme.statusBar}>
                {model} │ tokens: {totalTokens} │ theme: {themeName}
            </Text>
        </Box>
    );
};

export default StatusBar;
