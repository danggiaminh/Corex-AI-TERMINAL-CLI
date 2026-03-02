import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../themes/themes.js';

interface TopBarProps {
    provider?: string;
}

const TopBar: React.FC<TopBarProps> = ({ provider = 'Not Connected' }: TopBarProps) => {
    return (
        <Box
            flexDirection="row"
            justifyContent="space-between"
            paddingX={1}
        >
            <Box flexDirection="row">
                <Text bold color={theme.primary}>
                    COREX
                </Text>
                <Text color={theme.textDim}> | </Text>
                <Text color={theme.textPrimary}>AI Gateway</Text>
            </Box>
            <Box flexDirection="row">
                <Text color={theme.textDim}>Provider: </Text>
                <Text color={theme.highlight}>{provider}</Text>
            </Box>
        </Box>
    );
};

export default TopBar;
