import OpenAI from 'openai';
import { config } from '../config';
import { Fact, SensoryContext, EmotionalQuadrant } from '../types';
import { loggers } from '../utils/logger';

const logger = loggers.openai;

logger.debug(`OpenAI API key: ${config.openai.apiKey ? '(set)' : '(not set)'}`);
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

function logRequest(type: string, messages: any[], model: string) {
  logger.debug({
    event: 'request',
    type,
    model,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content.substring(0, 100) + (m.content.length > 100 ? '...' : '')
    }))
  });
}

function logResponse(type: string, response: any, parsed: any) {
  logger.debug({
    event: 'response',
    type,
    raw: response?.content,
    parsed
  });
}

export async function extractFactFromText(text: string, context?: SensoryContext): Promise<Omit<Fact, 'id' | 'embedding' | 'weight'>> {
  const contextPrompt = context ? `
    Previous context:
    ${context.recentFacts.map((fact: Fact) => fact.content).join('\n')}
  ` : '';

  logger.info({
    event: 'extracting_fact',
    input: text,
    context: contextPrompt || '(none)'
  });

  try {
    if (!config.openai.apiKey) {
      logger.warn({
        event: 'no_api_key',
        action: 'returning_neutral_response'
      });
      return {
        content: text,
        source: 'read-text' as const,
        timestamp: new Date(),
        emotionalImpact: {
          joy: 0,
          calm: 0,
          anger: 0,
          sadness: 0
        }
      };
    }

    const messages = [
      {
        role: 'system' as const,
        content: `You are a fact extractor. Extract facts from the given text and return them in JSON format.
Your response must be a valid JSON object with exactly this format:
{
  "content": "the extracted fact as a string",
  "emotionalImpact": {
    "joy": <number between -1 and 1>,
    "calm": <number between -1 and 1>,
    "anger": <number between -1 and 1>,
    "sadness": <number between -1 and 1>
  }
}
Example: {"content": "The sun is shining", "emotionalImpact": {"joy": 0.8, "calm": 0.5, "anger": -0.2, "sadness": -0.3}}`
      },
      {
        role: 'user' as const,
        content: `${contextPrompt}\nText to analyze: ${text}`
      }
    ];

    logRequest('Fact Extraction', messages, config.openai.model);

    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    let result;
    try {
      result = JSON.parse(response.choices[0].message.content || '{}');
      logResponse('Fact Extraction', response.choices[0].message, result);
    } catch (e) {
      logger.error({
        event: 'parse_error',
        error: e instanceof Error ? e.message : String(e),
        content: response.choices[0].message.content
      });
      result = {
        content: text,
        emotionalImpact: {
          joy: 0,
          calm: 0,
          anger: 0,
          sadness: 0
        }
      };
    }
  
    const fact = {
      content: result.content || text,
      source: 'read-text' as const,
      timestamp: new Date(),
      emotionalImpact: result.emotionalImpact || {
        joy: 0,
        calm: 0,
        anger: 0,
        sadness: 0
      }
    };

    logger.info({
      event: 'fact_extracted',
      fact
    });

    return fact;
  } catch (error: any) {
    logger.error({
      event: 'extraction_error',
      error: error.message || String(error)
    });
    return {
      content: text,
      source: 'read-text' as const,
      timestamp: new Date(),
      emotionalImpact: {
        joy: 0,
        calm: 0,
        anger: 0,
        sadness: 0
      }
    };
  }
}

export async function analyzeEmotionalQuadrant(content: string): Promise<EmotionalQuadrant> {
  logger.info({
    event: 'analyzing_emotions',
    input: content
  });

  try {
    if (!config.openai.apiKey) {
      logger.warn({
        event: 'no_api_key',
        action: 'returning_neutral_state'
      });
      return {
        joy: 0,
        calm: 0,
        anger: 0,
        sadness: 0
      };
    }

    const messages = [
      {
        role: 'system' as const,
        content: `Analyze the emotional content of the text and return a JSON object with numeric values between -1 and 1.
Your response must be a valid JSON object with exactly this format:
{
  "joy": <number between -1 and 1>,
  "calm": <number between -1 and 1>,
  "anger": <number between -1 and 1>,
  "sadness": <number between -1 and 1>
}
Example: {"joy": 0.8, "calm": 0.5, "anger": -0.2, "sadness": -0.3}`
      },
      {
        role: 'user' as const,
        content
      }
    ];

    logRequest('Emotion Analysis', messages, config.openai.model);

    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    let result;
    try {
      result = JSON.parse(response.choices[0].message.content || '{}');
      logResponse('Emotion Analysis', response.choices[0].message, result);
      
      // Ensure all values are numbers
      const emotions = ['joy', 'calm', 'anger', 'sadness'];
      for (const emotion of emotions) {
        if (typeof result[emotion] !== 'number') {
          logger.warn({
            event: 'invalid_emotion_value',
            emotion,
            value: result[emotion],
            action: 'setting_to_zero'
          });
          result[emotion] = 0;
        }
      }
    } catch (e) {
      logger.error({
        event: 'parse_error',
        error: e instanceof Error ? e.message : String(e),
        content: response.choices[0].message.content
      });
      result = {
        joy: 0,
        calm: 0,
        anger: 0,
        sadness: 0
      };
    }

    // Ensure values are within -1 to 1 range
    const clamp = (n: number) => Math.max(-1, Math.min(1, n));
    const finalResult = {
      joy: clamp(result.joy || 0),
      calm: clamp(result.calm || 0),
      anger: clamp(result.anger || 0),
      sadness: clamp(result.sadness || 0)
    };

    logger.info({
      event: 'emotion_analysis_complete',
      result: finalResult
    });

    return finalResult;
  } catch (error: any) {
    logger.error({
      event: 'analysis_error',
      error: error.message || String(error)
    });
    return {
      joy: 0,
      calm: 0,
      anger: 0,
      sadness: 0
    };
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  logger.info({
    event: 'generating_embedding',
    input: text.substring(0, 100) + (text.length > 100 ? '...' : '')
  });

  try {
    if (!config.openai.apiKey) {
      logger.warn({
        event: 'no_api_key',
        action: 'returning_zero_vector'
      });
      return new Array(1536).fill(0);
    }

    logger.debug({
      event: 'embedding_request',
      model: config.openai.embeddingModel,
      input: text.substring(0, 100) + (text.length > 100 ? '...' : '')
    });

    const response = await openai.embeddings.create({
      model: config.openai.embeddingModel,
      input: text,
    });

    logger.debug({
      event: 'embedding_response',
      model: response.model,
      dimensions: response.data[0].embedding.length
    });

    return response.data[0].embedding;
  } catch (error: any) {
    logger.error({
      event: 'embedding_error',
      error: error.message || String(error)
    });
    return new Array(1536).fill(0);
  }
}

export async function generateText(prompt: string, model: string = config.openai.model): Promise<string> {
  logger.info({
    event: 'generating_text',
    prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
    model
  });

  try {
    if (!config.openai.apiKey) {
      logger.warn({
        event: 'no_api_key',
        action: 'returning_empty_response'
      });
      return '';
    }

    const messages = [
      {
        role: 'user' as const,
        content: prompt
      }
    ];

    logRequest('Text Generation', messages, model);

    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
    });

    const generatedText = response.choices[0].message.content || '';
    
    logResponse('Text Generation', response.choices[0].message, generatedText);

    return generatedText;
  } catch (error: any) {
    logger.error({
      event: 'generation_error',
      error: error.message || String(error)
    });
    return '';
  }
} 