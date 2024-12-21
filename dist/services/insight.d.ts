import { Fact, Pattern, CrossContextPattern, EmotionalQuadrant, SensoryProcessingResult } from '../types';
interface InsightResult {
    fact: Fact;
    relatedPatterns: Pattern[];
    crossContextPatterns: CrossContextPattern[];
    emotionalImpact: EmotionalQuadrant;
    confidence: number;
}
export declare class InsightService {
    private workingMemory;
    private longTermMemory;
    private patternService;
    private processedInsights;
    constructor();
    /**
     * Synthesize insights from a processing result, exploring different perspectives
     * and finding deeper patterns.
     */
    synthesizeInsights(result: SensoryProcessingResult, iterationCount?: number): Promise<InsightResult[]>;
    /**
     * Generate a single insight based on a prompt and find related patterns.
     */
    private generateInsight;
    /**
     * Calculate confidence in an insight based on pattern support.
     */
    private calculateConfidence;
    /**
     * Clean up old insights and patterns.
     */
    cleanup(retentionDays?: number): Promise<void>;
}
export {};
