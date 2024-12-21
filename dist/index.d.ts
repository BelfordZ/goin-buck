import { SensoryProcessingResult, CrossContextPattern, EmotionalQuadrant } from './types';
/**
 * Main cognitive system that processes sensory inputs, maintains emotional state,
 * and manages different memory layers using LRU cache behavior.
 */
export declare class CognitiveSystem {
    private workingMemory;
    private longTermMemory;
    private emotionalMemory;
    private sensoryMemories;
    private sleepCycle;
    private insightService;
    constructor();
    private initializeSensoryMemories;
    /**
     * Process text input through the system.
     */
    processTextInput(content: string): Promise<SensoryProcessingResult>;
    /**
     * Calculate fact weight based on emotional impact.
     */
    private calculateFactWeight;
    /**
     * Start the sleep cycle.
     */
    startSleepCycle(intervalHours?: number): void;
    /**
     * Stop the sleep cycle.
     */
    stopSleepCycle(): void;
    /**
     * Process the sleep cycle.
     */
    private processSleepCycle;
    /**
     * Reduce emotional impact for sleep processing.
     */
    private reduceEmotionalImpact;
    /**
     * Get the current emotional state.
     */
    getEmotionalState(): Promise<EmotionalQuadrant>;
    /**
     * Get emotional trends for a time period.
     */
    getEmotionalTrends(startTime: Date, endTime: Date): Promise<EmotionalQuadrant[]>;
    /**
     * Find patterns across different contexts.
     */
    findCrossContextPatterns(timeWindowHours?: number): Promise<CrossContextPattern[]>;
    /**
     * Get a key representing the emotional signature for grouping.
     */
    private getEmotionalSignatureKey;
    /**
     * Clean up resources and stop processes.
     */
    cleanup(): Promise<void>;
}
