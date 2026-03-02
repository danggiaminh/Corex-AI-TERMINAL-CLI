import React from 'react';
import { Text } from 'ink';
import { theme } from '../themes/themes.js';

interface StatusAreaProps {
    status: 'idle' | 'typing' | 'thinking';
}

const StatusArea: React.FC<StatusAreaProps> = ({ status }: StatusAreaProps) => {
    const statusText = {
        idle: 'Idle',
        typing: 'Typing...',
        thinking: 'Thinking...',
    };

    return (
        <Text color={theme.textDim} dimColor>
            {statusText[status]}
        </Text>
    );
};

export default StatusArea;
