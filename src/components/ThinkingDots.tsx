import React, { useState, useEffect } from 'react';
import { Text } from 'ink';
import { theme } from '../themes/themes.js';

const ThinkingDots: React.FC = () => {
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots((prev: string) => (prev.length < 3 ? prev + '.' : ''));
        }, 400);
        return () => clearInterval(interval);
    }, []);

    return (
        <Text color={theme.textDim} dimColor>
            Thinking{dots}
        </Text>
    );
};

export default ThinkingDots;
