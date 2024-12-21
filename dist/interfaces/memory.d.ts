import { Fact, Pattern, EmotionalQuadrant, SensoryContext } from '../types';
/**
 * Base interface for all memory operations
 */
export interface IMemoryOperations {
    store(item: any): Promise<void>;
    retrieve(id: string): Promise<any>;
    update(id: string, item: any): Promise<void>;
    delete(id: string): Promise<void>;
}
/**
 * Interface for working memory operations
 */
export interface IWorkingMemory extends IMemoryOperations {
    capacity: number;
    evictionStrategy: 'lru' | 'weight';
    evictionThreshold: number;
    addFact(fact: Fact): Promise<void>;
    getFacts(): Fact[];
    evictOldest(): Promise<void>;
    evictByWeight(): Promise<void>;
    clear(): Promise<void>;
    getMetrics(): WorkingMemoryMetrics;
}
/**
 * Interface for long-term memory operations
 */
export interface ILongTermMemory extends IMemoryOperations {
    storePattern(pattern: Pattern): Promise<void>;
    findSimilarPatterns(embedding: number[], threshold?: number): Promise<Pattern[]>;
    strengthenPattern(patternId: string, weight: number): Promise<void>;
    getSignificantPatterns(limit: number): Promise<Pattern[]>;
    consolidateMemory(facts: Fact[]): Promise<void>;
    cleanup(olderThan: Date): Promise<void>;
}
/**
 * Interface for sensory memory operations
 */
export interface ISensoryMemory extends IMemoryOperations {
    type: string;
    retentionTime: number;
    addContext(context: SensoryContext): Promise<void>;
    getContext(): Promise<SensoryContext>;
    updateContext(fact: Fact): Promise<void>;
    clearContext(): Promise<void>;
}
/**
 * Interface for emotional memory operations
 */
export interface IEmotionalMemory extends IMemoryOperations {
    getCurrentState(): Promise<EmotionalQuadrant>;
    updateState(impact: EmotionalQuadrant): Promise<void>;
    decayEmotions(rate: number): Promise<void>;
    getEmotionalHistory(startTime: Date, endTime: Date): Promise<EmotionalQuadrant[]>;
}
/**
 * Working memory metrics
 */
export interface WorkingMemoryMetrics {
    hits: number;
    misses: number;
    evictions: number;
    avgAccessTime: number;
    lastUpdated: Date;
}
/**
 * Abstract base class for memory implementations
 */
export declare abstract class BaseMemory implements IMemoryOperations {
    protected name: string;
    protected lastAccessed: Date;
    constructor(name: string);
    abstract store(item: any): Promise<void>;
    abstract retrieve(id: string): Promise<any>;
    abstract update(id: string, item: any): Promise<void>;
    abstract delete(id: string): Promise<void>;
    protected updateAccessTime(): void;
    protected validateItem(item: any): boolean;
    getLastAccessTime(): Date;
}
/**
 * Abstract working memory implementation
 */
export declare abstract class WorkingMemory extends BaseMemory implements IWorkingMemory {
    capacity: number;
    evictionStrategy: 'lru' | 'weight';
    evictionThreshold: number;
    protected metrics: WorkingMemoryMetrics;
    constructor(name: string, capacity: number, evictionStrategy?: 'lru' | 'weight', evictionThreshold?: number);
    abstract addFact(fact: Fact): Promise<void>;
    abstract getFacts(): Fact[];
    abstract evictOldest(): Promise<void>;
    abstract evictByWeight(): Promise<void>;
    abstract clear(): Promise<void>;
    getMetrics(): WorkingMemoryMetrics;
    protected updateMetrics(accessTime: number, isHit: boolean): void;
}
/**
 * Abstract long-term memory implementation
 */
export declare abstract class LongTermMemory extends BaseMemory implements ILongTermMemory {
    abstract storePattern(pattern: Pattern): Promise<void>;
    abstract findSimilarPatterns(embedding: number[], threshold?: number): Promise<Pattern[]>;
    abstract strengthenPattern(patternId: string, weight: number): Promise<void>;
    abstract getSignificantPatterns(limit: number): Promise<Pattern[]>;
    abstract consolidateMemory(facts: Fact[]): Promise<void>;
    abstract cleanup(olderThan: Date): Promise<void>;
}
/**
 * Abstract sensory memory implementation
 */
export declare abstract class SensoryMemory extends BaseMemory implements ISensoryMemory {
    type: string;
    retentionTime: number;
    constructor(name: string, type: string, retentionTime: number);
    abstract addContext(context: SensoryContext): Promise<void>;
    abstract getContext(): Promise<SensoryContext>;
    abstract updateContext(fact: Fact): Promise<void>;
    abstract clearContext(): Promise<void>;
}
/**
 * Abstract emotional memory implementation
 */
export declare abstract class EmotionalMemory extends BaseMemory implements IEmotionalMemory {
    abstract getCurrentState(): Promise<EmotionalQuadrant>;
    abstract updateState(impact: EmotionalQuadrant): Promise<void>;
    abstract decayEmotions(rate: number): Promise<void>;
    abstract getEmotionalHistory(startTime: Date, endTime: Date): Promise<EmotionalQuadrant[]>;
}
