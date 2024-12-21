"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseEmotionalMemory = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const memory_1 = require("../interfaces/memory");
const config_1 = require("../config");
const supabase = (0, supabase_js_1.createClient)(config_1.config.supabase.url, config_1.config.supabase.key);
/**
 * Concrete implementation of emotional memory using Supabase
 */
class SupabaseEmotionalMemory extends memory_1.EmotionalMemory {
    constructor(name) {
        super(name);
        this.currentState = {
            joy: 0,
            calm: 0,
            anger: 0,
            sadness: 0
        };
    }
    async store(item) {
        if (!this.validateItem(item)) {
            throw new Error('Invalid item provided to store');
        }
        const state = item;
        await supabase.from('emotional_states').insert({
            id: Math.random().toString(36).substring(7),
            quadrant: state,
            intensity: this.calculateIntensity(state),
            timestamp: new Date(),
            source_facts: [], // Will be updated when processing facts
        });
    }
    async retrieve(id) {
        const { data, error } = await supabase
            .from('emotional_states')
            .select('*')
            .eq('id', id)
            .single();
        if (error)
            throw error;
        if (!data)
            return null;
        return {
            quadrant: data.quadrant,
            intensity: data.intensity,
            timestamp: new Date(data.timestamp),
            sourceFacts: data.source_facts,
        };
    }
    async update(id, item) {
        if (!this.validateItem(item)) {
            throw new Error('Invalid item provided to update');
        }
        const state = item;
        const { error } = await supabase
            .from('emotional_states')
            .update({
            quadrant: state,
            intensity: this.calculateIntensity(state),
            timestamp: new Date(),
        })
            .eq('id', id);
        if (error)
            throw error;
    }
    async delete(id) {
        const { error } = await supabase
            .from('emotional_states')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
    }
    async getCurrentState() {
        return { ...this.currentState };
    }
    async updateState(impact) {
        // Update current state
        this.currentState = {
            joy: this.clampValue(this.currentState.joy + impact.joy),
            calm: this.clampValue(this.currentState.calm + impact.calm),
            anger: this.clampValue(this.currentState.anger + impact.anger),
            sadness: this.clampValue(this.currentState.sadness + impact.sadness),
        };
        // Store state change
        await this.store(this.currentState);
    }
    async decayEmotions(rate) {
        this.currentState = {
            joy: this.currentState.joy * rate,
            calm: this.currentState.calm * rate,
            anger: this.currentState.anger * rate,
            sadness: this.currentState.sadness * rate,
        };
        await this.store(this.currentState);
    }
    async getEmotionalHistory(startTime, endTime) {
        const { data, error } = await supabase
            .from('emotional_states')
            .select('*')
            .gte('timestamp', startTime.toISOString())
            .lte('timestamp', endTime.toISOString())
            .order('timestamp', { ascending: true });
        if (error)
            throw error;
        return (data || []).map(row => row.quadrant);
    }
    calculateIntensity(state) {
        return Math.sqrt(state.joy ** 2 +
            state.calm ** 2 +
            state.anger ** 2 +
            state.sadness ** 2);
    }
    clampValue(value) {
        const { maxQuadrantValue, minQuadrantValue } = config_1.config.emotional;
        return Math.max(minQuadrantValue, Math.min(maxQuadrantValue, value));
    }
}
exports.SupabaseEmotionalMemory = SupabaseEmotionalMemory;
//# sourceMappingURL=emotional-memory.js.map