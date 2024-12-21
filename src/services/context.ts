import { DatabaseService } from './database';
import {
  SensoryContext,
  Fact,
  CrossContextPattern,
  ContextMetrics,
  SensoryInputType
} from '../types';
import { config } from '../config';

/**
 * Manages context for different input types, maintains context history,
 * and discovers cross-context patterns.
 */
export class ContextService {
  private contexts: Map<SensoryInputType, SensoryContext>;
  private dbService: DatabaseService;
  private metrics: Map<SensoryInputType, ContextMetrics>;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
    this.contexts = new Map();
    this.metrics = new Map();
    this.initializeContexts();
  }

  /**
   * Initialize contexts for all input types.
   */
  private initializeContexts(): void {
    const types: SensoryInputType[] = ['read-text'];
    for (const type of types) {
      this.contexts.set(type, {
        type,
        recentFacts: [],
        contextualMemory: [],
        lastUpdated: new Date()
      });
      this.metrics.set(type, {
        hits: 0,
        misses: 0,
        evictions: 0,
        avgAccessTime: 0
      });
    }
  }

  /**
   * Get context for a specific input type.
   */
  getContext(type: SensoryInputType): SensoryContext {
    const startTime = Date.now();
    const context = this.contexts.get(type);
    const metrics = this.metrics.get(type)!;

    if (context) {
      metrics.hits++;
      metrics.avgAccessTime = (metrics.avgAccessTime + (Date.now() - startTime)) / 2;
      return context;
    }

    // Initialize new context if not found
    metrics.misses++;
    const newContext: SensoryContext = {
      type,
      recentFacts: [],
      contextualMemory: [],
      lastUpdated: new Date()
    };
    this.contexts.set(type, newContext);
    return newContext;
  }

  /**
   * Update context with new fact and persist to database.
   */
  async updateContext(
    type: SensoryInputType,
    fact: Fact,
    emotionalStateId: string
  ): Promise<{ context: SensoryContext; patterns: CrossContextPattern[] }> {
    const context = this.getContext(type);
    const metrics = this.metrics.get(type)!;
    const startTime = Date.now();

    // Update recent facts
    context.recentFacts = [fact, ...context.recentFacts]
      .slice(0, config.memory.contextRetentionSize);

    // Update contextual memory if fact is significant
    if (fact.weight > config.memory.patternThreshold) {
      context.contextualMemory = [fact, ...context.contextualMemory]
        .slice(0, config.memory.contextRetentionSize);
    }

    context.lastUpdated = new Date();
    metrics.avgAccessTime = (metrics.avgAccessTime + (Date.now() - startTime)) / 2;

    // Persist context update and get emerging patterns
    const { patterns } = await this.dbService.updateContextHistory(
      type,
      context.recentFacts.map(f => f.id),
      context.contextualMemory.map(f => f.id),
      emotionalStateId,
      metrics
    );

    return { context, patterns };
  }

  /**
   * Find patterns across different contexts.
   */
  async findCrossContextPatterns(
    contextTypes: SensoryInputType[] = ['read-text'],
    timeWindowHours = 24
  ): Promise<CrossContextPattern[]> {
    return this.dbService.findCrossContextPatterns(
      contextTypes,
      timeWindowHours,
      config.memory.similarityThreshold
    );
  }

  /**
   * Handle context eviction when capacity is reached.
   */
  private evictFromContext(context: SensoryContext): void {
    const metrics = this.metrics.get(context.type)!;

    // Remove oldest facts if over capacity
    if (context.recentFacts.length > config.memory.contextRetentionSize) {
      context.recentFacts = context.recentFacts.slice(0, config.memory.contextRetentionSize);
      metrics.evictions++;
    }

    // Remove oldest contextual memories if over capacity
    if (context.contextualMemory.length > config.memory.contextRetentionSize) {
      context.contextualMemory = context.contextualMemory.slice(0, config.memory.contextRetentionSize);
      metrics.evictions++;
    }
  }

  /**
   * Get metrics for a specific context type.
   */
  getMetrics(type: SensoryInputType): ContextMetrics {
    return this.metrics.get(type) || {
      hits: 0,
      misses: 0,
      evictions: 0,
      avgAccessTime: 0
    };
  }

  /**
   * Reset metrics for a specific context type.
   */
  resetMetrics(type: SensoryInputType): void {
    this.metrics.set(type, {
      hits: 0,
      misses: 0,
      evictions: 0,
      avgAccessTime: 0
    });
  }

  /**
   * Clear all contexts and metrics.
   */
  clearAll(): void {
    this.contexts.clear();
    this.metrics.clear();
    this.initializeContexts();
  }
} 