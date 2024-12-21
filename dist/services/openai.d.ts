import { Fact, SensoryContext, EmotionalQuadrant } from '../types';
export declare function extractFactFromText(text: string, context?: SensoryContext): Promise<Omit<Fact, 'id' | 'embedding' | 'weight'>>;
export declare function analyzeEmotionalQuadrant(content: string): Promise<EmotionalQuadrant>;
export declare function generateEmbedding(text: string): Promise<number[]>;
export declare function generateText(prompt: string, model?: string): Promise<string>;
