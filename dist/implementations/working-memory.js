"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LRUWorkingMemory = void 0;
const memory_1 = require("../interfaces/memory");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const logger = logger_1.loggers.workingMemory;
/**
 * Concrete implementation of working memory using LRU cache behavior
 */
class LRUWorkingMemory extends memory_1.WorkingMemory {
    constructor(name, capacity = config_1.config.memory.contextRetentionSize, evictionStrategy = 'lru', evictionThreshold = 0.5) {
        super(name, capacity, evictionStrategy, evictionThreshold);
        this.factMap = new Map();
        this.factBuffer = {
            facts: [],
            lastProcessed: new Date(),
            capacity,
            maxSize: capacity,
            evictionStrategy,
            evictionThreshold
        };
        logger.info({
            event: 'initialized',
            name,
            config: {
                capacity,
                evictionStrategy,
                evictionThreshold
            }
        });
    }
    async store(item) {
        logger.debug({
            event: 'storing_item',
            item: {
                id: item.id,
                content: item.content,
                weight: item.weight
            }
        });
        if (!this.validateItem(item)) {
            logger.error({
                event: 'invalid_item',
                item
            });
            throw new Error('Invalid item provided to store');
        }
        const fact = item;
        await this.addFact(fact);
    }
    async retrieve(id) {
        logger.debug({
            event: 'retrieving_fact',
            id
        });
        const startTime = Date.now();
        const fact = this.factMap.get(id);
        const isHit = !!fact;
        this.updateMetrics(Date.now() - startTime, isHit);
        logger.debug({
            event: 'retrieval_result',
            success: isHit,
            fact: isHit ? {
                id: fact.id,
                content: fact.content,
                weight: fact.weight
            } : null
        });
        return fact;
    }
    async update(id, item) {
        logger.debug({
            event: 'updating_fact',
            id,
            newData: {
                content: item.content,
                weight: item.weight
            }
        });
        if (!this.validateItem(item)) {
            logger.error({
                event: 'invalid_update_item',
                item
            });
            throw new Error('Invalid item provided to update');
        }
        const fact = item;
        const startTime = Date.now();
        if (this.factMap.has(id)) {
            const oldFact = this.factMap.get(id);
            this.factMap.set(id, fact);
            // Update fact in buffer while maintaining order
            const index = this.factBuffer.facts.findIndex(f => f.id === id);
            if (index !== -1) {
                this.factBuffer.facts[index] = fact;
                // Move to front if using LRU
                if (this.evictionStrategy === 'lru') {
                    this.factBuffer.facts.splice(index, 1);
                    this.factBuffer.facts.push(fact);
                }
            }
            this.updateMetrics(Date.now() - startTime, true);
            logger.info({
                event: 'fact_updated',
                id,
                changes: {
                    old: {
                        content: oldFact?.content,
                        weight: oldFact?.weight
                    },
                    new: {
                        content: fact.content,
                        weight: fact.weight
                    }
                }
            });
        }
        else {
            this.updateMetrics(Date.now() - startTime, false);
            logger.error({
                event: 'fact_not_found',
                id
            });
            throw new Error(`Fact with id ${id} not found`);
        }
    }
    async delete(id) {
        logger.debug({
            event: 'deleting_fact',
            id
        });
        const startTime = Date.now();
        const fact = this.factMap.get(id);
        const isHit = this.factMap.delete(id);
        this.factBuffer.facts = this.factBuffer.facts.filter(f => f.id !== id);
        this.updateMetrics(Date.now() - startTime, isHit);
        logger.info({
            event: 'deletion_result',
            success: isHit,
            deletedFact: isHit ? {
                content: fact?.content,
                weight: fact?.weight
            } : null
        });
    }
    async addFact(fact) {
        logger.debug({
            event: 'adding_fact',
            fact: {
                id: fact.id,
                content: fact.content,
                weight: fact.weight
            }
        });
        const startTime = Date.now();
        // Check if eviction is needed
        if (this.factBuffer.facts.length >= this.factBuffer.maxSize) {
            logger.info({
                event: 'buffer_full',
                state: {
                    size: this.factBuffer.facts.length,
                    maxSize: this.factBuffer.maxSize,
                    strategy: this.evictionStrategy
                }
            });
            if (this.evictionStrategy === 'lru') {
                await this.evictOldest();
            }
            else {
                await this.evictByWeight();
            }
        }
        // Add new fact
        this.factMap.set(fact.id, fact);
        this.factBuffer.facts.push(fact);
        this.factBuffer.lastProcessed = new Date();
        this.updateMetrics(Date.now() - startTime, true);
        logger.info({
            event: 'fact_added',
            newState: {
                size: this.factBuffer.facts.length,
                facts: this.factBuffer.facts.map(f => ({
                    id: f.id,
                    content: f.content,
                    weight: f.weight
                }))
            }
        });
    }
    getFacts() {
        const facts = [...this.factBuffer.facts];
        logger.debug({
            event: 'getting_facts',
            state: {
                count: facts.length,
                facts: facts.map(f => ({
                    id: f.id,
                    content: f.content,
                    weight: f.weight
                }))
            }
        });
        return facts;
    }
    async evictOldest() {
        logger.debug({
            event: 'evicting_oldest'
        });
        if (this.factBuffer.facts.length > 0) {
            const evicted = this.factBuffer.facts.shift();
            if (evicted) {
                this.factMap.delete(evicted.id);
                this.metrics.evictions++;
                logger.info({
                    event: 'fact_evicted',
                    evictedFact: {
                        id: evicted.id,
                        content: evicted.content,
                        weight: evicted.weight
                    }
                });
            }
        }
    }
    async evictByWeight() {
        logger.debug({
            event: 'evicting_by_weight'
        });
        if (this.factBuffer.facts.length > 0) {
            // Find fact with lowest weight
            let minWeightIndex = 0;
            for (let i = 1; i < this.factBuffer.facts.length; i++) {
                if (this.factBuffer.facts[i].weight < this.factBuffer.facts[minWeightIndex].weight) {
                    minWeightIndex = i;
                }
            }
            // Evict fact with lowest weight
            const evicted = this.factBuffer.facts.splice(minWeightIndex, 1)[0];
            this.factMap.delete(evicted.id);
            this.metrics.evictions++;
            logger.info({
                event: 'fact_evicted',
                evictedFact: {
                    id: evicted.id,
                    content: evicted.content,
                    weight: evicted.weight
                }
            });
        }
    }
    async clear() {
        logger.info({
            event: 'clearing_memory',
            previousState: {
                factCount: this.factBuffer.facts.length,
                facts: this.factBuffer.facts.map(f => ({
                    id: f.id,
                    content: f.content,
                    weight: f.weight
                }))
            }
        });
        this.factMap.clear();
        this.factBuffer.facts = [];
        this.factBuffer.lastProcessed = new Date();
        logger.info({
            event: 'memory_cleared'
        });
    }
    async getSampleByWeight(sampleSize = 5) {
        logger.debug({
            event: 'getting_sample',
            params: {
                requestedSize: sampleSize,
                totalFacts: this.factBuffer.facts.length
            }
        });
        // Sort facts by weight in descending order
        const sortedFacts = [...this.factBuffer.facts].sort((a, b) => b.weight - a.weight);
        const sample = sortedFacts.slice(0, sampleSize);
        logger.debug({
            event: 'sample_selected',
            result: {
                sampleSize: sample.length,
                facts: sample.map(f => ({
                    id: f.id,
                    content: f.content,
                    weight: f.weight
                }))
            }
        });
        return sample;
    }
    async consolidate() {
        logger.info({
            event: 'consolidating_memory',
            beforeState: {
                factCount: this.factBuffer.facts.length,
                weights: this.factBuffer.facts.map(f => f.weight)
            }
        });
        // Normalize weights across all facts
        const facts = this.factBuffer.facts;
        const maxWeight = Math.max(...facts.map(f => f.weight));
        if (maxWeight > 0) {
            facts.forEach(fact => {
                const oldWeight = fact.weight;
                fact.weight = fact.weight / maxWeight;
                this.factMap.set(fact.id, fact);
                logger.debug({
                    event: 'normalized_weight',
                    fact: {
                        id: fact.id,
                        content: fact.content,
                        oldWeight,
                        newWeight: fact.weight
                    }
                });
            });
        }
        logger.info({
            event: 'consolidation_complete',
            afterState: {
                factCount: facts.length,
                weights: facts.map(f => f.weight)
            }
        });
    }
}
exports.LRUWorkingMemory = LRUWorkingMemory;
//# sourceMappingURL=working-memory.js.map