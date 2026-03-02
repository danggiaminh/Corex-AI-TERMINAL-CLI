import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Message } from '../types.js';

let history: Message[] = [];

export function addMessage(role: 'user' | 'assistant', content: string): void {
    history.push({ role, content });
}

export function getHistory(): Message[] {
    return [...history];
}

export function clearHistory(): void {
    history = [];
}

export function saveSession(): string {
    const sessionsDir = path.join(os.homedir(), '.corex', 'sessions');
    if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir, { recursive: true });
    }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const filename = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}.txt`;
    const filepath = path.join(sessionsDir, filename);

    let content = '=== COREX Chat Session ===\n';
    content += `Date: ${now.toLocaleString()}\n`;
    content += `Messages: ${history.length}\n`;
    content += '='.repeat(40) + '\n\n';

    for (const msg of history) {
        const label = msg.role === 'user' ? 'You' : 'COREX';
        content += `[${label}]\n${msg.content}\n\n`;
    }

    fs.writeFileSync(filepath, content, 'utf-8');
    return filepath;
}
