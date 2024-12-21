import { createClient } from '@supabase/supabase-js';
import { EmotionalMemory } from '../interfaces/memory';
import { EmotionalQuadrant } from '../types';
import { config } from '../config';

const supabase = createClient(config.supabase.url, config.supabase.key);

/**
 * Concrete implementation of emotional memory using Supabase
 */
export class SupabaseEmotionalMemory extends EmotionalMemory {
  private currentState: EmotionalQuadrant;

  constructor(name: string) {
    super(name);
    this.currentState = {
      joy: 0,
      calm: 0,
      anger: 0,
      sadness: 0
    };
  }

  async store(item: any): Promise<void> {
    if (!this.validateItem(item)) {
      throw new Error('Invalid item provided to store');
    }
    const state = item as EmotionalQuadrant;
    
    await supabase.from('emotional_states').insert({
      id: Math.random().toString(36).substring(7),
      quadrant: state,
      intensity: this.calculateIntensity(state),
      timestamp: new Date(),
      source_facts: [], // Will be updated when processing facts
    });
  }

  async retrieve(id: string): Promise<any> {
    const { data, error } = await supabase
      .from('emotional_states')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return {
      quadrant: data.quadrant,
      intensity: data.intensity,
      timestamp: new Date(data.timestamp),
      sourceFacts: data.source_facts,
    };
  }

  async update(id: string, item: any): Promise<void> {
    if (!this.validateItem(item)) {
      throw new Error('Invalid item provided to update');
    }
    const state = item as EmotionalQuadrant;

    const { error } = await supabase
      .from('emotional_states')
      .update({
        quadrant: state,
        intensity: this.calculateIntensity(state),
        timestamp: new Date(),
      })
      .eq('id', id);

    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('emotional_states')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getCurrentState(): Promise<EmotionalQuadrant> {
    return { ...this.currentState };
  }

  async updateState(impact: EmotionalQuadrant): Promise<void> {
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

  async decayEmotions(rate: number): Promise<void> {
    this.currentState = {
      joy: this.currentState.joy * rate,
      calm: this.currentState.calm * rate,
      anger: this.currentState.anger * rate,
      sadness: this.currentState.sadness * rate,
    };

    await this.store(this.currentState);
  }

  async getEmotionalHistory(startTime: Date, endTime: Date): Promise<EmotionalQuadrant[]> {
    const { data, error } = await supabase
      .from('emotional_states')
      .select('*')
      .gte('timestamp', startTime.toISOString())
      .lte('timestamp', endTime.toISOString())
      .order('timestamp', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => row.quadrant);
  }

  private calculateIntensity(state: EmotionalQuadrant): number {
    return Math.sqrt(
      state.joy ** 2 +
      state.calm ** 2 +
      state.anger ** 2 +
      state.sadness ** 2
    );
  }

  private clampValue(value: number): number {
    const { maxQuadrantValue, minQuadrantValue } = config.emotional;
    return Math.max(minQuadrantValue, Math.min(maxQuadrantValue, value));
  }
} 