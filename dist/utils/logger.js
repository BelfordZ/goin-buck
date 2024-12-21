"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggers = exports.Logger = void 0;
const chalk_1 = __importDefault(require("chalk"));
class Logger {
    constructor({ name, color, enabled = true }) {
        this.name = name;
        this.color = chalk_1.default.hex(color);
        this.enabled = enabled;
    }
    formatMessage(level, message) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${this.name}] [${level.toUpperCase()}]`;
        if (typeof message === 'object') {
            return `${prefix}\n${JSON.stringify(message, null, 2)}`;
        }
        return `${prefix} ${message}`;
    }
    debug(message) {
        if (!this.enabled)
            return;
        console.debug(this.color(this.formatMessage('debug', message)));
    }
    info(message) {
        if (!this.enabled)
            return;
        console.info(this.color(this.formatMessage('info', message)));
    }
    warn(message) {
        if (!this.enabled)
            return;
        console.warn(this.color(this.formatMessage('warn', message)));
    }
    error(message) {
        if (!this.enabled)
            return;
        console.error(this.color(this.formatMessage('error', message)));
    }
}
exports.Logger = Logger;
// Create logger instances for different components with unique colors
exports.loggers = {
    workingMemory: new Logger({
        name: 'WorkingMemory',
        color: '#00ff00' // Green
    }),
    emotionalMemory: new Logger({
        name: 'EmotionalMemory',
        color: '#ff69b4' // Hot Pink
    }),
    sensoryMemory: new Logger({
        name: 'SensoryMemory',
        color: '#4169e1' // Royal Blue
    }),
    openai: new Logger({
        name: 'OpenAI',
        color: '#ffa500' // Orange
    }),
    cognitive: new Logger({
        name: 'CognitiveSystem',
        color: '#9370db' // Medium Purple
    }),
    database: new Logger({
        name: 'Database',
        color: '#20b2aa' // Light Sea Green
    }),
    longTermMemory: new Logger({
        name: 'LongTermMemory',
        color: '#ffd700' // Gold
    }),
    insight: new Logger({
        name: 'Insight',
        color: '#ff0000' // Red
    })
};
//# sourceMappingURL=logger.js.map