import { DatabaseService } from './database';
import { EmotionalState, Fact, EmotionalTrend, EmotionalAnalysis } from '../types';
/**
 * Handles emotional state processing, analysis, and persistence.
 * Maintains emotional state and provides analysis of emotional trends.
 */
export declare class EmotionalService {
    private currentState;
    private dbService;
    constructor(dbService: DatabaseService);
    /**
     * Process a fact and update emotional state.
     */
    processFact(fact: Fact): Promise<EmotionalAnalysis>;
    /**
     * Process multiple facts and analyze aggregate emotional impact.
     */
    processFacts(facts: Fact[]): Promise<EmotionalAnalysis>;
    /**
     * Get emotional trends for a specific time period and context.
     */
    getEmotionalTrends(startTime: Date, endTime: Date, contextType?: string): Promise<EmotionalTrend[]>;
    /**
     * Apply emotional decay during sleep cycles.
     */
    applyEmotionalDecay(decayRate?: 0.1): Promise<EmotionalState>;
    /**
     * Calculate new emotional state based on impact.
     */
    private calculateNewState;
    /**
     * Calculate emotional intensity from quadrant values.
     */
    private calculateIntensity;
    /**
     * Calculate aggregate emotional impact from multiple impacts.
     */
    private calculateAggregateImpact;
    /**
     * Calculate confidence in emotional analysis.
     */
    private calculateConfidence;
    /**
     * Ensure emotional values stay within bounds (-1 to 1).
     */
    private clampValue;
}
