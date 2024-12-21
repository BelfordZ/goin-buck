import { generateEmbedding, generateText, analyzeEmotionalQuadrant } from '../services/openai';
import { DatabaseService } from '../services/database';
import { EmotionalService } from '../services/emotional';
import { SupabaseLongTermMemory } from '../implementations/long-term-memory';
import { SensoryContextMemory } from '../implementations/sensory-memory';
import { Fact, Pattern, EmotionalQuadrant, Goal, SensoryInputType } from '../types';
import { loggers } from '../utils/logger';

const logger = loggers.cognitive;

interface ExplorationState {
  currentGoal: Goal;
  subGoals: Goal[];
  insights: string[];
  emotionalState: EmotionalQuadrant;
  confidence: number;
  explorationDepth: number;
}

export class AutonomousExplorer {
  private dbService: DatabaseService;
  private emotionalService: EmotionalService;
  private longTermMemory: SupabaseLongTermMemory;
  private sensoryMemory: SensoryContextMemory;
  private maxExplorationDepth: number;
  private explorationState: ExplorationState;

  constructor(
    maxExplorationDepth: number = 5,
    initialEmotionalState: EmotionalQuadrant = { joy: 0.5, calm: 0.5, anger: 0, sadness: 0 }
  ) {
    this.dbService = new DatabaseService();
    this.emotionalService = new EmotionalService(this.dbService);
    this.longTermMemory = new SupabaseLongTermMemory('autonomous-explorer');
    this.sensoryMemory = new SensoryContextMemory('explorer-context', 'read-text');
    this.maxExplorationDepth = maxExplorationDepth;
    this.explorationState = {
      currentGoal: { id: '', description: '', priority: 0 },
      subGoals: [],
      insights: [],
      emotionalState: initialEmotionalState,
      confidence: 1.0,
      explorationDepth: 0
    };

    logger.info({
      event: 'explorer_initialized',
      config: {
        maxExplorationDepth,
        initialEmotionalState
      }
    });
  }

  async explore(topLevelGoal: string): Promise<void> {
    this.explorationState.currentGoal = {
      id: Math.random().toString(36).substring(7),
      description: topLevelGoal,
      priority: 1.0
    };

    logger.info({
      event: 'exploration_started',
      goal: this.explorationState.currentGoal
    });

    await this.exploreRecursively(this.explorationState.currentGoal);
  }

  private async exploreRecursively(goal: Goal): Promise<void> {
    if (this.explorationState.explorationDepth >= this.maxExplorationDepth) {
      logger.info({
        event: 'max_depth_reached',
        depth: this.explorationState.explorationDepth,
        goal
      });
      return;
    }

    this.explorationState.explorationDepth++;

    try {
      // Generate insights about the current goal
      const insights = await this.generateInsights(goal);
      this.explorationState.insights.push(...insights);

      // Store insights as facts
      for (const insight of insights) {
        await this.storeInsight(insight);
      }

      // Generate and explore sub-goals
      const subGoals = await this.generateSubGoals(goal, insights);
      this.explorationState.subGoals.push(...subGoals);

      // Update emotional state based on insights
      await this.updateEmotionalState(insights);

      // Recursively explore sub-goals, prioritizing by emotional resonance
      const prioritizedSubGoals = this.prioritizeSubGoals(subGoals);
      for (const subGoal of prioritizedSubGoals) {
        await this.exploreRecursively(subGoal);
      }

      // Find patterns in accumulated insights
      await this.findInsightPatterns();

    } catch (error) {
      logger.error({
        event: 'exploration_error',
        error: error instanceof Error ? error.message : String(error),
        goal,
        depth: this.explorationState.explorationDepth
      });
    } finally {
      this.explorationState.explorationDepth--;
    }
  }

  private async generateInsights(goal: Goal): Promise<string[]> {
    const prompt = `Given the goal "${goal.description}", generate novel insights and perspectives. Consider:
    1. Unexpected connections or implications
    2. Potential challenges or opportunities
    3. Alternative approaches or viewpoints
    4. Deeper underlying patterns or principles
    
    Current emotional state: ${JSON.stringify(this.explorationState.emotionalState)}
    Exploration depth: ${this.explorationState.explorationDepth}
    Previous insights: ${this.explorationState.insights.slice(-3).join(', ')}`;

    const response = await generateText(prompt);
    const insights = response.split('\n').filter((line: string) => line.trim().length > 0);

    logger.debug({
      event: 'insights_generated',
      goal,
      insights,
      prompt
    });

    return insights;
  }

  private async generateSubGoals(goal: Goal, insights: string[]): Promise<Goal[]> {
    const prompt = `Based on the goal "${goal.description}" and these insights:
    ${insights.join('\n')}
    
    Generate 3-5 specific sub-goals that would help explore or achieve this goal.
    Consider both analytical and emotional aspects.
    
    Current emotional state: ${JSON.stringify(this.explorationState.emotionalState)}`;

    const response = await generateText(prompt);
    const subGoals = response.split('\n')
      .filter((line: string) => line.trim().length > 0)
      .map((description: string) => ({
        id: Math.random().toString(36).substring(7),
        description,
        priority: this.calculateGoalPriority(description)
      }));

    logger.debug({
      event: 'subgoals_generated',
      parentGoal: goal,
      subGoals,
      prompt
    });

    return subGoals;
  }

  private async analyzeEmotionalImpact(text: string): Promise<EmotionalQuadrant> {
    return analyzeEmotionalQuadrant(text);
  }

  private calculateInsightWeight(insight: string): number {
    // Weight based on:
    // 1. Length and complexity
    // 2. Emotional resonance with current state
    // 3. Novelty compared to existing insights
    const lengthWeight = Math.min(1, insight.length / 500);
    const emotionalWeight = this.calculateEmotionalResonance(insight);
    const noveltyWeight = this.calculateNovelty(insight);

    return (lengthWeight + emotionalWeight + noveltyWeight) / 3;
  }

  private calculateEmotionalResonance(text: string): number {
    // Simple emotional resonance based on keyword matching
    // Could be enhanced with more sophisticated analysis
    const emotionalKeywords = {
      joy: ['exciting', 'opportunity', 'positive', 'innovative'],
      calm: ['balanced', 'systematic', 'structured', 'clear'],
      anger: ['challenging', 'problem', 'conflict', 'issue'],
      sadness: ['limitation', 'constraint', 'difficulty', 'concern']
    };

    let resonance = 0;
    for (const [emotion, keywords] of Object.entries(emotionalKeywords)) {
      const emotionLevel = this.explorationState.emotionalState[emotion as keyof EmotionalQuadrant];
      const keywordMatches = keywords.filter(keyword => text.toLowerCase().includes(keyword)).length;
      resonance += (keywordMatches * emotionLevel) / keywords.length;
    }

    return Math.min(1, resonance);
  }

  private calculateNovelty(insight: string): number {
    // Compare with existing insights using simple string similarity
    const similarities = this.explorationState.insights.map(existing => {
      const words1 = new Set(insight.toLowerCase().split(' '));
      const words2 = new Set(existing.toLowerCase().split(' '));
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);
      return intersection.size / union.size;
    });

    const maxSimilarity = Math.max(0, ...similarities);
    return 1 - maxSimilarity;
  }

  private calculateGoalPriority(description: string): number {
    // Priority based on:
    // 1. Emotional resonance
    // 2. Current confidence level
    // 3. Exploration depth
    const emotionalWeight = this.calculateEmotionalResonance(description);
    const depthFactor = 1 - (this.explorationState.explorationDepth / this.maxExplorationDepth);
    const confidenceFactor = this.explorationState.confidence;

    return (emotionalWeight + depthFactor + confidenceFactor) / 3;
  }

  private prioritizeSubGoals(subGoals: Goal[]): Goal[] {
    return [...subGoals].sort((a, b) => b.priority - a.priority);
  }

  private async updateEmotionalState(insights: string[]): Promise<void> {
    // Analyze emotional impact of all insights
    const emotionalImpacts = await Promise.all(
      insights.map(insight => this.analyzeEmotionalImpact(insight))
    );

    // Calculate average emotional impact
    const averageImpact = emotionalImpacts.reduce(
      (acc, impact) => ({
        joy: acc.joy + impact.joy / emotionalImpacts.length,
        calm: acc.calm + impact.calm / emotionalImpacts.length,
        anger: acc.anger + impact.anger / emotionalImpacts.length,
        sadness: acc.sadness + impact.sadness / emotionalImpacts.length
      }),
      { joy: 0, calm: 0, anger: 0, sadness: 0 }
    );

    // Update emotional state with some persistence of previous state
    this.explorationState.emotionalState = {
      joy: (this.explorationState.emotionalState.joy * 0.7) + (averageImpact.joy * 0.3),
      calm: (this.explorationState.emotionalState.calm * 0.7) + (averageImpact.calm * 0.3),
      anger: (this.explorationState.emotionalState.anger * 0.7) + (averageImpact.anger * 0.3),
      sadness: (this.explorationState.emotionalState.sadness * 0.7) + (averageImpact.sadness * 0.3)
    };

    logger.debug({
      event: 'emotional_state_updated',
      previousState: this.explorationState.emotionalState,
      averageImpact,
      newState: this.explorationState.emotionalState
    });
  }

  private async findInsightPatterns(): Promise<void> {
    // Get recent insights as facts
    const recentFacts = await this.longTermMemory.getSignificantPatterns(10);
    
    // Look for patterns in recent insights
    for (const pattern of recentFacts) {
      // Get the embedding for the first fact
      const factData = await this.dbService.getFact(pattern.facts[0]);
      if (!factData) continue;

      const relatedPatterns = await this.longTermMemory.findSimilarPatterns(
        factData.embedding,
        0.7,
        this.explorationState.emotionalState
      );

      if (relatedPatterns.length > 0) {
        // Strengthen existing patterns
        for (const related of relatedPatterns) {
          await this.longTermMemory.strengthenPattern(
            related.id,
            pattern.weight,
            this.explorationState.emotionalState
          );
        }
      }
    }

    // Consolidate memory periodically
    if (Math.random() < 0.2) { // 20% chance each time
      await this.longTermMemory.consolidate();
    }
  }

  private async storeInsight(insight: string): Promise<void> {
    const fact: Fact = {
      id: Math.random().toString(36).substring(7),
      content: insight,
      source: 'read-text' as SensoryInputType,
      timestamp: new Date(),
      embedding: await generateEmbedding(insight),
      emotionalImpact: await this.analyzeEmotionalImpact(insight),
      weight: this.calculateInsightWeight(insight)
    };

    await this.longTermMemory.store(fact);
  }
} 