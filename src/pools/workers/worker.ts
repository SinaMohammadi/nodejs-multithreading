import { parentPort, isMainThread, threadId } from 'worker_threads';

interface WorkerMetrics {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    totalExecutionTime: number;
    peakMemoryUsage: number;
}

interface WorkerTask {
    id: number;
    type: 'TASK' | 'TERMINATE';
    fn?: string;
    args?: any[];
}

interface WorkerResponse {
    id: number;
    result?: any;
    error?: string;
    metrics: WorkerMetrics;
}

if (isMainThread) {
    throw new Error('This file is meant to be run as a worker thread');
}

if (!parentPort) {
    throw new Error('Parent port is not available');
}

// Worker metrics state
const metrics: WorkerMetrics = {
    totalTasks: 0,
    successfulTasks: 0,
    failedTasks: 0,
    totalExecutionTime: 0,
    peakMemoryUsage: 0
};

async function executeTask(task: WorkerTask): Promise<WorkerResponse> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
        if (!task.fn) {
            throw new Error('No function provided');
        }

        metrics.totalTasks++;
        
        // Execute the task
        const fn = new Function(`return ${task.fn}`)();
        const result = await fn(...(task.args || []));
        
        // Update metrics
        const executionTime = Date.now() - startTime;
        const memoryUsed = process.memoryUsage().heapUsed - startMemory;
        
        metrics.successfulTasks++;
        metrics.totalExecutionTime += executionTime;
        metrics.peakMemoryUsage = Math.max(metrics.peakMemoryUsage, memoryUsed);

        return {
            id: task.id,
            result,
            metrics: { ...metrics }
        };
    } catch (error) {
        metrics.failedTasks++;
        const executionTime = Date.now() - startTime;
        metrics.totalExecutionTime += executionTime;

        return {
            id: task.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            metrics: { ...metrics }
        };
    }
}

// Handle incoming messages
parentPort.on('message', async (message: WorkerTask | 'HEALTH_CHECK') => {
    if (message === 'HEALTH_CHECK') {
        parentPort?.postMessage({
            type: 'HEALTH_CHECK',
            metrics: { ...metrics },
            threadId
        });
        return;
    }

    const task = message as WorkerTask;
    
    switch (task.type) {
        case 'TERMINATE':
            process.exit(0);
            break;

        case 'TASK':
            try {
                const response = await executeTask(task);
                parentPort?.postMessage(response);
            } catch (error) {
                parentPort?.postMessage({
                    id: task.id,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    metrics: { ...metrics }
                });
            }
            break;
    }
});

// Error handling
process.on('uncaughtException', (error) => {
    metrics.failedTasks++;
    parentPort?.postMessage({
        type: 'ERROR',
        error: error.message,
        metrics: { ...metrics }
    });
});

// Notify that worker is ready
parentPort.postMessage({
    type: 'READY',
    threadId,
    metrics: { ...metrics }
});