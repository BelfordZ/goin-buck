"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightService = void 0;
const database_1 = require("./database");
const pattern_1 = require("./pattern");
const openai_1 = require("./openai");
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const working_memory_1 = require("../implementations/working-memory");
const long_term_memory_1 = require("../implementations/long-term-memory");
const logger = logger_1.loggers.insight;
class InsightService {
    constructor() {
        this.workingMemory = new working_memory_1.LRUWorkingMemory('insight-working-memory');
        this.longTermMemory = new long_term_memory_1.SupabaseLongTermMemory('insight-long-term-memory');
        this.patternService = new pattern_1.PatternService(new database_1.DatabaseService());
        this.processedInsights = new Set();
    }
    /**
     * Synthesize insights from a processing result, exploring different perspectives
     * and finding deeper patterns.
     */
    async synthesizeInsights(result, iterationCount = 3) {
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
        const insights = [];
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
            }
            else {
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
    async generateInsight(prompt, context) {
        // Generate the insight text
        const insightText = await (0, openai_1.generateText)(prompt);
        // Create a fact from the insight
        const fact = {
            id: `insight_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
            content: insightText,
            source: 'read-text',
            timestamp: new Date(),
            embedding: await (0, openai_1.generateEmbedding)(insightText),
            emotionalImpact: await (0, openai_1.analyzeEmotionalQuadrant)(insightText),
            weight: 0.5 // Initial weight, will be adjusted by memory systems
        };
        // Store in working memory first
        await this.workingMemory.store(fact);
        // Store in long-term memory for pattern recognition
        await this.longTermMemory.store(fact);
        // Find patterns related to this insight
        const { patterns, crossContextPatterns } = await this.patternService.processFact(fact, fact.source);
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
    calculateConfidence(patterns, crossContextPatterns) {
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
    async cleanup(retentionDays = 30) {
        await this.patternService.cleanupPatterns(retentionDays, config_1.config.memory.patternThreshold);
        this.processedInsights.clear();
        await this.workingMemory.clear();
    }
}
exports.InsightService = InsightService;
//# sourceMappingURL=insight.js.map