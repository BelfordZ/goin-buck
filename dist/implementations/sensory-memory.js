"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensoryContextMemory = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const memory_1 = require("../interfaces/memory");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const supabase = (0, supabase_js_1.createClient)(config_1.config.supabase.url, config_1.config.supabase.key);
const logger = logger_1.loggers.sensoryMemory;
/**
 * Concrete implementation of sensory memory
 */
class SensoryContextMemory extends memory_1.SensoryMemory {
    constructor(name, type, retentionTime = config_1.config.memory.contextRetentionHours * 60 * 60 * 1000) {
        super(name, type, retentionTime);
        this.retentionTime = retentionTime;
        this.recentInputs = [];
        this.lastCleanup = new Date();
        this.context = {
            type: type,
            recentFacts: [],
            contextualMemory: [],
            lastUpdated: new Date()
        };
        logger.info({
            event: 'initialized',
            name,
            config: {
                type,
                retentionTime
            }
        });
    }
    async store(item) {
        if (!this.validateItem(item)) {
            throw new Error('Invalid item provided to store');
        }
        const context = item;
        await supabase.from('context_history').insert({
            id: Math.random().toString(36).substring(7),
            context_type: context.type,
            recent_facts: context.recentFacts.map(f => f.id),
            contextual_memory: context.contextualMemory.map(f => f.id),
            emotional_state: null, // Will be linked when processing emotional state
            timestamp: new Date(),
            metrics: {
                hits: 0,
                misses: 0,
                evictions: 0,
                avg_access_time: 0
            }
        });
    }
    async retrieve(id) {
        const { data, error } = await supabase
            .from('context_history')
            .select('*, facts(*)')
            .eq('id', id)
            .single();
        if (error)
            throw error;
        if (!data)
            return null;
        // Convert stored fact IDs to actual facts
        const recentFacts = await this.getFactsFromIds(data.recent_facts);
        const contextualMemory = await this.getFactsFromIds(data.contextual_memory);
        return {
            type: data.context_type,
            recentFacts,
            contextualMemory,
            lastUpdated: new Date(data.timestamp)
        };
    }
    async update(id, item) {
        if (!this.validateItem(item)) {
            throw new Error('Invalid item provided to update');
        }
        const context = item;
        const { error } = await supabase
            .from('context_history')
            .update({
            recent_facts: context.recentFacts.map(f => f.id),
            contextual_memory: context.contextualMemory.map(f => f.id),
            timestamp: new Date(),
        })
            .eq('id', id);
        if (error)
            throw error;
    }
    async delete(id) {
        const { error } = await supabase
            .from('context_history')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
    }
    async addContext(context) {
        this.context = context;
        await this.store(context);
    }
    async getContext() {
        logger.debug({
            event: 'getting_context',
            contextState: {
                type: this.context.type,
                recentFactsCount: this.context.recentFacts.length,
                contextualMemoryCount: this.context.contextualMemory.length,
                lastUpdated: this.context.lastUpdated
            }
        });
        // Clean up expired facts
        await this.cleanExpiredFacts();
        return this.context;
    }
    async updateContext(fact) {
        logger.info({
            event: 'updating_context',
            fact: {
                id: fact.id,
                content: fact.content,
                emotionalImpact: fact.emotionalImpact,
                timestamp: fact.timestamp
            }
        });
        // Add to recent facts
        this.context.recentFacts.push(fact);
        // Update contextual memory based on emotional impact and relevance
        if (fact.weight > 0.5) {
            logger.debug({
                event: 'adding_to_contextual_memory',
                reason: 'high_weight',
                weight: fact.weight,
                fact: {
                    id: fact.id,
                    content: fact.content
                }
            });
            this.context.contextualMemory.push(fact);
        }
        this.context.lastUpdated = new Date();
        // Clean up expired facts
        await this.cleanExpiredFacts();
        logger.info({
            event: 'context_updated',
            newState: {
                recentFactsCount: this.context.recentFacts.length,
                contextualMemoryCount: this.context.contextualMemory.length,
                lastUpdated: this.context.lastUpdated
            }
        });
    }
    async clearContext() {
        logger.info({
            event: 'clearing_context',
            previousState: {
                recentFactsCount: this.context.recentFacts.length,
                contextualMemoryCount: this.context.contextualMemory.length,
                lastUpdated: this.context.lastUpdated
            }
        });
        this.context.recentFacts = [];
        this.context.contextualMemory = [];
        this.context.lastUpdated = new Date();
        logger.info({
            event: 'context_cleared'
        });
    }
    async getFactsFromIds(factIds) {
        if (!factIds.length)
            return [];
        const { data, error } = await supabase
            .from('facts')
            .select('*')
            .in('id', factIds);
        if (error)
            throw error;
        return (data || []).map(row => ({
            id: row.id,
            content: row.content,
            source: row.source,
            timestamp: new Date(row.timestamp),
            embedding: row.embedding,
            emotionalImpact: row.emotional_impact,
            weight: row.weight,
        }));
    }
    async cleanExpiredFacts() {
        const now = new Date().getTime();
        const beforeCounts = {
            recentFacts: this.context.recentFacts.length,
            contextualMemory: this.context.contextualMemory.length
        };
        // Filter out expired facts
        this.context.recentFacts = this.context.recentFacts.filter(fact => {
            const age = now - fact.timestamp.getTime();
            const keep = age < this.retentionTime;
            if (!keep) {
                logger.debug({
                    event: 'fact_expired',
                    fact: {
                        id: fact.id,
                        content: fact.content,
                        age: Math.round(age / 1000) + 's'
                    }
                });
            }
            return keep;
        });
        this.context.contextualMemory = this.context.contextualMemory.filter(fact => {
            const age = now - fact.timestamp.getTime();
            const keep = age < this.retentionTime * 2; // Contextual memory lasts longer
            if (!keep) {
                logger.debug({
                    event: 'contextual_memory_expired',
                    fact: {
                        id: fact.id,
                        content: fact.content,
                        age: Math.round(age / 1000) + 's'
                    }
                });
            }
            return keep;
        });
        const afterCounts = {
            recentFacts: this.context.recentFacts.length,
            contextualMemory: this.context.contextualMemory.length
        };
        if (beforeCounts.recentFacts !== afterCounts.recentFacts ||
            beforeCounts.contextualMemory !== afterCounts.contextualMemory) {
            logger.info({
                event: 'cleanup_completed',
                removed: {
                    recentFacts: beforeCounts.recentFacts - afterCounts.recentFacts,
                    contextualMemory: beforeCounts.contextualMemory - afterCounts.contextualMemory
                },
                remaining: afterCounts
            });
        }
    }
}
exports.SensoryContextMemory = SensoryContextMemory;
//# sourceMappingURL=sensory-memory.js.map