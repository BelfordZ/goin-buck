import chalk from 'chalk';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  name: string;
  color: string;
  enabled?: boolean;
}

export class Logger {
  private name: string;
  private color: chalk.Chalk;
  private enabled: boolean;

  constructor({ name, color, enabled = true }: LoggerConfig) {
    this.name = name;
    this.color = chalk.hex(color);
    this.enabled = enabled;
  }

  private formatMessage(level: LogLevel, message: string | object): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${this.name}] [${level.toUpperCase()}]`;
    
    if (typeof message === 'object') {
      return `${prefix}\n${JSON.stringify(message, null, 2)}`;
    }
    return `${prefix} ${message}`;
  }

  debug(message: string | object): void {
    if (!this.enabled) return;
    console.debug(this.color(this.formatMessage('debug', message)));
  }

  info(message: string | object): void {
    if (!this.enabled) return;
    console.info(this.color(this.formatMessage('info', message)));
  }

  warn(message: string | object): void {
    if (!this.enabled) return;
    console.warn(this.color(this.formatMessage('warn', message)));
  }

  error(message: string | object): void {
    if (!this.enabled) return;
    console.error(this.color(this.formatMessage('error', message)));
  }
}

// Create logger instances for different components with unique colors
export const loggers = {
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
