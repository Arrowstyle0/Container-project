declare module 'argon2-browser/dist/argon2-bundled.min.js' {
    export const ArgonType: {
        Argon2d: number;
        Argon2i: number;
        Argon2id: number;
    };
    export function hash(options: any): Promise<any>;
    export function verify(options: any): Promise<any>;
    export function unloadRuntime(): void;
}
