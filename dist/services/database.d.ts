import { EmotionalQuadrant, Fact, CrossContextPattern, EmotionalTrend, ContextMetrics, Pattern } from '../types';
/**
 * Handles all database operations through Supabase.
 * Provides high-level methods for managing facts, patterns, emotional states,
 * and context history.
 */
export declare class DatabaseService {
    private client;
    constructor();
    /**
     * Store a new fact in the database.
     */
    storeFact(fact: Omit<Fact, 'id'>): Promise<Fact>;
    /**
     * Update emotional state and get trend analysis.
     */
    updateEmotionalState(quadrant: EmotionalQuadrant, intensity: number, sourceFactIds: string[], lookbackHours?: number): Promise<{
        stateId: string;
        trends: EmotionalTrend[];
    }>;
    /**
     * Update context history and get emerging patterns.
     */
    updateContextHistory(contextType: string, recentFactIds: string[], contextualMemoryIds: string[], emotionalStateId: string, metrics: ContextMetrics, similarityThreshold?: number, timeWindowHours?: number): Promise<{
        contextId: string;
        patterns: CrossContextPattern[];
    }>;
    /**
     * Find similar facts using embedding similarity.
     */
    findSimilarFacts(embedding: number[], limit?: number, threshold?: number): Promise<Fact[]>;
    /**
     * Get emotional state trends for a time period.
     */
    getEmotionalTrends(startTime: Date, endTime: Date, contextType?: string): Promise<EmotionalTrend[]>;
    /**
     * Find patterns across different contexts.
     */
    findCrossContextPatterns(contextTypes: string[], timeWindowHours?: number, similarityThreshold?: number): Promise<CrossContextPattern[]>;
    /**
     * Clean up old data while preserving important patterns.
     */
    cleanupOldData(retentionDays?: number, minPatternWeight?: number): Promise<void>;
    /**
     * Map database fact format to application fact format.
     */
    private mapDatabaseFactToFact;
    /**
     * Load all patterns from the database.
     */
    loadPatterns(): Promise<Pattern[]>;
    /**
     * Store a new pattern or update an existing one.
     */
    storePattern(pattern: Pattern): Promise<Pattern>;
    /**
     * Update an existing pattern.
     */
    updatePattern(pattern: Pattern): Promise<void>;
    /**
     * Find patterns that contain specific facts.
     */
    findPatternsWithFacts(factIds: string[]): Promise<Pattern[]>;
    /**
     * Get significant patterns ordered by weight.
     */
    getSignificantPatterns(limit: number): Promise<Pattern[]>;
    /**
     * Remove patterns by their IDs.
     */
    removePatterns(patternIds: string[]): Promise<void>;
    /**
     * Get a fact by ID.
     */
    getFact(id: string): Promise<Fact | null>;
}
