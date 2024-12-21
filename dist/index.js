"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveSystem = void 0;
const uuid_1 = require("uuid");
const config_1 = require("./config");
const openai_1 = require("./services/openai");
const working_memory_1 = require("./implementations/working-memory");
const long_term_memory_1 = require("./implementations/long-term-memory");
const emotional_memory_1 = require("./implementations/emotional-memory");
const sensory_memory_1 = require("./implementations/sensory-memory");
const insight_1 = require("./services/insight");
/**
 * Main cognitive system that processes sensory inputs, maintains emotional state,
 * and manages different memory layers using LRU cache behavior.
 */
class CognitiveSystem {
    constructor() {
        this.sleepCycle = null;
        // Initialize memory systems
        this.workingMemory = new working_memory_1.LRUWorkingMemory('active-memory', config_1.config.memory.contextRetentionSize, 'lru', 0.5);
        this.longTermMemory = new long_term_memory_1.SupabaseLongTermMemory('long-term-memory');
        this.emotionalMemory = new emotional_memory_1.SupabaseEmotionalMemory('emotional-memory');
        this.sensoryMemories = new Map();
        this.insightService = new insight_1.InsightService();
        // Initialize sensory memories for each input type
        this.initializeSensoryMemories();
    }
    initializeSensoryMemories() {
        const inputTypes = ['read-text', 'hear-text', 'feel-text', 'smell-text', 'taste-text'];
        for (const type of inputTypes) {
            this.sensoryMemories.set(type, new sensory_memory_1.SensoryContextMemory(`${type}-memory`, type, config_1.config.memory.contextRetentionHours * 60 * 60 * 1000));
        }
    }
    /**
     * Process text input through the system.
     */
    async processTextInput(content) {
        console.log('\n[CognitiveSystem] Processing text input:', content);
        // Get sensory context from sensory memory
        const sensoryMemory = this.sensoryMemories.get('read-text');
        if (!sensoryMemory) {
            throw new Error('Sensory memory not initialized for read-text');
        }
        const sensoryContext = await sensoryMemory.getContext();
        // Get working memory context
        const workingMemoryFacts = await this.workingMemory.getFacts();
        // Get long term memory context - significant patterns
        const significantPatterns = await this.longTermMemory.getSignificantPatterns(10);
        const factIds = significantPatterns.flatMap(pattern => pattern.facts);
        const recentLongTermFacts = await Promise.all(factIds.map(id => this.longTermMemory.retrieve(id))).then(facts => facts.filter((fact) => fact !== null));
        // Merge contexts to get the richest context
        const context = {
            type: 'read-text',
            recentFacts: [...new Set([...workingMemoryFacts, ...recentLongTermFacts, ...sensoryContext.recentFacts])],
            contextualMemory: [...sensoryContext.contextualMemory],
            lastUpdated: new Date()
        };
        // Extract fact using OpenAI service with merged context
        const extractedFact = await (0, openai_1.extractFactFromText)(content, context);
        console.log('[CognitiveSystem] Extracted fact:', extractedFact);
        // Generate embedding
        const embedding = await (0, openai_1.generateEmbedding)(content);
        // Create fact with ID and embedding
        const fact = {
            ...extractedFact,
            id: (0, uuid_1.v4)(),
            embedding,
            weight: 0 // Will be updated based on emotional impact
        };
        // Get current emotional state before update
        const currentState = await this.emotionalMemory.getCurrentState();
        console.log('[CognitiveSystem] Current emotional state before update:', currentState);
        // Process through emotional memory and update fact weight
        await this.emotionalMemory.updateState(fact.emotionalImpact);
        fact.weight = this.calculateFactWeight(fact.emotionalImpact);
        // Get new emotional state after update
        const newState = await this.emotionalMemory.getCurrentState();
        console.log('[CognitiveSystem] New emotional state after update:', newState);
        console.log('[CognitiveSystem] Emotional impact that caused change:', fact.emotionalImpact);
        console.log('[CognitiveSystem] Calculated fact weight:', fact.weight);
        // Add to working memory and long-term memory
        await this.workingMemory.addFact(fact);
        await this.longTermMemory.store(fact);
        // Update sensory context
        await sensoryMemory.updateContext(fact);
        // Find and strengthen similar patterns
        const similarPatterns = await this.longTermMemory.findSimilarPatterns(fact.embedding, config_1.config.memory.similarityThreshold);
        // Strengthen existing patterns or create new ones
        if (similarPatterns.length > 0) {
            await Promise.all(similarPatterns.map(pattern => this.longTermMemory.strengthenPattern(pattern.id, fact.weight)));
        }
        else if (fact.weight > config_1.config.memory.patternThreshold) {
            await this.longTermMemory.storePattern({
                id: (0, uuid_1.v4)(),
                facts: [fact.id],
                weight: fact.weight,
                emotionalSignature: fact.emotionalImpact,
                lastAccessed: new Date()
            });
        }
        // Generate insights from the processing result
        const insights = await this.insightService.synthesizeInsights({
            fact,
            relatedFacts: context.recentFacts.map(f => f.id),
            emotionalState: newState
        });
        return {
            fact,
            relatedFacts: context.recentFacts.map(f => f.id),
            emotionalState: newState,
            insights
        };
    }
    /**
     * Calculate fact weight based on emotional impact.
     */
    calculateFactWeight(impact) {
        // Calculate distance from neutral state (0,0,0,0)
        const distance = Math.sqrt(impact.joy ** 2 +
            impact.calm ** 2 +
            impact.anger ** 2 +
            impact.sadness ** 2);
        return Math.min(1, distance);
    }
    /**
     * Start the sleep cycle.
     */
    startSleepCycle(intervalHours = 24) {
        if (this.sleepCycle)
            return;
        const intervalMs = intervalHours * 60 * 60 * 1000;
        this.sleepCycle = setInterval(async () => {
            await this.processSleepCycle();
        }, intervalMs);
    }
    /**
     * Stop the sleep cycle.
     */
    stopSleepCycle() {
        if (this.sleepCycle) {
            clearInterval(this.sleepCycle);
            this.sleepCycle = null;
        }
    }
    /**
     * Process the sleep cycle.
     */
    async processSleepCycle() {
        // Get high-weight facts from short-term memory
        const shortTermSample = await this.workingMemory.getSampleByWeight(config_1.config.memory.sleepCycleFactCount);
        // Process each fact with reduced emotional impact
        for (const fact of shortTermSample) {
            const reducedImpact = this.reduceEmotionalImpact(fact.emotionalImpact);
            await this.emotionalMemory.updateState(reducedImpact);
        }
        // Consolidate memory
        await this.workingMemory.consolidate();
    }
    /**
     * Reduce emotional impact for sleep processing.
     */
    reduceEmotionalImpact(impact) {
        return {
            joy: impact.joy * config_1.config.memory.emotionalDecayRate,
            calm: impact.calm * config_1.config.memory.emotionalDecayRate,
            anger: impact.anger * config_1.config.memory.emotionalDecayRate,
            sadness: impact.sadness * config_1.config.memory.emotionalDecayRate,
        };
    }
    /**
     * Get the current emotional state.
     */
    async getEmotionalState() {
        return this.emotionalMemory.getCurrentState();
    }
    /**
     * Get emotional trends for a time period.
     */
    async getEmotionalTrends(startTime, endTime) {
        return this.emotionalMemory.getEmotionalHistory(startTime, endTime);
    }
    /**
     * Find patterns across different contexts.
     */
    async findCrossContextPatterns(timeWindowHours = 24) {
        const startTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
        // Get all facts from working memory and long-term memory
        const workingFacts = this.workingMemory.getFacts();
        const patterns = await this.longTermMemory.getSignificantPatterns(config_1.config.memory.sleepCycleFactCount);
        // Group patterns by emotional signature similarity
        const groupedPatterns = new Map();
        for (const pattern of patterns) {
            const signature = this.getEmotionalSignatureKey(pattern.emotionalSignature);
            const group = groupedPatterns.get(signature) || [];
            group.push(pattern);
            groupedPatterns.set(signature, group);
        }
        // Find cross-context patterns
        const crossContextPatterns = [];
        for (const [signature, group] of groupedPatterns) {
            if (group.length >= 2) {
                const contexts = new Set(group.map(p => p.facts[0])); // Get unique contexts
                if (contexts.size >= 2) {
                    crossContextPatterns.push({
                        id: (0, uuid_1.v4)(),
                        sourcePatterns: group.map(p => p.id),
                        sourceContexts: Array.from(contexts),
                        weight: group.reduce((sum, p) => sum + p.weight, 0) / group.length,
                        emotionalSignature: group[0].emotionalSignature,
                        confidence: group.length / patterns.length,
                        lastAccessed: new Date()
                    });
                }
            }
        }
        return crossContextPatterns;
    }
    /**
     * Get a key representing the emotional signature for grouping.
     */
    getEmotionalSignatureKey(signature) {
        const threshold = config_1.config.emotional.neutralThreshold;
        return [
            signature.joy > threshold ? 'joy' : '',
            signature.calm > threshold ? 'calm' : '',
            signature.anger > threshold ? 'anger' : '',
            signature.sadness > threshold ? 'sadness' : ''
        ].filter(Boolean).join('-') || 'neutral';
    }
    /**
     * Clean up resources and stop processes.
     */
    async cleanup() {
        this.stopSleepCycle();
        await this.workingMemory.clear();
        for (const memory of this.sensoryMemories.values()) {
            await memory.clearContext();
        }
    }
}
exports.CognitiveSystem = CognitiveSystem;
//# sourceMappingURL=index.js.map