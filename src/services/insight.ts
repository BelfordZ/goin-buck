import { DatabaseService } from './database';
import { PatternService } from './pattern';
import { generateText, generateEmbedding, analyzeEmotionalQuadrant } from './openai';
import { loggers } from '../utils/logger';
import {
  Fact,
  Pattern,
  CrossContextPattern,
  EmotionalQuadrant,
  SensoryInputType,
  SensoryProcessingResult
} from '../types';
import { config } from '../config';
import { LRUWorkingMemory } from '../implementations/working-memory';
import { SupabaseLongTermMemory } from '../implementations/long-term-memory';

const logger = loggers.insight;

interface InsightResult {
  fact: Fact;
  relatedPatterns: Pattern[];
  crossContextPatterns: CrossContextPattern[];
  emotionalImpact: EmotionalQuadrant;
  confidence: number;
}

export class InsightService {
  private workingMemory: LRUWorkingMemory;
  private longTermMemory: SupabaseLongTermMemory;
  private patternService: PatternService;
  private processedInsights: Set<string>;

  constructor() {
    this.workingMemory = new LRUWorkingMemory('insight-working-memory');
    this.longTermMemory = new SupabaseLongTermMemory('insight-long-term-memory');
    this.patternService = new PatternService(new DatabaseService());
    this.processedInsights = new Set();
  }

  /**
   * Synthesize insights from a processing result, exploring different perspectives
   * and finding deeper patterns.
   */
  async synthesizeInsights(
    result: SensoryProcessingResult,
    iterationCount: number = 3
  ): Promise<InsightResult[]> {
    logger.info({
      event: 'starting_synthesis',
      originalFact: {
        content: result.fact.content,
        emotionalImpact: result.fact.emotionalImpact
      },
      iterationCount
    });

    // Track processed insights to avoid duplicates
    this.processedInsights.add(result.fact.content.toLowerCase().trim());

    const synthesisPrompts = [
      `What deeper meaning can we find in "${result.fact.content}"?`,
      `How does this relate to our previous experiences?`,
      `What patterns or connections emerge when we consider this?`,
      `What emotional insights can we draw from this experience?`,
      `How might this influence future perceptions?`
    ];

    const insights: InsightResult[] = [];

    for (let i = 0; i < iterationCount; i++) {
      const prompt = synthesisPrompts[i % synthesisPrompts.length];
      logger.info({
        event: 'synthesis_iteration',
        iteration: i + 1,
        prompt
      });

      const insight = await this.generateInsight(prompt, result);
      const normalizedContent = insight.fact.content.toLowerCase().trim();

      // Only process if this is a new insight
      if (!this.processedInsights.has(normalizedContent)) {
        this.processedInsights.add(normalizedContent);
        insights.push(insight);

        logger.info({
          event: 'insight_generated',
          iteration: i + 1,
          result: {
            factId: insight.fact.id,
            content: insight.fact.content,
            emotionalImpact: insight.fact.emotionalImpact,
            relatedPatternsCount: insight.relatedPatterns.length,
            crossContextPatternsCount: insight.crossContextPatterns.length,
            confidence: insight.confidence
          }
        });

        // Allow time for associations to form
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        logger.info({
          event: 'insight_skipped',
          iteration: i + 1,
          result: {
            content: insight.fact.content,
            reason: 'duplicate_insight'
          }
        });
      }
    }

    // Consolidate working memory into long-term memory
    await this.workingMemory.consolidate();

    return insights;
  }

  /**
   * Generate a single insight based on a prompt and find related patterns.
   */
  private async generateInsight(
    prompt: string,
    context: SensoryProcessingResult
  ): Promise<InsightResult> {
    // Generate the insight text
    const insightText = await generateText(prompt);
    
    // Create a fact from the insight
    const fact: Fact = {
      id: `insight_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      content: insightText,
      source: 'read-text' as SensoryInputType,
      timestamp: new Date(),
      embedding: await generateEmbedding(insightText),
      emotionalImpact: await analyzeEmotionalQuadrant(insightText),
      weight: 0.5 // Initial weight, will be adjusted by memory systems
    };

    // Store in working memory first
    await this.workingMemory.store(fact);

    // Store in long-term memory for pattern recognition
    await this.longTermMemory.store(fact);

    // Find patterns related to this insight
    const { patterns, crossContextPatterns } = await this.patternService.processFact(
      fact,
      fact.source
    );

    return {
      fact,
      relatedPatterns: patterns,
      crossContextPatterns,
      emotionalImpact: fact.emotionalImpact,
      confidence: this.calculateConfidence(patterns, crossContextPatterns)
    };
  }

  /**
   * Calculate confidence in an insight based on pattern support.
   */
  private calculateConfidence(
    patterns: Pattern[],
    crossContextPatterns: CrossContextPattern[]
  ): number {
    // Confidence based on:
    // 1. Number of supporting patterns
    const patternSupport = Math.min(1, patterns.length / 5);

    // 2. Strength of cross-context connections
    const crossContextSupport = Math.min(1, crossContextPatterns.length / 3);

    // 3. Average pattern weight
    const avgWeight = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.weight, 0) / patterns.length
      : 0;

    return (patternSupport + crossContextSupport + avgWeight) / 3;
  }

  /**
   * Clean up old insights and patterns.
   */
  async cleanup(retentionDays: number = 30): Promise<void> {
    await this.patternService.cleanupPatterns(
      retentionDays,
      config.memory.patternThreshold
    );
    this.processedInsights.clear();
    await this.workingMemory.clear();
  }
} 