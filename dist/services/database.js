"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const logger = logger_1.loggers.database;
/**
 * Handles all database operations through Supabase.
 * Provides high-level methods for managing facts, patterns, emotional states,
 * and context history.
 */
class DatabaseService {
    constructor() {
        this.client = (0, supabase_js_1.createClient)(config_1.config.supabase.url, config_1.config.supabase.key);
        logger.info({
            event: 'initialized',
            url: config_1.config.supabase.url
        });
    }
    /**
     * Store a new fact in the database.
     */
    async storeFact(fact) {
        logger.debug({
            event: 'storing_fact',
            fact: {
                content: fact.content,
                source: fact.source,
                timestamp: fact.timestamp,
                emotionalImpact: fact.emotionalImpact,
                weight: fact.weight
            }
        });
        try {
            // Generate a unique ID for the fact
            const factId = `fact_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
            const { data, error } = await this.client
                .from('facts')
                .insert({
                id: factId,
                content: fact.content,
                source: fact.source,
                timestamp: fact.timestamp,
                embedding: fact.embedding,
                emotional_impact: fact.emotionalImpact,
                weight: fact.weight
            })
                .select()
                .single();
            if (error) {
                logger.error({
                    event: 'store_fact_error',
                    error: error.message,
                    details: error
                });
                throw error;
            }
            const storedFact = this.mapDatabaseFactToFact(data);
            logger.info({
                event: 'fact_stored',
                fact: {
                    id: storedFact.id,
                    content: storedFact.content,
                    weight: storedFact.weight
                }
            });
            return storedFact;
        }
        catch (error) {
            logger.error({
                event: 'store_fact_error',
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Update emotional state and get trend analysis.
     */
    async updateEmotionalState(quadrant, intensity, sourceFactIds, lookbackHours = 24) {
        logger.info({
            event: 'updating_emotional_state',
            quadrant,
            intensity,
            sourceFactIds,
            lookbackHours
        });
        try {
            const { data, error } = await this.client
                .rpc('update_emotional_state', {
                new_quadrant: quadrant,
                new_intensity: intensity,
                source_fact_ids: sourceFactIds,
                lookback_hours: lookbackHours
            })
                .single();
            if (error) {
                logger.error({
                    event: 'update_emotional_state_error',
                    error: error.message,
                    details: error
                });
                throw error;
            }
            if (!data) {
                const msg = 'No data returned from updateEmotionalState';
                logger.error({
                    event: 'update_emotional_state_error',
                    error: msg
                });
                throw new Error(msg);
            }
            const response = data;
            logger.info({
                event: 'emotional_state_updated',
                stateId: response.state_id,
                trendCount: response.trend_analysis.trends.length
            });
            return {
                stateId: response.state_id,
                trends: response.trend_analysis.trends
            };
        }
        catch (error) {
            logger.error({
                event: 'update_emotional_state_error',
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Update context history and get emerging patterns.
     */
    async updateContextHistory(contextType, recentFactIds, contextualMemoryIds, emotionalStateId, metrics, similarityThreshold = 0.85, timeWindowHours = 24) {
        logger.info({
            event: 'updating_context_history',
            contextType,
            recentFactCount: recentFactIds.length,
            contextualMemoryCount: contextualMemoryIds.length,
            emotionalStateId,
            metrics,
            similarityThreshold,
            timeWindowHours
        });
        try {
            const { data, error } = await this.client
                .rpc('update_context_history', {
                context_type: contextType,
                recent_fact_ids: recentFactIds,
                contextual_memory_ids: contextualMemoryIds,
                emotional_state_id: emotionalStateId,
                context_metrics: metrics,
                pattern_similarity_threshold: similarityThreshold,
                time_window_hours: timeWindowHours
            })
                .single();
            if (error) {
                logger.error({
                    event: 'update_context_history_error',
                    error: error.message,
                    details: error
                });
                throw error;
            }
            if (!data) {
                const msg = 'No data returned from updateContextHistory';
                logger.error({
                    event: 'update_context_history_error',
                    error: msg
                });
                throw new Error(msg);
            }
            const response = data;
            logger.info({
                event: 'context_history_updated',
                contextId: response.context_id,
                patternCount: response.emerging_patterns.cross_context_patterns.length
            });
            return {
                contextId: response.context_id,
                patterns: response.emerging_patterns.cross_context_patterns
            };
        }
        catch (error) {
            logger.error({
                event: 'update_context_history_error',
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Find similar facts using embedding similarity.
     */
    async findSimilarFacts(embedding, limit = 5, threshold = 0.85) {
        logger.debug({
            event: 'finding_similar_facts',
            embeddingSize: embedding.length,
            limit,
            threshold
        });
        try {
            const { data, error } = await this.client
                .rpc('find_similar_facts', {
                query_embedding: embedding,
                similarity_threshold: threshold,
                max_results: limit
            });
            if (error) {
                logger.error({
                    event: 'find_similar_facts_error',
                    error: error.message,
                    details: error
                });
                throw error;
            }
            const facts = data.map((dbFact) => this.mapDatabaseFactToFact(dbFact));
            logger.info({
                event: 'similar_facts_found',
                count: facts.length,
                facts: facts.map((f) => ({
                    id: f.id,
                    content: f.content,
                    weight: f.weight,
                    similarity: f.similarity
                }))
            });
            return facts;
        }
        catch (error) {
            logger.error({
                event: 'find_similar_facts_error',
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Get emotional state trends for a time period.
     */
    async getEmotionalTrends(startTime, endTime, contextType) {
        logger.info({
            event: 'getting_emotional_trends',
            startTime,
            endTime,
            contextType
        });
        try {
            const { data, error } = await this.client
                .rpc('analyze_emotional_trend', {
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                context_type: contextType
            });
            if (error) {
                logger.error({
                    event: 'get_emotional_trends_error',
                    error: error.message,
                    details: error
                });
                throw error;
            }
            logger.info({
                event: 'emotional_trends_retrieved',
                trendCount: data.length
            });
            return data;
        }
        catch (error) {
            logger.error({
                event: 'get_emotional_trends_error',
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Find patterns across different contexts.
     */
    async findCrossContextPatterns(contextTypes, timeWindowHours = 24, similarityThreshold = 0.85) {
        logger.info({
            event: 'finding_cross_context_patterns',
            contextTypes,
            timeWindowHours,
            similarityThreshold,
            params: {
                context_types: contextTypes,
                time_window: `${timeWindowHours} hours`,
                similarity_threshold: similarityThreshold
            }
        });
        try {
            const { data, error } = await this.client
                .rpc('find_cross_context_patterns', {
                context_types: contextTypes,
                time_window: `${timeWindowHours} hours`,
                similarity_threshold: similarityThreshold
            });
            if (error) {
                logger.error({
                    event: 'find_cross_context_patterns_error',
                    error: {
                        code: error.code,
                        message: error.message,
                        details: error.details,
                        hint: error.hint,
                        query_params: {
                            context_types: contextTypes,
                            time_window: `${timeWindowHours} hours`,
                            similarity_threshold: similarityThreshold
                        }
                    }
                });
                throw error;
            }
            logger.info({
                event: 'cross_context_patterns_found',
                patternCount: data?.length ?? 0,
                firstPattern: data?.[0] ? {
                    pattern_id: data[0].pattern_id,
                    contexts: data[0].contexts,
                    combined_weight: data[0].combined_weight
                } : null
            });
            return data;
        }
        catch (error) {
            // Avoid double logging if we already logged the error above
            if (!(error instanceof Error && 'code' in error)) {
                logger.error({
                    event: 'find_cross_context_patterns_error',
                    error: error instanceof Error
                        ? {
                            name: error.name,
                            message: error.message,
                            stack: error.stack,
                            query_params: {
                                context_types: contextTypes,
                                time_window: `${timeWindowHours} hours`,
                                similarity_threshold: similarityThreshold
                            }
                        }
                        : {
                            type: typeof error,
                            value: JSON.stringify(error, null, 2),
                            query_params: {
                                context_types: contextTypes,
                                time_window: `${timeWindowHours} hours`,
                                similarity_threshold: similarityThreshold
                            }
                        }
                });
            }
            throw error;
        }
    }
    /**
     * Clean up old data while preserving important patterns.
     */
    async cleanupOldData(retentionDays = 30, minPatternWeight = 0.5) {
        logger.info({
            event: 'cleaning_up_old_data',
            retentionDays,
            minPatternWeight
        });
        try {
            const { error } = await this.client
                .rpc('cleanup_old_data', {
                retention_days: retentionDays,
                min_pattern_weight: minPatternWeight
            });
            if (error) {
                logger.error({
                    event: 'cleanup_old_data_error',
                    error: error.message,
                    details: error
                });
                throw error;
            }
            logger.info({
                event: 'old_data_cleaned'
            });
        }
        catch (error) {
            logger.error({
                event: 'cleanup_old_data_error',
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Map database fact format to application fact format.
     */
    mapDatabaseFactToFact(dbFact) {
        const fact = {
            id: dbFact.id,
            content: dbFact.content,
            source: dbFact.source,
            timestamp: new Date(dbFact.fact_timestamp),
            embedding: dbFact.embedding,
            emotionalImpact: dbFact.emotional_impact,
            weight: dbFact.weight,
            similarity: dbFact.similarity
        };
        logger.debug({
            event: 'mapped_database_fact',
            dbFact,
            mappedFact: fact
        });
        return fact;
    }
    /**
     * Load all patterns from the database.
     */
    async loadPatterns() {
        logger.debug({
            event: 'loading_patterns'
        });
        try {
            const { data, error } = await this.client
                .from('patterns')
                .select('*');
            if (error) {
                logger.error({
                    event: 'load_patterns_error',
                    error: error.message,
                    details: error
                });
                throw error;
            }
            const patterns = data.map(row => ({
                id: row.id,
                facts: row.facts,
                weight: row.weight,
                emotionalSignature: row.emotional_signature,
                lastAccessed: new Date(row.last_accessed)
            }));
            logger.info({
                event: 'patterns_loaded',
                count: patterns.length,
                patterns: patterns.map(p => ({
                    id: p.id,
                    factCount: p.facts.length,
                    weight: p.weight
                }))
            });
            return patterns;
        }
        catch (error) {
            logger.error({
                event: 'load_patterns_error',
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Store a new pattern or update an existing one.
     */
    async storePattern(pattern) {
        logger.debug({
            event: 'storing_pattern',
            pattern: {
                id: pattern.id,
                factCount: pattern.facts.length,
                weight: pattern.weight
            }
        });
        try {
            const { data, error } = await this.client
                .from('patterns')
                .upsert({
                id: pattern.id,
                facts: pattern.facts,
                weight: pattern.weight,
                emotional_signature: pattern.emotionalSignature,
                last_accessed: pattern.lastAccessed.toISOString()
            })
                .select()
                .single();
            if (error) {
                logger.error({
                    event: 'store_pattern_error',
                    error: error.message,
                    details: error
                });
                throw error;
            }
            const storedPattern = {
                id: data.id,
                facts: data.facts,
                weight: data.weight,
                emotionalSignature: data.emotional_signature,
                lastAccessed: new Date(data.last_accessed)
            };
            logger.info({
                event: 'pattern_stored',
                pattern: {
                    id: storedPattern.id,
                    factCount: storedPattern.facts.length,
                    weight: storedPattern.weight
                }
            });
            return storedPattern;
        }
        catch (error) {
            logger.error({
                event: 'store_pattern_error',
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Update an existing pattern.
     */
    async updatePattern(pattern) {
        logger.debug({
            event: 'updating_pattern',
            pattern: {
                id: pattern.id,
                factCount: pattern.facts.length,
                weight: pattern.weight
            }
        });
        try {
            const { error } = await this.client
                .from('patterns')
                .update({
                facts: pattern.facts,
                weight: pattern.weight,
                emotional_signature: pattern.emotionalSignature,
                last_accessed: pattern.lastAccessed.toISOString()
            })
                .eq('id', pattern.id);
            if (error) {
                logger.error({
                    event: 'update_pattern_error',
                    error: error.message,
                    details: error
                });
                throw error;
            }
            logger.info({
                event: 'pattern_updated',
                pattern: {
                    id: pattern.id,
                    factCount: pattern.facts.length,
                    weight: pattern.weight
                }
            });
        }
        catch (error) {
            logger.error({
                event: 'update_pattern_error',
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Find patterns that contain specific facts.
     */
    async findPatternsWithFacts(factIds) {
        logger.debug({
            event: 'finding_patterns_with_facts',
            factIds
        });
        try {
            const { data, error } = await this.client
                .from('patterns')
                .select('*')
                .contains('facts', factIds);
            if (error) {
                logger.error({
                    event: 'find_patterns_with_facts_error',
                    error: error.message,
                    details: error
                });
                throw error;
            }
            const patterns = data.map(row => ({
                id: row.id,
                facts: row.facts,
                weight: row.weight,
                emotionalSignature: row.emotional_signature,
                lastAccessed: new Date(row.last_accessed)
            }));
            logger.info({
                event: 'patterns_found',
                count: patterns.length,
                patterns: patterns.map(p => ({
                    id: p.id,
                    factCount: p.facts.length,
                    weight: p.weight
                }))
            });
            return patterns;
        }
        catch (error) {
            logger.error({
                event: 'find_patterns_with_facts_error',
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Get significant patterns ordered by weight.
     */
    async getSignificantPatterns(limit) {
        logger.debug({
            event: 'getting_significant_patterns',
            limit
        });
        try {
            const { data, error } = await this.client
                .from('patterns')
                .select('*')
                .order('weight', { ascending: false })
                .limit(limit);
            if (error) {
                logger.error({
                    event: 'get_significant_patterns_error',
                    error: error.message,
                    details: error
                });
                throw error;
            }
            const patterns = data.map(row => ({
                id: row.id,
                facts: row.facts,
                weight: row.weight,
                emotionalSignature: row.emotional_signature,
                lastAccessed: new Date(row.last_accessed)
            }));
            logger.info({
                event: 'significant_patterns_retrieved',
                count: patterns.length,
                patterns: patterns.map(p => ({
                    id: p.id,
                    factCount: p.facts.length,
                    weight: p.weight
                }))
            });
            return patterns;
        }
        catch (error) {
            logger.error({
                event: 'get_significant_patterns_error',
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Remove patterns by their IDs.
     */
    async removePatterns(patternIds) {
        logger.debug({
            event: 'removing_patterns',
            patternIds
        });
        try {
            const { error } = await this.client
                .from('patterns')
                .delete()
                .in('id', patternIds);
            if (error) {
                logger.error({
                    event: 'remove_patterns_error',
                    error: error.message,
                    details: error
                });
                throw error;
            }
            logger.info({
                event: 'patterns_removed',
                count: patternIds.length,
                patternIds
            });
        }
        catch (error) {
            logger.error({
                event: 'remove_patterns_error',
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Get a fact by ID.
     */
    async getFact(id) {
        logger.debug({
            event: 'getting_fact',
            id
        });
        try {
            const { data, error } = await this.client
                .from('facts')
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                logger.error({
                    event: 'get_fact_error',
                    error: error.message,
                    details: error
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
                    weight: fact.weight
                }
            });
            return fact;
        }
        catch (error) {
            logger.error({
                event: 'get_fact_error',
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=database.js.map