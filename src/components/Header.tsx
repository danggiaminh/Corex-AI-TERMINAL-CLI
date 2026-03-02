import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import * as fs from 'fs';
import * as path from 'path';
import gradient from 'gradient-string';
import { Theme } from '../types.js';

interface HeaderProps {
    theme: Theme;
}

const Header: React.FC<HeaderProps> = ({ theme }) => {
    const [logoLines, setLogoLines] = useState<string[]>([]);

    useEffect(() => {
        try {
            // Try multiple paths for logo.txt
            const possiblePaths = [
                path.join(__dirname, '..', 'assets', 'logo.txt'),
                path.join(__dirname, '..', '..', 'assets', 'logo.txt'),
                path.join(process.cwd(), 'assets', 'logo.txt'),
            ];

            let logoText = '';
            for (const p of possiblePaths) {
                if (fs.existsSync(p)) {
                    logoText = fs.readFileSync(p, 'utf-8');
                    break;
                }
            }

            if (!logoText) {
                // Fallback inline logo
                logoText = `
  ██████╗ ██████╗ ██████╗ ███████╗██╗  ██╗
 ██╔════╝██╔═══██╗██╔══██╗██╔════╝╚██╗██╔╝
 ██║     ██║   ██║██████╔╝█████╗   ╚███╔╝
 ██║     ██║   ██║██╔══██╗██╔══╝   ██╔██╗
 ╚██████╗╚██████╔╝██║  ██║███████╗██╔╝ ██╗
  ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝`;
            }

            const grad = gradient(theme.headerGradient);
            const lines = logoText.split('\n').map((line) => grad(line));
            setLogoLines(lines);
        } catch {
            setLogoLines(['  COREX']);
        }
    }, [theme]);

    return (
        <Box flexDirection="column" marginBottom={1}>
            {logoLines.map((line, i) => (
                <Text key={i}>{line}</Text>
            ))}
        </Box>
    );
};

export default Header;
