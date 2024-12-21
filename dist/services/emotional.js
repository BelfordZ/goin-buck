"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmotionalService = void 0;
const openai_1 = require("./openai");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const logger = logger_1.loggers.emotionalMemory;
/**
 * Handles emotional state processing, analysis, and persistence.
 * Maintains emotional state and provides analysis of emotional trends.
 */
class EmotionalService {
    constructor(dbService) {
        this.dbService = dbService;
        this.currentState = {
            quadrant: {
                joy: 0,
                calm: 0,
                anger: 0,
                sadness: 0
            },
            lastUpdated: new Date(),
            intensity: 0
        };
        logger.info({
            event: 'initialized',
            initialState: this.currentState
        });
    }
    /**
     * Process a fact and update emotional state.
     */
    async processFact(fact) {
        logger.info({
            event: 'processing_fact',
            fact: {
                id: fact.id,
                content: fact.content,
                emotionalImpact: fact.emotionalImpact
            }
        });
        logger.debug({
            event: 'current_state',
            state: this.currentState
        });
        // Get emotional impact from fact or analyze if not present
        const emotionalImpact = fact.emotionalImpact ||
            await (0, openai_1.analyzeEmotionalQuadrant)(fact.content);
        logger.debug({
            event: 'emotional_impact',
            impact: emotionalImpact
        });
        // Update current state
        const newState = this.calculateNewState(emotionalImpact);
        logger.debug({
            event: 'new_state_calculated',
            state: newState
        });
        // Store state update and get trends
        const { stateId, trends } = await this.dbService.updateEmotionalState(newState.quadrant, newState.intensity, [fact.id], config_1.config.memory.shortTermRetentionHours);
        // Update current state
        this.currentState = {
            ...newState,
            lastUpdated: new Date()
        };
        logger.info({
            event: 'state_updated',
            previousState: this.currentState,
            newState,
            trends
        });
        const confidence = this.calculateConfidence(emotionalImpact);
        logger.debug({
            event: 'confidence_calculated',
            confidence
        });
        return {
            previousState: this.currentState,
            newState,
            trends,
            stateId,
            confidence
        };
    }
    /**
     * Process multiple facts and analyze aggregate emotional impact.
     */
    async processFacts(facts) {
        logger.info({
            event: 'processing_multiple_facts',
            factCount: facts.length,
            facts: facts.map(f => ({
                id: f.id,
                content: f.content,
                emotionalImpact: f.emotionalImpact
            }))
        });
        logger.debug({
            event: 'current_state',
            state: this.currentState
        });
        // Get emotional impacts
        const impacts = await Promise.all(facts.map(f => f.emotionalImpact || (0, openai_1.analyzeEmotionalQuadrant)(f.content)));
        logger.debug({
            event: 'individual_impacts',
            impacts
        });
        // Calculate aggregate impact
        const aggregateImpact = this.calculateAggregateImpact(impacts);
        logger.debug({
            event: 'aggregate_impact',
            impact: aggregateImpact
        });
        // Update state with aggregate impact
        const newState = this.calculateNewState(aggregateImpact);
        logger.debug({
            event: 'new_state_calculated',
            state: newState
        });
        // Store state update and get trends
        const { stateId, trends } = await this.dbService.updateEmotionalState(newState.quadrant, newState.intensity, facts.map(f => f.id), config_1.config.memory.shortTermRetentionHours);
        // Update current state
        this.currentState = {
            ...newState,
            lastUpdated: new Date()
        };
        logger.info({
            event: 'state_updated',
            previousState: this.currentState,
            newState,
            trends
        });
        const confidence = this.calculateConfidence(aggregateImpact);
        logger.debug({
            event: 'confidence_calculated',
            confidence
        });
        return {
            previousState: this.currentState,
            newState,
            trends,
            stateId,
            confidence
        };
    }
    /**
     * Get emotional trends for a specific time period and context.
     */
    async getEmotionalTrends(startTime, endTime, contextType) {
        logger.info({
            event: 'getting_trends',
            startTime,
            endTime,
            contextType
        });
        const trends = await this.dbService.getEmotionalTrends(startTime, endTime, contextType);
        logger.debug({
            event: 'trends_retrieved',
            trendCount: trends.length,
            trends
        });
        return trends;
    }
    /**
     * Apply emotional decay during sleep cycles.
     */
    async applyEmotionalDecay(decayRate = config_1.config.memory.emotionalDecayRate) {
        logger.info({
            event: 'applying_decay',
            decayRate,
            currentState: this.currentState
        });
        const decayedQuadrant = {
            joy: this.currentState.quadrant.joy * (1 - decayRate),
            calm: this.currentState.quadrant.calm * (1 - decayRate),
            anger: this.currentState.quadrant.anger * (1 - decayRate),
            sadness: this.currentState.quadrant.sadness * (1 - decayRate)
        };
        const newState = this.calculateNewState(decayedQuadrant);
        this.currentState = {
            ...newState,
            lastUpdated: new Date()
        };
        logger.info({
            event: 'decay_applied',
            newState: this.currentState
        });
        return this.currentState;
    }
    /**
     * Calculate new emotional state based on impact.
     */
    calculateNewState(impact) {
        const newQuadrant = {
            joy: this.clampValue(this.currentState.quadrant.joy + impact.joy),
            calm: this.clampValue(this.currentState.quadrant.calm + impact.calm),
            anger: this.clampValue(this.currentState.quadrant.anger + impact.anger),
            sadness: this.clampValue(this.currentState.quadrant.sadness + impact.sadness)
        };
        const state = {
            quadrant: newQuadrant,
            intensity: this.calculateIntensity(newQuadrant),
            lastUpdated: new Date()
        };
        logger.debug({
            event: 'state_calculation',
            impact,
            result: state
        });
        return state;
    }
    /**
     * Calculate emotional intensity from quadrant values.
     */
    calculateIntensity(quadrant) {
        const intensity = Math.sqrt(Math.pow(quadrant.joy, 2) +
            Math.pow(quadrant.calm, 2) +
            Math.pow(quadrant.anger, 2) +
            Math.pow(quadrant.sadness, 2));
        logger.debug({
            event: 'intensity_calculation',
            quadrant,
            intensity
        });
        return intensity;
    }
    /**
     * Calculate aggregate emotional impact from multiple impacts.
     */
    calculateAggregateImpact(impacts) {
        const sum = impacts.reduce((acc, impact) => ({
            joy: acc.joy + impact.joy,
            calm: acc.calm + impact.calm,
            anger: acc.anger + impact.anger,
            sadness: acc.sadness + impact.sadness
        }), { joy: 0, calm: 0, anger: 0, sadness: 0 });
        const count = impacts.length;
        const result = {
            joy: sum.joy / count,
            calm: sum.calm / count,
            anger: sum.anger / count,
            sadness: sum.sadness / count
        };
        logger.debug({
            event: 'aggregate_calculation',
            impacts,
            result
        });
        return result;
    }
    /**
     * Calculate confidence in emotional analysis.
     */
    calculateConfidence(impact) {
        // Higher intensity generally means higher confidence
        const intensity = this.calculateIntensity(impact);
        // Scale confidence based on intensity, but keep it between 0.5 and 1.0
        const confidence = 0.5 + Math.min(0.5, intensity);
        logger.debug({
            event: 'confidence_calculation',
            impact,
            intensity,
            confidence
        });
        return confidence;
    }
    /**
     * Ensure emotional values stay within bounds (-1 to 1).
     */
    clampValue(value) {
        const clamped = Math.max(-1, Math.min(1, value));
        if (clamped !== value) {
            logger.debug({
                event: 'value_clamped',
                original: value,
                clamped
            });
        }
        return clamped;
    }
}
exports.EmotionalService = EmotionalService;
//# sourceMappingURL=emotional.js.map