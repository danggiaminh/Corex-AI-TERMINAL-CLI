import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'network.log');

function ensureLogDir(): void {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
}

function getTimestamp(): string {
    return new Date().toISOString();
}

export function logNetworkEvent(
    provider: string,
    statusCode: number | null,
    errorMessage: string | null,
    details?: string
): void {
    ensureLogDir();
    const logEntry = [
        getTimestamp(),
        `provider=${provider}`,
        statusCode !== null ? `status=${statusCode}` : 'status=null',
        errorMessage ? `error=${errorMessage}` : 'error=null',
        details ? `details=${details}` : '',
    ].filter(Boolean).join(' | ') + '\n';
    
    fs.appendFileSync(LOG_FILE, logEntry);
}

export async function verifyInternet(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('https://example.com', {
            method: 'HEAD',
            signal: controller.signal,
        } as RequestInit);
        
        clearTimeout(timeoutId);
        return response.ok;
    } catch {
        return false;
    }
}

export interface CorexRequestOptions extends RequestInit {
    timeout?: number;
}

export class NetworkError extends Error {
    constructor(
        message: string,
        public readonly code: 'NETWORK_OFFLINE' | 'NETWORK_FAILURE' | 'API_ERROR' | 'UNKNOWN',
        public readonly statusCode?: number,
        public readonly rawResponse?: string
    ) {
        super(message);
        this.name = 'NetworkError';
    }
}

export async function corexRequest(
    url: string,
    options: CorexRequestOptions,
    provider: string
): Promise<any> {
    const { timeout = 30000, ...fetchOptions } = options;
    
    let response: Response;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal,
        } as RequestInit);
        
        clearTimeout(timeoutId);
    } catch (networkError: any) {
        const isOnline = await verifyInternet();
        
        if (!isOnline) {
            logNetworkEvent(provider, null, 'NETWORK_OFFLINE', networkError.message);
            throw new NetworkError(
                'Internet connection unavailable.',
                'NETWORK_OFFLINE'
            );
        }
        
        const errorMessage = networkError.code === 'AbortError'
            ? 'Request timeout'
            : `Network request failed: ${networkError.message}`;
        
        logNetworkEvent(provider, null, 'NETWORK_FAILURE', errorMessage);
        throw new NetworkError(
            errorMessage,
            'NETWORK_FAILURE'
        );
    }
    
    let rawResponse: string;
    try {
        rawResponse = await response.text();
    } catch (e: any) {
        logNetworkEvent(provider, response.status, 'READ_RESPONSE_FAILED', e.message);
        throw new NetworkError(
            `Failed to read response: ${e.message}`,
            'NETWORK_FAILURE',
            response.status
        );
    }
    
    if (!response.ok) {
        let errorDetails = '';
        
        try {
            const jsonError = JSON.parse(rawResponse);
            errorDetails = jsonError.error?.message || jsonError.message || rawResponse;
        } catch {
            errorDetails = rawResponse.substring(0, 500);
        }
        
        logNetworkEvent(provider, response.status, 'API_ERROR', errorDetails);
        
        throw new NetworkError(
            formatApiError(response.status, errorDetails),
            'API_ERROR',
            response.status,
            rawResponse
        );
    }
    
    logNetworkEvent(provider, response.status, null);
    
    try {
        return JSON.parse(rawResponse);
    } catch (e: any) {
        if (rawResponse.trim() === '') {
            return {};
        }
        throw new NetworkError(
            `Invalid JSON response: ${e.message}`,
            'UNKNOWN',
            response.status,
            rawResponse
        );
    }
}

function formatApiError(status: number, errorDetails: string): string {
    switch (status) {
        case 401:
            return 'Invalid API key.';
        case 403:
            return 'Access forbidden. Check API key permissions.';
        case 404:
            return 'Endpoint not found.';
        case 429:
            return 'Rate limit exceeded. Please wait and try again.';
        case 500:
            return 'Provider server error. Please try again later.';
        case 502:
        case 503:
        case 504:
            return 'Provider service unavailable.';
        default:
            if (status >= 500) {
                return `Provider server error (${status}).`;
            }
            if (status >= 400) {
                return `API error (${status}): ${errorDetails}`;
            }
            return errorDetails;
    }
}

export function parseApiError(error: any, defaultMessage: string): string {
    if (error instanceof NetworkError) {
        return error.message;
    }
    
    if (error?.status === 401) {
        return 'Invalid API key. Run /config to update.';
    }
    
    if (error?.status === 429) {
        return 'Rate limit exceeded. Please wait and try again.';
    }
    
    if (error?.status >= 500) {
        return 'Provider service unavailable.';
    }
    
    if (error?.message) {
        return error.message;
    }
    
    return defaultMessage;
}
