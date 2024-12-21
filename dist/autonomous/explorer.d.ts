import { EmotionalQuadrant } from '../types';
export declare class AutonomousExplorer {
    private dbService;
    private emotionalService;
    private longTermMemory;
    private sensoryMemory;
    private maxExplorationDepth;
    private explorationState;
    constructor(maxExplorationDepth?: number, initialEmotionalState?: EmotionalQuadrant);
    explore(topLevelGoal: string): Promise<void>;
    private exploreRecursively;
    private generateInsights;
    private generateSubGoals;
    private analyzeEmotionalImpact;
    private calculateInsightWeight;
    private calculateEmotionalResonance;
    private calculateNovelty;
    private calculateGoalPriority;
    private prioritizeSubGoals;
    private updateEmotionalState;
    private findInsightPatterns;
    private storeInsight;
}
