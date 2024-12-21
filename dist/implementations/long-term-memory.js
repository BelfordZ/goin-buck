"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseLongTermMemory = void 0;
const memory_1 = require("../interfaces/memory");
const database_1 = require("../services/database");
const logger_1 = require("../utils/logger");
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../config");
const logger = logger_1.loggers.longTermMemory;
class SupabaseLongTermMemory extends memory_1.LongTermMemory {
    constructor(name) {
        super(name);
        this.initialized = false;
        this.dbService = new database_1.DatabaseService();
        this.patterns = new Map();
        this.client = (0, supabase_js_1.createClient)(config_1.config.supabase.url, config_1.config.supabase.key);
        logger.info({
            event: 'constructor_called',
            name,
            timestamp: new Date().toISOString()
        });
    }
    async ensureInitialized() {
        if (this.initialized)
            return;
        logger.info({
            event: 'initializing_patterns',
            timestamp: new Date().toISOString()
        });
        try {
            const storedPatterns = await this.dbService.loadPatterns();
            logger.debug({
                event: 'patterns_loaded',
                count: storedPatterns.length,
                patterns: storedPatterns.map(p => ({
                    id: p.id,
                    factCount: p.facts.length,
                    weight: p.weight
                }))
            });
            storedPatterns.forEach(pattern => {
                this.patterns.set(pattern.id, pattern);
            });
            this.initialized = true;
            logger.info({
                event: 'initialization_complete',
                memoryState: {
                    patternsLoaded: this.patterns.size,
                    timestamp: new Date().toISOString()
                }
            });
        }
        catch (error) {
            logger.error({
                event: 'initialization_error',
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
    async store(fact) {
        await this.ensureInitialized();
        logger.info({
            event: 'storing_fact',
            fact: {
                id: fact.id,
                content: fact.content,
                emotionalImpact: fact.emotionalImpact,
                weight: fact.weight,
                timestamp: fact.timestamp.toISOString(),
                source: fact.source
            }
        });
        try {
            const storedFact = await this.dbService.storeFact(fact);
            logger.debug({
                event: 'fact_stored',
                storedFact: {
                    id: storedFact.id,
                    content: storedFact.content,
                    weight: storedFact.weight,
                    relatedPatterns: Array.from(this.patterns.values())
                        .filter(p => p.facts.includes(storedFact.id))
                        .map(p => ({
                        id: p.id,
                        weight: p.weight,
                        factCount: p.facts.length
                    }))
                }
            });
        }
        catch (error) {
            logger.error({
                event: 'store_fact_error',
                error: error instanceof Error ? error.message : String(error),
                fact: {
                    id: fact.id,
                    content: fact.content
                },
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
    async storePattern(pattern) {
        await this.ensureInitialized();
        const existingPattern = this.patterns.get(pattern.id);
        logger.info({
            event: 'storing_pattern',
            pattern: {
                id: pattern.id,
                factCount: pattern.facts.length,
                weight: pattern.weight,
                emotionalSignature: pattern.emotionalSignature,
                isUpdate: !!existingPattern
            }
        });
        try {
            // Store pattern in database first
            const storedPattern = await this.dbService.storePattern(pattern);
            logger.debug({
                event: 'pattern_details',
                details: {
                    id: storedPattern.id,
                    facts: storedPattern.facts,
                    emotionalSignature: storedPattern.emotionalSignature,
                    lastAccessed: storedPattern.lastAccessed.toISOString(),
                    existingWeight: existingPattern?.weight,
                    newWeight: storedPattern.weight,
                    factIntersection: existingPattern ?
                        pattern.facts.filter(f => existingPattern.facts.includes(f)).length : 0
                }
            });
            // Update in-memory cache after successful database storage
            this.patterns.set(storedPattern.id, storedPattern);
            logger.debug({
                event: 'pattern_stored',
                memoryState: {
                    patternsCount: this.patterns.size,
                    averageWeight: Array.from(this.patterns.values())
                        .reduce((sum, p) => sum + p.weight, 0) / this.patterns.size,
                    timestamp: new Date().toISOString()
                }
            });
        }
        catch (error) {
            logger.error({
                event: 'store_pattern_error',
                error: error instanceof Error ? error.message : String(error),
                pattern: {
                    id: pattern.id,
                    factCount: pattern.facts.length
                },
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
    async findSimilarPatterns(embedding, threshold = 0.85, emotionalContext) {
        await this.ensureInitialized();
        const searchStart = Date.now();
        logger.info({
            event: 'finding_similar_patterns',
            params: {
                embeddingSize: embedding.length,
                threshold,
                emotionalContext,
                totalPatterns: this.patterns.size,
                timestamp: new Date().toISOString()
            }
        });
        try {
            // Find similar facts with emotional context weighting
            const similarFacts = await this.dbService.findSimilarFacts(embedding, 5, threshold);
            logger.debug({
                event: 'similar_facts_found',
                count: similarFacts.length,
                facts: similarFacts.map(f => ({
                    id: f.id,
                    content: f.content,
                    weight: f.weight,
                    emotionalImpact: f.emotionalImpact,
                    timestamp: f.timestamp.toISOString()
                }))
            });
            // Find patterns containing these facts
            const relatedPatterns = await this.dbService.findPatternsWithFacts(similarFacts.map(f => f.id));
            // Apply emotional context weighting if provided
            let weightedPatterns = relatedPatterns;
            if (emotionalContext) {
                weightedPatterns = relatedPatterns.map(pattern => {
                    const emotionalSimilarity = this.calculateEmotionalSimilarity(emotionalContext, pattern);
                    return {
                        ...pattern,
                        weight: pattern.weight * (1 + emotionalSimilarity)
                    };
                });
                logger.debug({
                    event: 'emotional_weighting_applied',
                    context: emotionalContext,
                    weightAdjustments: weightedPatterns.map(p => ({
                        id: p.id,
                        originalWeight: relatedPatterns.find(rp => rp.id === p.id).weight,
                        adjustedWeight: p.weight
                    }))
                });
            }
            const searchDuration = Date.now() - searchStart;
            logger.info({
                event: 'similar_patterns_found',
                stats: {
                    count: weightedPatterns.length,
                    searchDurationMs: searchDuration,
                    averageWeight: weightedPatterns.reduce((sum, p) => sum + p.weight, 0) / weightedPatterns.length,
                    emotionalDistribution: weightedPatterns.reduce((acc, p) => ({
                        joy: acc.joy + (p.emotionalSignature.joy || 0),
                        calm: acc.calm + (p.emotionalSignature.calm || 0),
                        anger: acc.anger + (p.emotionalSignature.anger || 0),
                        sadness: acc.sadness + (p.emotionalSignature.sadness || 0)
                    }), { joy: 0, calm: 0, anger: 0, sadness: 0 })
                },
                patterns: weightedPatterns.map(p => ({
                    id: p.id,
                    factCount: p.facts.length,
                    weight: p.weight,
                    lastAccessed: p.lastAccessed.toISOString()
                }))
            });
            // Update in-memory cache with any new patterns found
            weightedPatterns.forEach(pattern => {
                this.patterns.set(pattern.id, pattern);
            });
            return weightedPatterns;
        }
        catch (error) {
            logger.error({
                event: 'find_similar_patterns_error',
                error: error instanceof Error ? error.message : String(error),
                searchParams: {
                    threshold,
                    emotionalContext,
                    timestamp: new Date().toISOString()
                }
            });
            throw error;
        }
    }
    async strengthenPattern(patternId, amount, emotionalContext) {
        await this.ensureInitialized();
        const strengthenStart = Date.now();
        logger.info({
            event: 'strengthening_pattern',
            params: {
                patternId,
                amount,
                emotionalContext,
                timestamp: new Date().toISOString()
            }
        });
        try {
            const pattern = this.patterns.get(patternId);
            if (pattern) {
                const oldWeight = pattern.weight;
                const timeSinceLastAccess = Date.now() - pattern.lastAccessed.getTime();
                const decayFactor = Math.exp(-timeSinceLastAccess / (30 * 24 * 60 * 60 * 1000)); // 30-day half-life
                // Apply time-based decay
                pattern.weight *= decayFactor;
                // Calculate emotional reinforcement
                let emotionalReinforcement = 1;
                if (emotionalContext) {
                    const emotionalSimilarity = this.calculateEmotionalSimilarity(emotionalContext, pattern);
                    emotionalReinforcement = 1 + emotionalSimilarity;
                }
                // Apply strengthening with emotional reinforcement
                pattern.weight = Math.min(1, pattern.weight + (amount * emotionalReinforcement));
                pattern.lastAccessed = new Date();
                // Update emotional signature with new context
                if (emotionalContext) {
                    pattern.emotionalSignature = this.updateEmotionalSignature(pattern.emotionalSignature, emotionalContext);
                }
                // Update pattern in database
                await this.dbService.updatePattern(pattern);
                logger.debug({
                    event: 'pattern_strengthened',
                    details: {
                        id: patternId,
                        oldWeight,
                        decayedWeight: oldWeight * decayFactor,
                        emotionalReinforcement,
                        newWeight: pattern.weight,
                        change: pattern.weight - oldWeight,
                        timeSinceLastAccess: Math.floor(timeSinceLastAccess / (1000 * 60 * 60)), // hours
                        decayFactor,
                        factCount: pattern.facts.length,
                        emotionalSignature: pattern.emotionalSignature,
                        processingTimeMs: Date.now() - strengthenStart,
                        lastAccessed: pattern.lastAccessed.toISOString()
                    }
                });
            }
            else {
                logger.warn({
                    event: 'pattern_not_found',
                    details: {
                        patternId,
                        timestamp: new Date().toISOString(),
                        totalPatterns: this.patterns.size
                    }
                });
            }
        }
        catch (error) {
            logger.error({
                event: 'strengthen_pattern_error',
                error: error instanceof Error ? error.message : String(error),
                pattern: { id: patternId },
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
    async getSignificantPatterns(limit = 10) {
        await this.ensureInitialized();
        logger.info({
            event: 'getting_significant_patterns',
            params: {
                limit,
                totalPatterns: this.patterns.size,
                timestamp: new Date().toISOString()
            }
        });
        try {
            // Get significant patterns from database
            const significantPatterns = await this.dbService.getSignificantPatterns(limit);
            logger.debug({
                event: 'significant_patterns_found',
                stats: significantPatterns.length > 0 ? {
                    requestedCount: limit,
                    returnedCount: significantPatterns.length,
                    averageWeight: significantPatterns.reduce((sum, p) => sum + p.weight, 0) / significantPatterns.length,
                    oldestPattern: new Date(Math.min(...significantPatterns.map(p => p.lastAccessed.getTime()))).toISOString(),
                    newestPattern: new Date(Math.max(...significantPatterns.map(p => p.lastAccessed.getTime()))).toISOString()
                } : {
                    requestedCount: limit,
                    returnedCount: 0,
                    averageWeight: 0,
                    oldestPattern: null,
                    newestPattern: null
                },
                patterns: significantPatterns.map(p => ({
                    id: p.id,
                    factCount: p.facts.length,
                    weight: p.weight,
                    emotionalSignature: p.emotionalSignature,
                    lastAccessed: p.lastAccessed.toISOString()
                }))
            });
            // Update in-memory cache
            significantPatterns.forEach(pattern => {
                this.patterns.set(pattern.id, pattern);
            });
            return significantPatterns;
        }
        catch (error) {
            logger.error({
                event: 'get_significant_patterns_error',
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
    async consolidate() {
        await this.ensureInitialized();
        const consolidateStart = Date.now();
        logger.info({
            event: 'starting_consolidation',
            state: {
                patternsCount: this.patterns.size,
                timestamp: new Date().toISOString()
            }
        });
        try {
            // Get patterns to remove (weak patterns)
            const beforeCount = this.patterns.size;
            const beforeWeights = Array.from(this.patterns.values()).map(p => p.weight);
            const patternsToRemove = Array.from(this.patterns.values())
                .filter(pattern => pattern.weight <= 0.2)
                .map(pattern => pattern.id);
            // Remove patterns from database
            if (patternsToRemove.length > 0) {
                await this.dbService.removePatterns(patternsToRemove);
            }
            // Update in-memory cache
            patternsToRemove.forEach(id => {
                this.patterns.delete(id);
            });
            const afterCount = this.patterns.size;
            const afterWeights = Array.from(this.patterns.values()).map(p => p.weight);
            logger.info({
                event: 'consolidation_complete',
                stats: {
                    removedCount: beforeCount - afterCount,
                    remainingCount: afterCount,
                    processingTimeMs: Date.now() - consolidateStart,
                    beforeAverageWeight: beforeWeights.reduce((a, b) => a + b, 0) / beforeWeights.length,
                    afterAverageWeight: afterWeights.reduce((a, b) => a + b, 0) / afterWeights.length
                }
            });
        }
        catch (error) {
            logger.error({
                event: 'consolidation_error',
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }
    async retrieve(id) {
        await this.ensureInitialized();
        logger.info({
            event: 'retrieving_fact',
            id
        });
        try {
            const { data, error } = await this.client
                .from('facts')
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                // Handle "no rows" case gracefully
                if (error.code === 'PGRST116' && error.details?.includes('0 rows')) {
                    logger.debug({
                        event: 'fact_not_found',
                        id
                    });
                    return null;
                }
                // Log and throw other errors
                logger.error({
                    event: 'retrieve_fact_error',
                    error: {
                        code: error.code,
                        message: error.message,
                        details: error.details,
                        hint: error.hint
                    },
                    id
                });
                throw error;
            }
            if (!data) {
                logger.debug({
                    event: 'fact_not_found',
                    id
                });
                return null;
            }
            const fact = this.mapDatabaseFactToFact(data);
            logger.debug({
                event: 'fact_retrieved',
                fact: {
                    id: fact.id,
                    content: fact.content,
                    weight: fact.weight,
                    timestamp: fact.timestamp.toISOString()
                }
            });
            return fact;
        }
        catch (error) {
            // Only log unexpected errors that weren't handled above
            if (!(error instanceof Error && 'code' in error && error.code === 'PGRST116')) {
                logger.error({
                    event: 'retrieve_fact_error',
                    error: error instanceof Error
                        ? {
                            name: error.name,
                            message: error.message,
                            stack: error.stack
                        }
                        : {
                            type: typeof error,
                            value: JSON.stringify(error, null, 2)
                        },
                    id
                });
            }
            throw error;
        }
    }
    async update(id, fact) {
        await this.ensureInitialized();
        logger.info({
            event: 'updating_fact',
            id,
            fact
        });
        try {
            const { error } = await this.client
                .from('facts')
                .update({
                content: fact.content,
                source: fact.source,
                timestamp: fact.timestamp,
                embedding: fact.embedding,
                emotional_impact: fact.emotionalImpact,
                weight: fact.weight
            })
                .eq('id', id);
            if (error)
                throw error;
        }
        catch (error) {
            logger.error({
                event: 'update_fact_error',
                error: error instanceof Error ? error.message : String(error),
                id
            });
            throw error;
        }
    }
    async delete(id) {
        await this.ensureInitialized();
        logger.info({
            event: 'deleting_fact',
            id
        });
        try {
            const { error } = await this.client
                .from('facts')
                .delete()
                .eq('id', id);
            if (error)
                throw error;
        }
        catch (error) {
            logger.error({
                event: 'delete_fact_error',
                error: error instanceof Error ? error.message : String(error),
                id
            });
            throw error;
        }
    }
    async consolidateMemory(facts) {
        await this.ensureInitialized();
        logger.info({
            event: 'consolidating_memory',
            factCount: facts.length
        });
        try {
            // Process facts by weight, looking for patterns
            for (const fact of facts) {
                const similarPatterns = await this.findSimilarPatterns(fact.embedding);
                if (similarPatterns.length > 0) {
                    // Strengthen existing patterns when similar facts are found
                    for (const pattern of similarPatterns) {
                        await this.strengthenPattern(pattern.id, fact.weight);
                    }
                }
                else if (fact.weight > 0.5) { // threshold for new pattern creation
                    // Create new pattern for significant fact
                    await this.storePattern({
                        id: Math.random().toString(36).substring(7),
                        facts: [fact.id],
                        weight: fact.weight,
                        emotionalSignature: fact.emotionalImpact,
                        lastAccessed: new Date()
                    });
                }
            }
        }
        catch (error) {
            logger.error({
                event: 'consolidate_memory_error',
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async cleanup(olderThan) {
        await this.ensureInitialized();
        logger.info({
            event: 'cleaning_up',
            olderThan
        });
        try {
            await this.dbService.cleanupOldData(Math.floor((Date.now() - olderThan.getTime()) / (24 * 60 * 60 * 1000)));
        }
        catch (error) {
            logger.error({
                event: 'cleanup_error',
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    calculateEmotionalSimilarity(emotionalContext, pattern) {
        return Object.entries(emotionalContext).reduce((sum, [emotion, value]) => {
            const dimension = emotion;
            return sum + (value * (pattern.emotionalSignature[dimension] || 0));
        }, 0) / Object.keys(emotionalContext).length;
    }
    updateEmotionalSignature(signature, context) {
        return Object.entries(context).reduce((updated, [emotion, value]) => {
            const dimension = emotion;
            return {
                ...updated,
                [dimension]: ((signature[dimension] || 0) + value) / 2
            };
        }, { ...signature });
    }
    mapDatabaseFactToFact(dbFact) {
        return {
            id: dbFact.id,
            content: dbFact.content,
            source: dbFact.source,
            timestamp: new Date(dbFact.timestamp),
            embedding: dbFact.embedding,
            emotionalImpact: dbFact.emotional_impact,
            weight: dbFact.weight
        };
    }
}
exports.SupabaseLongTermMemory = SupabaseLongTermMemory;
//# sourceMappingURL=long-term-memory.js.map