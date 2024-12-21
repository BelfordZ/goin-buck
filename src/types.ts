/**
 * Represents a sensory input type in the system.
 * Each type represents a different way the system can receive information,
 * simulating different human senses.
 */
export type SensoryInputType = 'read-text' | 'hear-text' | 'feel-text' | 'smell-text' | 'taste-text';

/**
 * Raw input from any sensory source before processing.
 */
export interface SensoryInput {
  type: SensoryInputType;
  content: string;
  timestamp: Date;
}

/**
 * A processed fact from any sensory input.
 */
export interface Fact {
  id: string;
  content: string;
  source: SensoryInputType;
  timestamp: Date;
  embedding: number[];
  emotionalImpact: EmotionalQuadrant;
  weight: number;
  similarity?: number;  // Optional similarity score for search results
}

/**
 * Short-term fact buffer that holds recently processed facts.
 */
export interface FactBuffer {
  facts: Fact[];
  lastProcessed: Date;
  capacity: number;        // Maximum number of facts to hold
  maxSize: number;        // Hard limit on buffer size
  evictionStrategy: 'lru' | 'weight';
  evictionThreshold: number;
}

/**
 * Emotional state represented in a 2D space with four quadrants.
 */
export interface EmotionalQuadrant {
  joy: number;     // Range: -1 to 1
  calm: number;    // Range: -1 to 1
  anger: number;   // Range: -1 to 1
  sadness: number; // Range: -1 to 1
}

/**
 * The system's current emotional state.
 */
export interface EmotionalState {
  quadrant: EmotionalQuadrant;
  lastUpdated: Date;
  intensity: number;       // Overall emotional intensity
}

/**
 * Analysis of emotional state changes.
 */
export interface EmotionalAnalysis {
  previousState: EmotionalState;
  newState: EmotionalState;
  trends: EmotionalTrend[];
  stateId: string;
  confidence: number;
}

/**
 * Emotional trend data point.
 */
export interface EmotionalTrend {
  timeSlice: Date;
  avgIntensity: number;
  dominantQuadrant: keyof EmotionalQuadrant;
  contextCorrelation: number;
}

/**
 * Memory pattern representing learned associations.
 */
export interface Pattern {
  id: string;
  facts: string[];              // Fact IDs that form this pattern
  weight: number;               // Pattern strength
  emotionalSignature: EmotionalQuadrant;
  lastAccessed: Date;
}

/**
 * Pattern that emerges across different input types.
 */
export interface CrossContextPattern {
  id: string;
  sourcePatterns: string[];     // IDs of patterns that form this cross-context pattern
  sourceContexts: string[];     // Context types involved
  weight: number;
  emotionalSignature: EmotionalQuadrant;
  confidence: number;
  lastAccessed: Date;
}

/**
 * Type-specific context maintained for each input type.
 */
export interface SensoryContext {
  type: SensoryInputType;
  recentFacts: Fact[];              // Recent facts of this type
  contextualMemory: Fact[];         // Important facts that form context
  lastUpdated: Date;
}

/**
 * Metrics for context performance.
 */
export interface ContextMetrics {
  hits: number;
  misses: number;
  evictions: number;
  avgAccessTime: number;
}

/**
 * Active Working Memory represents the system's LRU cache.
 */
export interface ActiveWorkingMemory {
  factBuffer: FactBuffer;
  sensoryContexts: {
    contexts: Map<SensoryInputType, SensoryContext>;
    maxContextSize: number;
    accessOrder: SensoryInputType[];
  };
  lastUpdated: Date;
  metrics: ContextMetrics;
}

/**
 * Results from processing sensory input.
 */
export interface SensoryProcessingResult {
  fact: Fact;
  relatedFacts: string[];
  emotionalState: EmotionalQuadrant;
  insights?: InsightResult[];
}

/**
 * Results from emotional processing.
 */
export interface EmotionalProcessingResult {
  factAnalysis: {
    fact: Fact;
    emotionalImpact: EmotionalQuadrant;
    similarPatterns: Pattern[];
    distanceFromCenter: number;
    confidence: number;
  }[];
  stateChange: EmotionalState;
  bufferUpdate: FactBuffer;
  confidence: number;
}

/**
 * Results from a sleep cycle.
 */
export interface SleepCycleResult {
  processedFacts: Fact[];
  newPatterns: Pattern[];
  strengthenedPatterns: Pattern[];
  emotionalStateJourney: EmotionalState[];
  consolidationMetrics: {
    factsProcessed: number;
    patternsFound: number;
    averageConfidence: number;
    emotionalDecay: number;
  };
}

export interface Goal {
  id: string;
  description: string;
  priority: number;
}

export interface InsightResult {
  fact: Fact;
  relatedPatterns: Pattern[];
  crossContextPatterns: CrossContextPattern[];
  emotionalImpact: EmotionalQuadrant;
  confidence: number;
}