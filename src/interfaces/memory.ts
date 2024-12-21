import { Fact, Pattern, EmotionalQuadrant, SensoryContext } from '../types';

/**
 * Base interface for all memory operations
 */
export interface IMemoryOperations {
  store(item: any): Promise<void>;
  retrieve(id: string): Promise<any>;
  update(id: string, item: any): Promise<void>;
  delete(id: string): Promise<void>;
}

/**
 * Interface for working memory operations
 */
export interface IWorkingMemory extends IMemoryOperations {
  capacity: number;
  evictionStrategy: 'lru' | 'weight';
  evictionThreshold: number;
  
  addFact(fact: Fact): Promise<void>;
  getFacts(): Fact[];
  evictOldest(): Promise<void>;
  evictByWeight(): Promise<void>;
  clear(): Promise<void>;
  getMetrics(): WorkingMemoryMetrics;
}

/**
 * Interface for long-term memory operations
 */
export interface ILongTermMemory extends IMemoryOperations {
  storePattern(pattern: Pattern): Promise<void>;
  findSimilarPatterns(embedding: number[], threshold?: number): Promise<Pattern[]>;
  strengthenPattern(patternId: string, weight: number): Promise<void>;
  getSignificantPatterns(limit: number): Promise<Pattern[]>;
  consolidateMemory(facts: Fact[]): Promise<void>;
  cleanup(olderThan: Date): Promise<void>;
}

/**
 * Interface for sensory memory operations
 */
export interface ISensoryMemory extends IMemoryOperations {
  type: string;
  retentionTime: number;
  
  addContext(context: SensoryContext): Promise<void>;
  getContext(): Promise<SensoryContext>;
  updateContext(fact: Fact): Promise<void>;
  clearContext(): Promise<void>;
}

/**
 * Interface for emotional memory operations
 */
export interface IEmotionalMemory extends IMemoryOperations {
  getCurrentState(): Promise<EmotionalQuadrant>;
  updateState(impact: EmotionalQuadrant): Promise<void>;
  decayEmotions(rate: number): Promise<void>;
  getEmotionalHistory(startTime: Date, endTime: Date): Promise<EmotionalQuadrant[]>;
}

/**
 * Working memory metrics
 */
export interface WorkingMemoryMetrics {
  hits: number;
  misses: number;
  evictions: number;
  avgAccessTime: number;
  lastUpdated: Date;
}

/**
 * Abstract base class for memory implementations
 */
export abstract class BaseMemory implements IMemoryOperations {
  protected name: string;
  protected lastAccessed: Date;

  constructor(name: string) {
    this.name = name;
    this.lastAccessed = new Date();
  }

  abstract store(item: any): Promise<void>;
  abstract retrieve(id: string): Promise<any>;
  abstract update(id: string, item: any): Promise<void>;
  abstract delete(id: string): Promise<void>;

  protected updateAccessTime(): void {
    this.lastAccessed = new Date();
  }

  protected validateItem(item: any): boolean {
    return item !== null && item !== undefined;
  }

  getLastAccessTime(): Date {
    return this.lastAccessed;
  }
}

/**
 * Abstract working memory implementation
 */
export abstract class WorkingMemory extends BaseMemory implements IWorkingMemory {
  public capacity: number;
  public evictionStrategy: 'lru' | 'weight';
  public evictionThreshold: number;
  protected metrics: WorkingMemoryMetrics;

  constructor(
    name: string,
    capacity: number,
    evictionStrategy: 'lru' | 'weight' = 'lru',
    evictionThreshold: number = 0.5
  ) {
    super(name);
    this.capacity = capacity;
    this.evictionStrategy = evictionStrategy;
    this.evictionThreshold = evictionThreshold;
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      avgAccessTime: 0,
      lastUpdated: new Date()
    };
  }

  abstract addFact(fact: Fact): Promise<void>;
  abstract getFacts(): Fact[];
  abstract evictOldest(): Promise<void>;
  abstract evictByWeight(): Promise<void>;
  abstract clear(): Promise<void>;

  getMetrics(): WorkingMemoryMetrics {
    return { ...this.metrics };
  }

  protected updateMetrics(accessTime: number, isHit: boolean): void {
    if (isHit) {
      this.metrics.hits++;
    } else {
      this.metrics.misses++;
    }
    this.metrics.avgAccessTime = 
      (this.metrics.avgAccessTime * (this.metrics.hits + this.metrics.misses - 1) + accessTime) /
      (this.metrics.hits + this.metrics.misses);
    this.metrics.lastUpdated = new Date();
  }
}

/**
 * Abstract long-term memory implementation
 */
export abstract class LongTermMemory extends BaseMemory implements ILongTermMemory {
  abstract storePattern(pattern: Pattern): Promise<void>;
  abstract findSimilarPatterns(embedding: number[], threshold?: number): Promise<Pattern[]>;
  abstract strengthenPattern(patternId: string, weight: number): Promise<void>;
  abstract getSignificantPatterns(limit: number): Promise<Pattern[]>;
  abstract consolidateMemory(facts: Fact[]): Promise<void>;
  abstract cleanup(olderThan: Date): Promise<void>;
}

/**
 * Abstract sensory memory implementation
 */
export abstract class SensoryMemory extends BaseMemory implements ISensoryMemory {
  public type: string;
  public retentionTime: number;

  constructor(name: string, type: string, retentionTime: number) {
    super(name);
    this.type = type;
    this.retentionTime = retentionTime;
  }

  abstract addContext(context: SensoryContext): Promise<void>;
  abstract getContext(): Promise<SensoryContext>;
  abstract updateContext(fact: Fact): Promise<void>;
  abstract clearContext(): Promise<void>;
}

/**
 * Abstract emotional memory implementation
 */
export abstract class EmotionalMemory extends BaseMemory implements IEmotionalMemory {
  abstract getCurrentState(): Promise<EmotionalQuadrant>;
  abstract updateState(impact: EmotionalQuadrant): Promise<void>;
  abstract decayEmotions(rate: number): Promise<void>;
  abstract getEmotionalHistory(startTime: Date, endTime: Date): Promise<EmotionalQuadrant[]>;
} 