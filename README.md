# Nodejs Multi-threading Pool

A powerful and flexible thread pool implementation for Node.js using TypeScript. This library provides an easy-to-use interface for parallel processing, with built-in performance monitoring and error handling.

## Features

- 🚀 Automatic thread pool management
- 📊 Built-in performance metrics
- 🛡️ Comprehensive error handling
- 💾 Memory usage monitoring
- ⚡ Task timeout support
- 🔄 Worker auto-recovery
- 📈 Real-time health checks

## Installation

```bash
# Create a new project
mkdir my-thread-pool-project
cd my-thread-pool-project

# Initialize npm project
npm init -y

# Install dependencies
npm install typescript @types/node ts-node nodemon rimraf
npm install --save-dev @types/node
```

## Project Setup

1. Create the project structure:
```bash
mkdir -p src/pools/workers
```

2. Configure TypeScript (tsconfig.json):
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Usage Examples

### Basic Usage

```typescript
import { ThreadPool } from './pools/ThreadPool';

async function main() {
    const pool = new ThreadPool();

    // Define a CPU-intensive task
    const heavyTask = (n: number): number => {
        let result = 0;
        for (let i = 0; i < n; i++) {
            result += Math.sqrt(i);
        }
        return result;
    };

    try {
        // Execute a single task
        const result = await pool.executeTask(heavyTask, 1000000);
        console.log('Result:', result);
    } finally {
        await pool.shutdown();
    }
}

main().catch(console.error);
```

### Batch Processing

```typescript
const pool = new ThreadPool();

// Process multiple tasks
const tasks = [];
for (let i = 0; i < 5; i++) {
    tasks.push(pool.executeTask(heavyTask, i * 1000000));
}

const results = await Promise.all(tasks);
```

### Performance Monitoring

```typescript
const pool = new ThreadPool();

// Execute some tasks
await pool.executeTask(someFunction, params);

// Get metrics
const metrics = pool.getMetrics();
metrics.forEach((metric, workerId) => {
    console.log(`\nWorker ${workerId}:`);
    console.log(`Total Tasks: ${metric.totalTasks}`);
    console.log(`Successful Tasks: ${metric.successfulTasks}`);
    console.log(`Average Execution Time: ${metric.totalExecutionTime / metric.totalTasks}ms`);
});
```

## API Documentation

### ThreadPool Class

#### Constructor Options
```typescript
interface ThreadPoolOptions {
    numThreads?: number;        // Default: CPU cores count
    taskTimeout?: number;       // Default: 30000ms
}
```

#### Methods

1. `executeTask<T>(fn: (...args: any[]) => T, ...args: any[]): Promise<T>`
   - Executes a single task in a worker thread
   - Returns a promise with the result

2. `executeBatch<T>(fn: (...args: any[]) => T, argsBatch: any[][]): Promise<T[]>`
   - Executes multiple tasks in parallel
   - Returns a promise with all results

3. `getMetrics(): Map<number, WorkerMetrics>`
   - Returns performance metrics for each worker

4. `shutdown(): Promise<void>`
   - Gracefully shuts down the thread pool

### WorkerMetrics Interface

```typescript
interface WorkerMetrics {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    totalExecutionTime: number;
    peakMemoryUsage: number;
}
```

## Best Practices

1. Always use `shutdown()` when done with the pool:
```typescript
const pool = new ThreadPool();
try {
    // Your code here
} finally {
    await pool.shutdown();
}
```

2. Handle errors appropriately:
```typescript
try {
    const result = await pool.executeTask(riskyFunction);
} catch (error) {
    console.error('Task failed:', error);
}
```

3. Monitor performance:
```typescript
const metrics = pool.getMetrics();
// Check metrics periodically
```

4. Use for CPU-intensive tasks only:
- Mathematical calculations
- Image processing
- Data analysis
- Complex algorithms

## Common Use Cases

1. Image Processing
```typescript
const processImage = (imageData: ImageData) => {
    // Image processing logic
    return processedImage;
};

const processedImages = await Promise.all(
    images.map(img => pool.executeTask(processImage, img))
);
```

2. Data Analysis
```typescript
const analyzeData = (dataset: number[]) => {
    // Analysis logic
    return analysis;
};

const results = await pool.executeBatch(analyzeData, dataBatches);
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request
