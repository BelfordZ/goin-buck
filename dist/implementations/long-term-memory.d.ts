import { LongTermMemory } from '../interfaces/memory';
import { Fact, Pattern, EmotionalQuadrant } from '../types';
type EmotionalDimension = keyof EmotionalQuadrant;
export declare class SupabaseLongTermMemory extends LongTermMemory {
    private dbService;
    private patterns;
    private initialized;
    private client;
    constructor(name: string);
    private ensureInitialized;
    store(fact: Fact): Promise<void>;
    storePattern(pattern: Pattern): Promise<void>;
    findSimilarPatterns(embedding: number[], threshold?: number, emotionalContext?: Record<EmotionalDimension, number>): Promise<Pattern[]>;
    strengthenPattern(patternId: string, amount: number, emotionalContext?: Record<EmotionalDimension, number>): Promise<void>;
    getSignificantPatterns(limit?: number): Promise<Pattern[]>;
    consolidate(): Promise<void>;
    retrieve(id: string): Promise<Fact | null>;
    update(id: string, fact: Partial<Fact>): Promise<void>;
    delete(id: string): Promise<void>;
    consolidateMemory(facts: Fact[]): Promise<void>;
    cleanup(olderThan: Date): Promise<void>;
    private calculateEmotionalSimilarity;
    private updateEmotionalSignature;
    private mapDatabaseFactToFact;
}
export {};
