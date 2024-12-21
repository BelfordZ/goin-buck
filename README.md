3. Copy `.env.example` to `.env` and fill in your API keys:
```bash
cp .env.example .env
```

4. Compile TypeScript:
```bash
npx tsc
```

## Usage

Run the example:
```bash
node dist/index.js
```

Or import the `CognitiveSystem` class in your own code:

```typescript
import { CognitiveSystem } from './dist';

const system = new CognitiveSystem();

// Start the sleep cycle (runs every 24 hours by default)
system.startSleepCycle();

// Process some input
await system.processTextInput("Your text input here");

// Stop the sleep cycle when done
system.stopSleepCycle();
```

## Architecture

The system consists of several key components:

1. **Input Processing**: Uses OpenAI's GPT-4 to extract facts from text input
2. **Emotional State**: Tracks emotional state using pleasure, arousal, and dominance dimensions
3. **Memory Management**: 
   - Short-term memory: In-memory storage of recent facts
   - Long-term memory: Supabase with pgvector for persistent storage and similarity search
4. **Sleep Cycle**: Periodic consolidation of memories and emotional decay

## Limitations

- Currently only supports text input
- Simple pattern recognition
- Basic emotional modeling
- No complex memory consolidation strategies

## Future Improvements

- Add support for image input
- Implement more sophisticated pattern recognition
- Add more complex memory consolidation strategies
- Improve emotional modeling
- Add support for multiple parallel input streams 