import { ThreadPool } from './pools/ThreadPool';

async function main() {
    const pool = new ThreadPool();
    const computeTask = (iterations: number): number => {
        let result = 0;
        for (let i = 0; i < iterations; i++) {
            result += Math.sqrt(i);
        }
        return result;
    };

    try {
        console.time('Execution time');

        const tasks = [];
        for (let i = 0; i < 10; i++) {
            tasks.push(pool.executeTask(computeTask, 1000000 * (i + 1)));
        }

        const results = await Promise.all(tasks);
        console.log("🚀 ~ main ~ results:", results)
        console.timeEnd('Execution time');

        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('\nWorker Metrics:');
        const metrics = pool.getMetrics();
        metrics.forEach((metric, workerId) => {
            console.log(`\nWorker ${workerId}:`);
            console.log(`Total Tasks: ${metric.totalTasks}`);
            console.log(`Successful Tasks: ${metric.successfulTasks}`);
            console.log(`Failed Tasks: ${metric.failedTasks}`);
            console.log(`Average Execution Time: ${metric.totalTasks ? 
                (metric.totalExecutionTime / metric.totalTasks).toFixed(2) : 0}ms`);
            console.log(`Peak Memory Usage: ${(metric.peakMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.shutdown();
    }
}

main().catch(console.error);