import { Worker } from 'worker_threads';
import { join } from 'path';
import os from 'os';

export interface ThreadPoolOptions {
    numThreads?: number;
    taskTimeout?: number;
}

export interface WorkerMetrics {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    totalExecutionTime: number;
    peakMemoryUsage: number;
}

export class ThreadPool {
    private workers: Worker[] = [];
    private workerMetrics: Map<number, WorkerMetrics> = new Map();
    private taskQueue: Map<number, { 
        resolve: (value: any) => void;
        reject: (error: Error) => void;
        timeout: NodeJS.Timeout;
    }> = new Map();
    private taskIdCounter = 0;
    private isShuttingDown = false;

    constructor(private options: ThreadPoolOptions = {}) {
        this.options = {
            numThreads: options.numThreads || os.cpus().length,
            taskTimeout: options.taskTimeout || 30000
        };
        this.initialize();
    }

    private initialize(): void {
        for (let i = 0; i < this.options.numThreads!; i++) {
            this.createWorker(i);
        }

        setInterval(() => this.checkWorkersHealth(), 5000);
    }

    private createWorker(index: number): void {
        const worker = new Worker(join(__dirname, 'workers', 'worker.js'));
            
        // Initialize metrics for this worker
        this.workerMetrics.set(index, {
            totalTasks: 0,
            successfulTasks: 0,
            failedTasks: 0,
            totalExecutionTime: 0,
            peakMemoryUsage: 0
        });

        worker.on('message', this.handleWorkerMessage(index));
        worker.on('error', (error) => this.handleWorkerError(error, index));
        worker.on('exit', (code) => this.handleWorkerExit(code, index));

        this.workers[index] = worker;
    }

    private handleWorkerMessage(workerId: number) {
        return (response: any) => {
            if (response.type === 'HEALTH_CHECK') {
                this.updateWorkerMetrics(workerId, response.metrics);
                return;
            }

            if (response.metrics) {
                this.updateWorkerMetrics(workerId, response.metrics);
            }

            const task = this.taskQueue.get(response.id);
            if (task) {
                clearTimeout(task.timeout);
                if (response.error) {
                    task.reject(new Error(response.error));
                } else {
                    task.resolve(response.result);
                }
                this.taskQueue.delete(response.id);
            }
        };
    }

    private handleWorkerError(error: Error, workerId: number): void {
        console.error(`Worker ${workerId} error:`, error);
        if (!this.isShuttingDown) {
            this.recreateWorker(workerId);
        }
    }

    private handleWorkerExit(code: number | null, workerId: number): void {
        if (code !== 0 && !this.isShuttingDown) {
            console.error(`Worker ${workerId} exited with code ${code}`);
            this.recreateWorker(workerId);
        }
    }

    private async recreateWorker(workerId: number): Promise<void> {
        try {
          if(this.workers[workerId])
          await this.workers[workerId].terminate();
        } catch (error) {
            console.error(`Error terminating worker ${workerId}:`, error);
        }
        this.createWorker(workerId);
    }

    private updateWorkerMetrics(workerId: number, metrics: WorkerMetrics): void {
        this.workerMetrics.set(workerId, { ...metrics });
    }

    private checkWorkersHealth(): void {
        if (!this.isShuttingDown) {
            this.workers.forEach(worker => {
                worker.postMessage('HEALTH_CHECK');
            });
        }
    }

    public async executeTask<T>(
        fn: (...args: any[]) => T | Promise<T>,
        ...args: any[]
    ): Promise<T> {
        if (this.isShuttingDown) {
            throw new Error('ThreadPool is shutting down');
        }

        const taskId = ++this.taskIdCounter;
        const workerId = taskId % this.workers.length;

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.taskQueue.delete(taskId);
                reject(new Error(`Task timeout after ${this.options.taskTimeout}ms`));
            }, this.options.taskTimeout);

            this.taskQueue.set(taskId, { resolve, reject, timeout });
            if(this.workers[workerId])
            this.workers[workerId].postMessage({
                id: taskId,
                type: 'TASK',
                fn: fn.toString(),
                args
            });
        });
    }

    public async executeBatch<T>(
        fn: (...args: any[]) => T | Promise<T>,
        argsBatch: any[][]
    ): Promise<T[]> {
        return Promise.all(
            argsBatch.map(args => this.executeTask(fn, ...args))
        );
    }

    public getMetrics(): Map<number, WorkerMetrics> {
        return new Map(this.workerMetrics);
    }

    public async shutdown(): Promise<void> {
        this.isShuttingDown = true;

        // Clear all pending timeouts
        for (const task of this.taskQueue.values()) {
            clearTimeout(task.timeout);
        }

        // Terminate all workers
        const terminationPromises = this.workers.map(worker => {
            return worker.terminate();
        });

        await Promise.all(terminationPromises);
        
        this.workers = [];
        this.workerMetrics.clear();
        this.taskQueue.clear();
    }
}