"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmotionalMemory = exports.SensoryMemory = exports.LongTermMemory = exports.WorkingMemory = exports.BaseMemory = void 0;
/**
 * Abstract base class for memory implementations
 */
class BaseMemory {
    constructor(name) {
        this.name = name;
        this.lastAccessed = new Date();
    }
    updateAccessTime() {
        this.lastAccessed = new Date();
    }
    validateItem(item) {
        return item !== null && item !== undefined;
    }
    getLastAccessTime() {
        return this.lastAccessed;
    }
}
exports.BaseMemory = BaseMemory;
/**
 * Abstract working memory implementation
 */
class WorkingMemory extends BaseMemory {
    constructor(name, capacity, evictionStrategy = 'lru', evictionThreshold = 0.5) {
        super(name);
        this.capacity = capacity;
        this.evictionStrategy = evictionStrategy;
        this.evictionThreshold = evictionThreshold;
        this.metrics = {
            hits: 0,
            misses: 0,
            evictions: 0,
            avgAccessTime: 0,
            lastUpdated: new Date()
        };
    }
    getMetrics() {
        return { ...this.metrics };
    }
    updateMetrics(accessTime, isHit) {
        if (isHit) {
            this.metrics.hits++;
        }
        else {
            this.metrics.misses++;
        }
        this.metrics.avgAccessTime =
            (this.metrics.avgAccessTime * (this.metrics.hits + this.metrics.misses - 1) + accessTime) /
                (this.metrics.hits + this.metrics.misses);
        this.metrics.lastUpdated = new Date();
    }
}
exports.WorkingMemory = WorkingMemory;
/**
 * Abstract long-term memory implementation
 */
class LongTermMemory extends BaseMemory {
}
exports.LongTermMemory = LongTermMemory;
/**
 * Abstract sensory memory implementation
 */
class SensoryMemory extends BaseMemory {
    constructor(name, type, retentionTime) {
        super(name);
        this.type = type;
        this.retentionTime = retentionTime;
    }
}
exports.SensoryMemory = SensoryMemory;
/**
 * Abstract emotional memory implementation
 */
class EmotionalMemory extends BaseMemory {
}
exports.EmotionalMemory = EmotionalMemory;
//# sourceMappingURL=memory.js.map