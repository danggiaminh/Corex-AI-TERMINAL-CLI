import React from 'react';
import { render } from 'ink';
import dotenv from 'dotenv';
import { loadConfig } from './lib/config.js';
import App from './app.js';

dotenv.config();

const nodeVersion = parseInt(process.version.slice(1).split('.')[0], 10);
if (nodeVersion < 18) {
    console.error('COREX requires Node.js 18 or higher.');
    process.exit(1);
}

const isRawModeSupported = () => {
    return process.stdin.isTTY;
};

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    if (args[0] === 'logout') {
        console.log('Logged out. Run \'corex\' to set up again.');
        process.exit(0);
    }

    const defaultConfig = {
        apiKey: process.env.COREX_API_KEY || '',
        provider: 'anthropic' as const,
        model: 'claude-3-5-sonnet-20241022',
        theme: 'default' as const,
        systemPrompt: 'You are COREX, an elite AI assistant.',
        maxTokens: 4096,
        temperature: 0.7,
        saveHistory: false,
        userName: 'You',
    };

    const savedConfig = loadConfig();
    const config = savedConfig || defaultConfig;

    if (!isRawModeSupported()) {
        console.log('\n\x1b[33mWarning: Terminal does not support raw mode.\x1b[0m');
        console.log('For best experience, run in a proper terminal emulator.\n');
    }

    const { waitUntilExit } = render(React.createElement(App, { config }));

    await waitUntilExit();
    process.exit(0);
}

process.on('SIGINT', () => {
    try {
        if (process.stdin.isTTY && process.stdin.isRaw) {
            process.stdin.setRawMode(false);
        }
    } catch (e) {}
    process.stdout.write('\x1b[?25h\n');
    process.exit(0);
});

main();
