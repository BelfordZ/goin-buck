export declare const config: {
    readonly openai: {
        readonly apiKey: string;
        readonly model: "gpt-3.5-turbo";
        readonly embeddingModel: "text-embedding-ada-002";
    };
    readonly supabase: {
        readonly url: string;
        readonly key: string;
    };
    readonly memory: {
        readonly shortTermRetentionHours: 24;
        readonly longTermRetentionHours: 72;
        readonly sleepCycleFactCount: 10;
        readonly emotionalDecayRate: 0.1;
        readonly similarityThreshold: 0.85;
        readonly patternThreshold: 0.6;
        readonly weightIncrement: 0.1;
        readonly contextThreshold: 0.5;
        readonly contextRetentionSize: 10;
        readonly contextRetentionHours: 24;
    };
    readonly emotional: {
        readonly maxQuadrantValue: 1;
        readonly minQuadrantValue: -1;
        readonly neutralThreshold: 0.1;
    };
};
