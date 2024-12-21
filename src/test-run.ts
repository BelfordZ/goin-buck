import { CognitiveSystem } from './index';
import { DatabaseService } from './services/database';
import { InsightService } from './services/insight';
import { loggers } from './utils/logger';

const logger = loggers.cognitive;

async function runTest() {
  logger.info({
    event: 'test_started',
    timestamp: new Date().toISOString()
  });

  const system = new CognitiveSystem();
  const insightService = new InsightService();

  try {
    // Process initial input
    const result = await system.processTextInput("The sky is blue today.");
    
    logger.info({
      event: 'initial_processing_complete',
      fact: {
        id: result.fact.id,
        content: result.fact.content,
        emotionalImpact: result.fact.emotionalImpact
      },
      relatedFactsCount: result.relatedFacts.length,
      emotionalState: result.emotionalState
    });

    // Generate insights
    const insights = await insightService.synthesizeInsights(result);
    
    logger.info({
      event: 'insights_generated',
      count: insights.length,
      insights: insights.map(insight => ({
        content: insight.fact.content,
        emotionalImpact: insight.emotionalImpact,
        confidence: insight.confidence,
        relatedPatternsCount: insight.relatedPatterns.length,
        crossContextPatternsCount: insight.crossContextPatterns.length
      }))
    });

    // Process a follow-up input that builds on the insights
    const followUpResult = await system.processTextInput(
      "The clear blue sky makes me feel peaceful and calm."
    );

    logger.info({
      event: 'follow_up_processing_complete',
      fact: {
        id: followUpResult.fact.id,
        content: followUpResult.fact.content,
        emotionalImpact: followUpResult.fact.emotionalImpact
      },
      relatedFactsCount: followUpResult.relatedFacts.length,
      emotionalState: followUpResult.emotionalState
    });

    // Generate insights for the follow-up
    const followUpInsights = await insightService.synthesizeInsights(followUpResult);
    
    logger.info({
      event: 'follow_up_insights_generated',
      count: followUpInsights.length,
      insights: followUpInsights.map(insight => ({
        content: insight.fact.content,
        emotionalImpact: insight.emotionalImpact,
        confidence: insight.confidence,
        relatedPatternsCount: insight.relatedPatterns.length,
        crossContextPatternsCount: insight.crossContextPatterns.length
      }))
    });

    // Analyze emotional progression
    const emotionalState = await system.getEmotionalState();
    
    logger.info({
      event: 'emotional_progression_analyzed',
      finalState: emotionalState,
      progression: {
        initial: result.emotionalState,
        afterInsights: insights[insights.length - 1]?.emotionalImpact,
        followUp: followUpResult.emotionalState,
        afterFollowUpInsights: followUpInsights[followUpInsights.length - 1]?.emotionalImpact
      }
    });

    // Clean up
    await system.cleanup();
    await insightService.cleanup();

    logger.info({
      event: 'test_completed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error({
      event: 'test_error',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

runTest().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
}); 