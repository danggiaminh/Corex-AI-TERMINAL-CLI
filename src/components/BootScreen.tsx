import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { theme } from '../themes/themes.js';

interface BootScreenProps {
    onComplete: () => void;
}

const LOGO = `
 ██████╗██╗     ██╗    ██████╗  ██████╗ ██████╗ ████████╗███████╗ ██████╗ ██╗     ██╗ ██████╗
██╔════╝██║     ██║    ██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝██╔═══██╗██║     ██║██╔═══██╗
██║     ██║     ██║    ██████╔╝██║   ██║██████╔╝   ██║   █████╗  ██║   ██║██║     ██║██║   ██║
██║     ██║     ██║    ██╔═══╝ ██║   ██║██╔══██╗   ██║   ██╔══╝  ██║   ██║██║     ██║██║   ██║
╚██████╗███████╗██║    ██║     ╚██████╔╝██║  ██║   ██║   ██║     ╚██████╔╝███████╗██║╚██████╔╝
 ╚═════╝╚══════╝╚═╝    ╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝      ╚═════╝ ╚══════╝╚═╝ ╚═════╝
`;

const BootScreen: React.FC<BootScreenProps> = ({ onComplete }: BootScreenProps) => {
    const [fadeIn, setFadeIn] = useState(0);

    useEffect(() => {
        const fadeInterval = setInterval(() => {
            setFadeIn((prev) => {
                if (prev >= 1) {
                    clearInterval(fadeInterval);
                    setTimeout(onComplete, 1500);
                    return 1;
                }
                return prev + 0.1;
            });
        }, 150);

        return () => clearInterval(fadeInterval);
    }, [onComplete]);

    const opacity = Math.floor(fadeIn * 255)
        .toString(16)
        .padStart(2, '0');

    return (
        <Box
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            height="100%"
        >
            <Box flexDirection="column" alignItems="center">
                <Text color={`#${opacity}93C5FD` as any}>{LOGO}</Text>
            </Box>
            <Box marginTop={1} flexDirection="column" alignItems="center">
                <Text bold color={`#${opacity}3B82F6` as any}>
                    AI GATEWAY
                </Text>
            </Box>
            <Box marginTop={3} flexDirection="column" alignItems="center">
                <Text color={`#${opacity}6B7280` as any}>Universal AI Provider Gateway</Text>
            </Box>
        </Box>
    );
};

export default BootScreen;
