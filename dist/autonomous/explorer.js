"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutonomousExplorer = void 0;
const openai_1 = require("../services/openai");
const database_1 = require("../services/database");
const emotional_1 = require("../services/emotional");
const long_term_memory_1 = require("../implementations/long-term-memory");
const sensory_memory_1 = require("../implementations/sensory-memory");
const logger_1 = require("../utils/logger");
const logger = logger_1.loggers.cognitive;
class AutonomousExplorer {
    constructor(maxExplorationDepth = 5, initialEmotionalState = { joy: 0.5, calm: 0.5, anger: 0, sadness: 0 }) {
        this.dbService = new database_1.DatabaseService();
        this.emotionalService = new emotional_1.EmotionalService(this.dbService);
        this.longTermMemory = new long_term_memory_1.SupabaseLongTermMemory('autonomous-explorer');
        this.sensoryMemory = new sensory_memory_1.SensoryContextMemory('explorer-context', 'read-text');
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
    async explore(topLevelGoal) {
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
    async exploreRecursively(goal) {
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
        }
        catch (error) {
            logger.error({
                event: 'exploration_error',
                error: error instanceof Error ? error.message : String(error),
                goal,
                depth: this.explorationState.explorationDepth
            });
        }
        finally {
            this.explorationState.explorationDepth--;
        }
    }
    async generateInsights(goal) {
        const prompt = `Given the goal "${goal.description}", generate novel insights and perspectives. Consider:
    1. Unexpected connections or implications
    2. Potential challenges or opportunities
    3. Alternative approaches or viewpoints
    4. Deeper underlying patterns or principles
    
    Current emotional state: ${JSON.stringify(this.explorationState.emotionalState)}
    Exploration depth: ${this.explorationState.explorationDepth}
    Previous insights: ${this.explorationState.insights.slice(-3).join(', ')}`;
        const response = await (0, openai_1.generateText)(prompt);
        const insights = response.split('\n').filter((line) => line.trim().length > 0);
        logger.debug({
            event: 'insights_generated',
            goal,
            insights,
            prompt
        });
        return insights;
    }
    async generateSubGoals(goal, insights) {
        const prompt = `Based on the goal "${goal.description}" and these insights:
    ${insights.join('\n')}
    
    Generate 3-5 specific sub-goals that would help explore or achieve this goal.
    Consider both analytical and emotional aspects.
    
    Current emotional state: ${JSON.stringify(this.explorationState.emotionalState)}`;
        const response = await (0, openai_1.generateText)(prompt);
        const subGoals = response.split('\n')
            .filter((line) => line.trim().length > 0)
            .map((description) => ({
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
    async analyzeEmotionalImpact(text) {
        return (0, openai_1.analyzeEmotionalQuadrant)(text);
    }
    calculateInsightWeight(insight) {
        // Weight based on:
        // 1. Length and complexity
        // 2. Emotional resonance with current state
        // 3. Novelty compared to existing insights
        const lengthWeight = Math.min(1, insight.length / 500);
        const emotionalWeight = this.calculateEmotionalResonance(insight);
        const noveltyWeight = this.calculateNovelty(insight);
        return (lengthWeight + emotionalWeight + noveltyWeight) / 3;
    }
    calculateEmotionalResonance(text) {
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
            const emotionLevel = this.explorationState.emotionalState[emotion];
            const keywordMatches = keywords.filter(keyword => text.toLowerCase().includes(keyword)).length;
            resonance += (keywordMatches * emotionLevel) / keywords.length;
        }
        return Math.min(1, resonance);
    }
    calculateNovelty(insight) {
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
    calculateGoalPriority(description) {
        // Priority based on:
        // 1. Emotional resonance
        // 2. Current confidence level
        // 3. Exploration depth
        const emotionalWeight = this.calculateEmotionalResonance(description);
        const depthFactor = 1 - (this.explorationState.explorationDepth / this.maxExplorationDepth);
        const confidenceFactor = this.explorationState.confidence;
        return (emotionalWeight + depthFactor + confidenceFactor) / 3;
    }
    prioritizeSubGoals(subGoals) {
        return [...subGoals].sort((a, b) => b.priority - a.priority);
    }
    async updateEmotionalState(insights) {
        // Analyze emotional impact of all insights
        const emotionalImpacts = await Promise.all(insights.map(insight => this.analyzeEmotionalImpact(insight)));
        // Calculate average emotional impact
        const averageImpact = emotionalImpacts.reduce((acc, impact) => ({
            joy: acc.joy + impact.joy / emotionalImpacts.length,
            calm: acc.calm + impact.calm / emotionalImpacts.length,
            anger: acc.anger + impact.anger / emotionalImpacts.length,
            sadness: acc.sadness + impact.sadness / emotionalImpacts.length
        }), { joy: 0, calm: 0, anger: 0, sadness: 0 });
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
    async findInsightPatterns() {
        // Get recent insights as facts
        const recentFacts = await this.longTermMemory.getSignificantPatterns(10);
        // Look for patterns in recent insights
        for (const pattern of recentFacts) {
            // Get the embedding for the first fact
            const factData = await this.dbService.getFact(pattern.facts[0]);
            if (!factData)
                continue;
            const relatedPatterns = await this.longTermMemory.findSimilarPatterns(factData.embedding, 0.7, this.explorationState.emotionalState);
            if (relatedPatterns.length > 0) {
                // Strengthen existing patterns
                for (const related of relatedPatterns) {
                    await this.longTermMemory.strengthenPattern(related.id, pattern.weight, this.explorationState.emotionalState);
                }
            }
        }
        // Consolidate memory periodically
        if (Math.random() < 0.2) { // 20% chance each time
            await this.longTermMemory.consolidate();
        }
    }
    async storeInsight(insight) {
        const fact = {
            id: Math.random().toString(36).substring(7),
            content: insight,
            source: 'read-text',
            timestamp: new Date(),
            embedding: await (0, openai_1.generateEmbedding)(insight),
            emotionalImpact: await this.analyzeEmotionalImpact(insight),
            weight: this.calculateInsightWeight(insight)
        };
        await this.longTermMemory.store(fact);
    }
}
exports.AutonomousExplorer = AutonomousExplorer;
//# sourceMappingURL=explorer.js.map