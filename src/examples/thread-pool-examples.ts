import { ThreadPool } from '../pools/ThreadPool';

async function basicExample() {
    console.log('\n=== Basic Example ===');
    const pool = new ThreadPool();

    const multiply = (a: number, b: number): number => {
        let result = 0;
        for (let i = 0; i < 1000000; i++) {
            result += (a * b) / (i + 1);
        }
        return result;
    };

    try {
        console.log('Executing single task...');
        const result = await pool.executeTask(multiply, 10, 20);
        console.log('Result:', result);
    } finally {
        await pool.shutdown();
    }
}

async function batchProcessingExample() {
    console.log('\n=== Batch Processing Example ===');
    const pool = new ThreadPool();

    const processArray = (arr: number[]): number => {
        // Ensure arr is an array
        if (!Array.isArray(arr)) {
            throw new Error(`Expected array, got ${typeof arr}`);
        }

        return arr.reduce((sum, num) => {
            let result = num;
            for (let i = 0; i < 100000; i++) {
                result += Math.sqrt(result);
            }
            return sum + result;
        }, 0);
    };

    try {
        const batches = [
            [1, 2, 3, 4, 5],
            [6, 7, 8, 9, 10],
            [11, 12, 13, 14, 15]
        ];

        console.log('Processing batches...');
        
        const results = await Promise.all(
            batches.map(batch => pool.executeTask(processArray, batch))
        );
        
        console.log('Results:', results);
    } finally {
        await pool.shutdown();
    }
}

async function imageProcessingExample() {
    console.log('\n=== Image Processing Example ===');
    const pool = new ThreadPool();

    interface Pixel { r: number; g: number; b: number; }
    interface Image { width: number; height: number; pixels: Pixel[]; }

    const processImage = (image: Image): Image => {
        const processedPixels = image.pixels.map(pixel => ({
            r: Math.min(255, pixel.r * 1.2),
            g: Math.min(255, pixel.g * 1.2),
            b: Math.min(255, pixel.b * 1.2)
        }));

        return {
            width: image.width,
            height: image.height,
            pixels: processedPixels
        };
    };

    try {
        const images = Array(4).fill(null).map(() => ({
            width: 100,
            height: 100,
            pixels: Array(10000).fill(null).map(() => ({
                r: Math.random() * 255,
                g: Math.random() * 255,
                b: Math.random() * 255
            }))
        }));

        console.log('Processing images...');
        console.time('Image processing');
        
        const processedImages = await Promise.all(
            images.map(image => pool.executeTask(processImage, image))
        );

        console.timeEnd('Image processing');
        console.log(`Processed ${processedImages.length} images`);
        console.log('Result:', processedImages);
    } finally {
        await pool.shutdown();
    }
}

async function errorHandlingExample() {
    console.log('\n=== Error Handling Example ===');
    const pool = new ThreadPool();

    const taskWithError = (shouldFail: boolean): number => {
        if (shouldFail) {
            throw new Error('Task failed intentionally');
        }
        return 42;
    };

    try {
        const tasks = [
            pool.executeTask(taskWithError, false),
            pool.executeTask(taskWithError, true),
            pool.executeTask(taskWithError, false)
        ];

        const results = await Promise.allSettled(tasks);

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                console.log(`Task ${index} succeeded:`, result.value);
            } else {
                console.log(`Task ${index} failed:`, result.reason);
            }
        });
    } finally {
        await pool.shutdown();
    }
}

async function performanceExample() {
    console.log('\n=== Performance Monitoring Example ===');
    const pool = new ThreadPool();

    const heavyTask = (iterations: number): number => {
        let result = 0;
        for (let i = 0; i < iterations; i++) {
            result += Math.sqrt(i);
        }
        return result;
    };

    try {
        console.time('Tasks execution');
        
        const tasks = [];
        for (let i = 0; i < 8; i++) {
            tasks.push(pool.executeTask(heavyTask, 1000000 * (i + 1)));
        }

        await Promise.all(tasks);
        console.timeEnd('Tasks execution');

        const metrics = pool.getMetrics();
        metrics.forEach((metric, workerId) => {
            console.log(`\nWorker ${workerId}:`);
            console.log(`Total Tasks: ${metric.totalTasks}`);
            console.log(`Successful Tasks: ${metric.successfulTasks}`);
            console.log(`Failed Tasks: ${metric.failedTasks}`);
            console.log(`Average Execution Time: ${
                metric.totalTasks ? 
                (metric.totalExecutionTime / metric.totalTasks).toFixed(2) : 0
            }ms`);
            console.log(`Peak Memory Usage: ${
                (metric.peakMemoryUsage / 1024 / 1024).toFixed(2)
            }MB`);
        });
    } finally {
        await pool.shutdown();
    }
}

async function runAllExamples() {
    try {
        await basicExample();
        await batchProcessingExample();
        await imageProcessingExample();
        await errorHandlingExample();
        await performanceExample();
    } catch (error) {
        console.error('Examples failed:', error);
    }
}

if (require.main === module) {
    runAllExamples().catch(console.error);
}

export {
    basicExample,
    batchProcessingExample,
    imageProcessingExample,
    errorHandlingExample,
    performanceExample,
    runAllExamples
};