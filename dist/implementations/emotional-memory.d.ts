import { EmotionalMemory } from '../interfaces/memory';
import { EmotionalQuadrant } from '../types';
/**
 * Concrete implementation of emotional memory using Supabase
 */
export declare class SupabaseEmotionalMemory extends EmotionalMemory {
    private currentState;
    constructor(name: string);
    store(item: any): Promise<void>;
    retrieve(id: string): Promise<any>;
    update(id: string, item: any): Promise<void>;
    delete(id: string): Promise<void>;
    getCurrentState(): Promise<EmotionalQuadrant>;
    updateState(impact: EmotionalQuadrant): Promise<void>;
    decayEmotions(rate: number): Promise<void>;
    getEmotionalHistory(startTime: Date, endTime: Date): Promise<EmotionalQuadrant[]>;
    private calculateIntensity;
    private clampValue;
}
