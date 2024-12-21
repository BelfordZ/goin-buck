import { DatabaseService } from './database';
import {
  Pattern,
  CrossContextPattern,
  Fact,
  EmotionalQuadrant,
  SensoryInputType
} from '../types';
import { config } from '../config';

/**
 * Handles pattern recognition, storage, and analysis across different
 * contexts and time periods.
 */
export class PatternService {
  private dbService: DatabaseService;
  private activePatterns: Map<string, Pattern>;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
    this.activePatterns = new Map();
  }

  /**
   * Process a new fact to find or create patterns.
   */
  async processFact(
    fact: Fact,
    context: SensoryInputType
  ): Promise<{ patterns: Pattern[]; crossContextPatterns: CrossContextPattern[] }> {
    // Find similar facts
    const similarFacts = await this.dbService.findSimilarFacts(
      fact.embedding,
      config.memory.contextRetentionSize,
      config.memory.similarityThreshold
    );

    // Find or create patterns
    const patterns = await this.findOrCreatePatterns(fact, similarFacts);

    // Look for cross-context patterns
    const crossContextPatterns = await this.dbService.findCrossContextPatterns(
      [context],
      config.memory.shortTermRetentionHours,
      config.memory.similarityThreshold
    );

    return { patterns, crossContextPatterns };
  }

  /**
   * Process multiple facts to find emerging patterns.
   */
  async processFacts(
    facts: Fact[],
    context: SensoryInputType
  ): Promise<{ patterns: Pattern[]; crossContextPatterns: CrossContextPattern[] }> {
    const allPatterns: Pattern[] = [];
    const processedFactIds = new Set<string>();

    // Process each fact
    for (const fact of facts) {
      if (processedFactIds.has(fact.id)) continue;
      processedFactIds.add(fact.id);

      // Find similar facts within the group
      const similarFacts = facts.filter(f => 
        !processedFactIds.has(f.id) &&
        this.calculateSimilarity(fact.embedding, f.embedding) >= config.memory.similarityThreshold
      );

      // Mark similar facts as processed
      similarFacts.forEach(f => processedFactIds.add(f.id));

      // Create pattern if enough similar facts
      if (similarFacts.length >= 2) {
        const pattern = await this.createPattern(
          [fact, ...similarFacts],
          this.calculateAverageEmotionalSignature([fact, ...similarFacts])
        );
        allPatterns.push(pattern);
      }
    }

    // Find cross-context patterns
    const crossContextPatterns = await this.dbService.findCrossContextPatterns(
      [context],
      config.memory.shortTermRetentionHours,
      config.memory.similarityThreshold
    );

    return { patterns: allPatterns, crossContextPatterns };
  }

  /**
   * Find existing patterns or create new ones.
   */
  private async findOrCreatePatterns(fact: Fact, similarFacts: Fact[]): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    if (similarFacts.length >= 2) {
      // Check if pattern already exists
      const existingPattern = Array.from(this.activePatterns.values()).find(p =>
        p.facts.includes(fact.id) ||
        similarFacts.some(f => p.facts.includes(f.id))
      );

      if (existingPattern) {
        // Update existing pattern
        const updatedPattern = await this.updatePattern(
          existingPattern,
          [fact, ...similarFacts]
        );
        patterns.push(updatedPattern);
      } else {
        // Create new pattern
        const newPattern = await this.createPattern(
          [fact, ...similarFacts],
          this.calculateAverageEmotionalSignature([fact, ...similarFacts])
        );
        patterns.push(newPattern);
      }
    }

    return patterns;
  }

  /**
   * Create a new pattern from facts.
   */
  private async createPattern(
    facts: Fact[],
    emotionalSignature: EmotionalQuadrant
  ): Promise<Pattern> {
    const pattern: Pattern = {
      id: Math.random().toString(36).substring(7),
      facts: facts.map(f => f.id),
      weight: this.calculatePatternWeight(facts),
      emotionalSignature,
      lastAccessed: new Date()
    };

    this.activePatterns.set(pattern.id, pattern);
    return pattern;
  }

  /**
   * Update an existing pattern with new facts.
   */
  private async updatePattern(
    pattern: Pattern,
    newFacts: Fact[]
  ): Promise<Pattern> {
    // Add new fact IDs
    const factIds = new Set([...pattern.facts, ...newFacts.map(f => f.id)]);
    
    // Update pattern
    const updatedPattern: Pattern = {
      ...pattern,
      facts: Array.from(factIds),
      weight: pattern.weight + config.memory.weightIncrement,
      emotionalSignature: this.calculateAverageEmotionalSignature(newFacts),
      lastAccessed: new Date()
    };

    this.activePatterns.set(pattern.id, updatedPattern);
    return updatedPattern;
  }

  /**
   * Calculate similarity between two embeddings.
   */
  private calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    const dotProduct = embedding1.reduce((sum, val, i) => sum + val * embedding2[i], 0);
    const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Calculate pattern weight based on facts.
   */
  private calculatePatternWeight(facts: Fact[]): number {
    // Average of fact weights and emotional intensities
    const avgWeight = facts.reduce((sum, f) => sum + f.weight, 0) / facts.length;
    const avgIntensity = facts.reduce((sum, f) => 
      sum + Math.sqrt(
        Math.pow(f.emotionalImpact.joy, 2) +
        Math.pow(f.emotionalImpact.calm, 2) +
        Math.pow(f.emotionalImpact.anger, 2) +
        Math.pow(f.emotionalImpact.sadness, 2)
      ), 0
    ) / facts.length;

    return (avgWeight + avgIntensity) / 2;
  }

  /**
   * Calculate average emotional signature from facts.
   */
  private calculateAverageEmotionalSignature(facts: Fact[]): EmotionalQuadrant {
    const sum = facts.reduce(
      (acc, fact) => ({
        joy: acc.joy + fact.emotionalImpact.joy,
        calm: acc.calm + fact.emotionalImpact.calm,
        anger: acc.anger + fact.emotionalImpact.anger,
        sadness: acc.sadness + fact.emotionalImpact.sadness
      }),
      { joy: 0, calm: 0, anger: 0, sadness: 0 }
    );

    const count = facts.length;
    return {
      joy: sum.joy / count,
      calm: sum.calm / count,
      anger: sum.anger / count,
      sadness: sum.sadness / count
    };
  }

  /**
   * Clean up old patterns.
   */
  async cleanupPatterns(
    retentionDays = 30,
    minWeight = config.memory.patternThreshold
  ): Promise<void> {
    // Clean up database patterns
    await this.dbService.cleanupOldData(retentionDays, minWeight);

    // Clean up active patterns
    for (const [id, pattern] of this.activePatterns.entries()) {
      const age = Date.now() - pattern.lastAccessed.getTime();
      if (age > retentionDays * 24 * 60 * 60 * 1000 || pattern.weight < minWeight) {
        this.activePatterns.delete(id);
      }
    }
  }
} 