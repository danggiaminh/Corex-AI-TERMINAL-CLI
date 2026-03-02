declare module 'gradient-string' {
    interface GradientOptions {
        interpolation?: string;
    }
    
    function gradient(colors: string[], options?: GradientOptions): {
        (text: string): string;
        multiline(text: string): string;
    };
    
    export default gradient;
}
