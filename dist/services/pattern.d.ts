import { DatabaseService } from './database';
import { Pattern, CrossContextPattern, Fact, SensoryInputType } from '../types';
/**
 * Handles pattern recognition, storage, and analysis across different
 * contexts and time periods.
 */
export declare class PatternService {
    private dbService;
    private activePatterns;
    constructor(dbService: DatabaseService);
    /**
     * Process a new fact to find or create patterns.
     */
    processFact(fact: Fact, context: SensoryInputType): Promise<{
        patterns: Pattern[];
        crossContextPatterns: CrossContextPattern[];
    }>;
    /**
     * Process multiple facts to find emerging patterns.
     */
    processFacts(facts: Fact[], context: SensoryInputType): Promise<{
        patterns: Pattern[];
        crossContextPatterns: CrossContextPattern[];
    }>;
    /**
     * Find existing patterns or create new ones.
     */
    private findOrCreatePatterns;
    /**
     * Create a new pattern from facts.
     */
    private createPattern;
    /**
     * Update an existing pattern with new facts.
     */
    private updatePattern;
    /**
     * Calculate similarity between two embeddings.
     */
    private calculateSimilarity;
    /**
     * Calculate pattern weight based on facts.
     */
    private calculatePatternWeight;
    /**
     * Calculate average emotional signature from facts.
     */
    private calculateAverageEmotionalSignature;
    /**
     * Clean up old patterns.
     */
    cleanupPatterns(retentionDays?: number, minWeight?: 0.6): Promise<void>;
}
