import { WorkingMemory } from '../interfaces/memory';
import { Fact } from '../types';
/**
 * Concrete implementation of working memory using LRU cache behavior
 */
export declare class LRUWorkingMemory extends WorkingMemory {
    private factBuffer;
    private factMap;
    constructor(name: string, capacity?: number, evictionStrategy?: 'lru' | 'weight', evictionThreshold?: number);
    store(item: any): Promise<void>;
    retrieve(id: string): Promise<any>;
    update(id: string, item: any): Promise<void>;
    delete(id: string): Promise<void>;
    addFact(fact: Fact): Promise<void>;
    getFacts(): Fact[];
    evictOldest(): Promise<void>;
    evictByWeight(): Promise<void>;
    clear(): Promise<void>;
    getSampleByWeight(sampleSize?: number): Promise<Fact[]>;
    consolidate(): Promise<void>;
}
