import { DatabaseService } from './database';
import { SensoryContext, Fact, CrossContextPattern, ContextMetrics, SensoryInputType } from '../types';
/**
 * Manages context for different input types, maintains context history,
 * and discovers cross-context patterns.
 */
export declare class ContextService {
    private contexts;
    private dbService;
    private metrics;
    constructor(dbService: DatabaseService);
    /**
     * Initialize contexts for all input types.
     */
    private initializeContexts;
    /**
     * Get context for a specific input type.
     */
    getContext(type: SensoryInputType): SensoryContext;
    /**
     * Update context with new fact and persist to database.
     */
    updateContext(type: SensoryInputType, fact: Fact, emotionalStateId: string): Promise<{
        context: SensoryContext;
        patterns: CrossContextPattern[];
    }>;
    /**
     * Find patterns across different contexts.
     */
    findCrossContextPatterns(contextTypes?: SensoryInputType[], timeWindowHours?: number): Promise<CrossContextPattern[]>;
    /**
     * Handle context eviction when capacity is reached.
     */
    private evictFromContext;
    /**
     * Get metrics for a specific context type.
     */
    getMetrics(type: SensoryInputType): ContextMetrics;
    /**
     * Reset metrics for a specific context type.
     */
    resetMetrics(type: SensoryInputType): void;
    /**
     * Clear all contexts and metrics.
     */
    clearAll(): void;
}
