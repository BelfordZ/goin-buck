"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: 'gpt-3.5-turbo',
        embeddingModel: 'text-embedding-ada-002',
    },
    supabase: {
        url: process.env.SUPABASE_URL || '',
        key: process.env.SUPABASE_KEY || '',
    },
    memory: {
        shortTermRetentionHours: 24,
        longTermRetentionHours: 72,
        sleepCycleFactCount: 10,
        emotionalDecayRate: 0.1,
        similarityThreshold: 0.85,
        patternThreshold: 0.6,
        weightIncrement: 0.1,
        contextThreshold: 0.5,
        contextRetentionSize: 10,
        contextRetentionHours: 24,
    },
    emotional: {
        maxQuadrantValue: 1.0,
        minQuadrantValue: -1.0,
        neutralThreshold: 0.1,
    },
};
if (!exports.config.openai.apiKey)
    throw new Error('OPENAI_API_KEY is required');
if (!exports.config.supabase.url)
    throw new Error('SUPABASE_URL is required');
if (!exports.config.supabase.key)
    throw new Error('SUPABASE_KEY is required');
//# sourceMappingURL=config.js.map