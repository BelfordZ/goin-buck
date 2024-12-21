import { SensoryMemory } from '../interfaces/memory';
import { Fact, SensoryContext } from '../types';
/**
 * Concrete implementation of sensory memory
 */
export declare class SensoryContextMemory extends SensoryMemory {
    retentionTime: number;
    private recentInputs;
    private lastCleanup;
    private context;
    constructor(name: string, type: string, retentionTime?: number);
    store(item: any): Promise<void>;
    retrieve(id: string): Promise<any>;
    update(id: string, item: any): Promise<void>;
    delete(id: string): Promise<void>;
    addContext(context: SensoryContext): Promise<void>;
    getContext(): Promise<SensoryContext>;
    updateContext(fact: Fact): Promise<void>;
    clearContext(): Promise<void>;
    private getFactsFromIds;
    private cleanExpiredFacts;
}
