export interface WorkerMessage {
    type: 'TASK' | 'TERMINATE';
    id?: number;
    fn?: string;
    args?: any[];
}

export interface WorkerResponse {
    id: number;
    result?: any;
    error?: string;
    metrics?: {
        executionTime: number;
        memoryUsage: number;
    };
}

export interface ThreadPoolOptions {
    numThreads?: number;
    taskTimeout?: number;
    maxQueueSize?: number;
    enableMetrics?: boolean;
}

export interface TaskMetrics {
    startTime: number;
    endTime?: number;
    executionTime?: number;
    memoryUsage?: number;
    workerId: number;
}

export interface WorkerMetrics {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    averageExecutionTime: number;
    peakMemoryUsage: number;
}