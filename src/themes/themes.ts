import { Theme, ThemeName } from '../types.js';

export const theme = {
    background: '#0B1220',
    surface: '#0F1E3A',
    primary: '#3B82F6',
    highlight: '#93C5FD',
    textPrimary: '#E5E7EB',
    textDim: '#6B7280',
    border: '#1E3A5F',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
};

export const themes: Record<ThemeName, Theme> = {
    default: {
        label: 'Default',
        userText: theme.textPrimary,
        aiText: theme.highlight,
        border: theme.border,
        accent: theme.primary,
        statusBar: theme.textDim,
        headerGradient: [theme.primary, theme.highlight],
    },
    matrix: {
        label: 'Matrix (green hacker)',
        userText: '#FFFFFF',
        aiText: '#00FF00',
        border: '#00FF00',
        accent: '#00FF00',
        statusBar: '#003300',
        headerGradient: ['#00FF00', '#003300'],
    },
    cyberpunk: {
        label: 'Cyberpunk (yellow + magenta)',
        userText: '#FFFF00',
        aiText: '#FF00FF',
        border: '#00FFFF',
        accent: '#FFFF00',
        statusBar: '#FF00FF',
        headerGradient: ['#FFFF00', '#FF00FF'],
    },
    ocean: {
        label: 'Ocean (cyan + blue)',
        userText: '#00FFFF',
        aiText: '#0099FF',
        border: '#00FFFF',
        accent: '#00FFFF',
        statusBar: '#003366',
        headerGradient: ['#00FFFF', '#0000FF'],
    },
    blood: {
        label: 'Blood (red + dark red)',
        userText: '#FF0000',
        aiText: '#CC0000',
        border: '#FF0000',
        accent: '#FF0000',
        statusBar: '#330000',
        headerGradient: ['#FF0000', '#330000'],
    },
};

export function getTheme(name: ThemeName): Theme {
    return themes[name] || themes.default;
}

export function getThemeNames(): ThemeName[] {
    return Object.keys(themes) as ThemeName[];
}
