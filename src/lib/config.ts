import Conf from 'conf';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';
import { fileURLToPath } from 'url';
import { CorexConfig, ThemeName } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FALLBACK_SYSTEM_PROMPT = `You are COREX, an elite AI assistant.
You are direct, insightful, and technically brilliant.
Format your responses for terminal display using clean spacing.
When showing code, use markdown code blocks.
Keep responses focused and avoid unnecessary filler text.`;

function loadSystemPrompt(): string {
    const filename = 'COREX_SYSTEM_PROMPT.txt';
    const possiblePaths = [
        path.join(__dirname, '..', 'assets', filename),
        path.join(__dirname, '..', '..', 'assets', filename),
        path.join(process.cwd(), 'assets', filename),
    ];

    for (const p of possiblePaths) {
        try {
            if (fs.existsSync(p)) {
                return fs.readFileSync(p, 'utf-8').trim();
            }
        } catch {
            // continue
        }
    }
    return FALLBACK_SYSTEM_PROMPT;
}

const DEFAULT_SYSTEM_PROMPT = loadSystemPrompt();

const defaults: CorexConfig = {
    apiKey: '',
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    theme: 'default' as ThemeName,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    maxTokens: 4096,
    temperature: 0.7,
    saveHistory: false,
    userName: 'You',
};

const config = new Conf<CorexConfig>({
    projectName: 'corex',
    defaults,
});

export function loadConfig(): CorexConfig | null {
    try {
        const apiKey = config.get('apiKey');
        if (!apiKey) return null;
        return {
            apiKey: config.get('apiKey'),
            provider: config.get('provider'),
            model: config.get('model'),
            theme: config.get('theme'),
            systemPrompt: config.get('systemPrompt'),
            maxTokens: config.get('maxTokens'),
            temperature: config.get('temperature'),
            saveHistory: config.get('saveHistory'),
            userName: config.get('userName'),
        };
    } catch (error) {
        return null;
    }
}

export function saveConfig(partial: Partial<CorexConfig>): void {
    for (const [key, value] of Object.entries(partial)) {
        config.set(key as keyof CorexConfig, value as any);
    }
}

export function deleteConfig(): void {
    config.clear();
}

export function isFirstRun(): boolean {
    const c = loadConfig();
    return !c || !c.apiKey;
}

function detectProvider(key: string): string | null {
    const k = key.trim();
    if (k.startsWith('sk-ant-')) return 'anthropic';
    if (k.startsWith('AIza')) return 'gemini';
    if (k.startsWith('sk-or-v1-') || k.startsWith('sk-or-')) return 'openrouter';
    if (k.startsWith('sk-proj-')) return 'openai';
    if (k.startsWith('sk-') && !k.startsWith('sk-or-')) return 'openai';
    if (k.startsWith('ds-') || k.toLowerCase().includes('deepseek')) return 'deepseek';
    return null;
}

function cleanupStdin() {
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
    }
    process.stdin.removeAllListeners('data');
    process.stdin.removeAllListeners('keypress');
    process.stdin.pause();
}

function askApiKey(): Promise<string> {
    return new Promise((resolve) => {
        process.stdout.write('  API Key ❯ ');
        process.stdin.setRawMode(true);
        process.stdin.resume();
        let key = '';

        const onData = (chunk: Buffer) => {
            const chars = chunk.toString();
            for (let i = 0; i < chars.length; i++) {
                const ch = chars[i];
                if (ch === '\r' || ch === '\n') {
                    process.stdout.write('\n');
                    process.stdin.setRawMode(false);
                    process.stdin.removeListener('data', onData);
                    process.stdin.pause();
                    resolve(key.trim());
                    return;
                } else if (ch === '\x03') {
                    process.stdout.write('\n');
                    if (process.stdin.isTTY) process.stdin.setRawMode(false);
                    process.exit(0);
                } else if (ch === '\x7f' || ch === '\b') {
                    if (key.length > 0) {
                        key = key.slice(0, -1);
                        process.stdout.clearLine(0);
                        process.stdout.cursorTo(0);
                        process.stdout.write('  API Key ❯ ' + '•'.repeat(key.length));
                    }
                } else {
                    key += ch;
                    process.stdout.write('•'.repeat(ch.length));
                }
            }
        };

        process.stdin.on('data', onData);
    });
}

const PROVIDERS = [
    { id: 'anthropic', label: 'Anthropic (Claude)' },
    { id: 'gemini', label: 'Google Gemini' },
    { id: 'openai', label: 'OpenAI (GPT)' },
    { id: 'openrouter', label: 'OpenRouter' },
    { id: 'deepseek', label: 'DeepSeek' },
];

export async function runFirstRunWizard(): Promise<void> {
    console.log('─────────────────────────────────────────────────────────────────────');
    console.log('  Enter your API key below and use what you purchased.');
    console.log('  Supports: Anthropic · Gemini · OpenAI · OpenRouter · DeepSeek');
    console.log('');
    console.log('  Your key will be auto-detected. No manual setup needed.');
    console.log('');

    const apiKey = await askApiKey();

    console.log('');

    const detected = detectProvider(apiKey);
    let providerId = detected;

    if (detected) {
        const label = PROVIDERS.find(p => p.id === detected)?.label || detected;
        console.log(`  \x1b[32m✓ Detected: ${label}\x1b[0m`);
    } else {
        console.log('  \x1b[33m⚠ Could not detect provider. Select manually:\x1b[0m');
        console.log('');
        
        let selectedIdx = 0;
        
        const printMenu = () => {
            process.stdout.write('\x1b[?25l'); // hide cursor
            for (let i = 0; i < PROVIDERS.length; i++) {
                const prefix = i === selectedIdx ? '  ❯ ' : '    ';
                console.log(`${prefix}${PROVIDERS[i].label}`);
            }
            console.log('\n  Navigate: ↑ ↓   Confirm: Enter');
        };
        
        const clearMenu = () => {
            // PROVIDERS.length + 2 lines for spacing/nav text
            process.stdout.write(`\x1b[${PROVIDERS.length + 2}A`);
        };

        printMenu();

        providerId = await new Promise<string>((resolve) => {
            const onKey = (chunk: Buffer) => {
                const key = chunk.toString();
                if (key === '\x1b[A') { // Up
                    if (selectedIdx > 0) {
                        selectedIdx--;
                        clearMenu();
                        printMenu();
                    }
                } else if (key === '\x1b[B') { // Down
                    if (selectedIdx < PROVIDERS.length - 1) {
                        selectedIdx++;
                        clearMenu();
                        printMenu();
                    }
                } else if (key === '\r' || key === '\n') {
                    process.stdin.removeListener('data', onKey);
                    process.stdout.write('\x1b[?25h'); // show cursor
                    resolve(PROVIDERS[selectedIdx].id);
                } else if (key === '\x03') {
                    cleanupStdin();
                    process.stdout.write('\n');
                    process.exit(0);
                }
            };
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.on('data', onKey);
        });
        console.log('');
    }

    const providerDefaults: Record<string, string> = {
        anthropic: 'claude-3-5-sonnet-20241022',
        gemini: 'gemini-1.5-pro',
        openai: 'gpt-4o',
        openrouter: 'openai/gpt-4o',
        deepseek: 'deepseek-chat',
    };

    saveConfig({ 
        apiKey, 
        provider: providerId as any, 
        model: providerDefaults[providerId || 'openai'] 
    });

    console.log('─────────────────────────────────────────────────────────────────────');
    
    // CRITICAL CLEANUP
    cleanupStdin();
}
