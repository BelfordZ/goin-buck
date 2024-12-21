interface LoggerConfig {
    name: string;
    color: string;
    enabled?: boolean;
}
export declare class Logger {
    private name;
    private color;
    private enabled;
    constructor({ name, color, enabled }: LoggerConfig);
    private formatMessage;
    debug(message: string | object): void;
    info(message: string | object): void;
    warn(message: string | object): void;
    error(message: string | object): void;
}
export declare const loggers: {
    workingMemory: Logger;
    emotionalMemory: Logger;
    sensoryMemory: Logger;
    openai: Logger;
    cognitive: Logger;
    database: Logger;
    longTermMemory: Logger;
    insight: Logger;
};
export {};
