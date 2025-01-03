import {Worker} from 'worker_threads';
import {join} from 'path';
import os from 'os';

interface ThreadPoolOptions {
    numThreads?: number;
    taskTimeout?: number;
}

interface WorkerMetrics {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    totalExecutionTime: number;
    peakMemoryUsage: number;
}

export class ThreadPool {
    private workers : Worker[] = [];
    private workerMetrics : Map < number,
    WorkerMetrics > = new Map();
    private taskQueue : Map < number, {
        resolve: (value : any) => void;
        reject: (error : Error) => void;
        timeout: NodeJS.Timeout;
    } > = new Map();
    private taskIdCounter = 0;

    constructor(private options : ThreadPoolOptions = {}) {
        this.options = {
            numThreads: options.numThreads || os.cpus().length,
            taskTimeout: options.taskTimeout || 30000
        };
        this.initialize();
    }

    private initialize(): void {
        for (let i = 0; i < this.options.numThreads !; i++) {
            const worker = new Worker(join(__dirname, 'workers', 'worker.js'));

            this.workerMetrics.set(i, {
                totalTasks: 0,
                successfulTasks: 0,
                failedTasks: 0,
                totalExecutionTime: 0,
                peakMemoryUsage: 0
            });

            worker.on('message', (response) => {
                if (response.type === 'HEALTH_CHECK') {
                    this.updateWorkerMetrics(i, response.metrics);
                    return;
                }

                if (response.metrics) {
                    this.updateWorkerMetrics(i, response.metrics);
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
            });

            worker.on('error', (error) => {
                console.error(`Worker ${i} error:`, error);
                this.handleWorkerError(i);
            });

            worker.on('exit', (code) => {
                if (code !== 0) {
                    console.error(`Worker ${i} exited with code ${code}`);
                    this.handleWorkerExit(i);
                }
            });

            this.workers.push(worker);
        }

        setInterval(() => this.checkWorkersHealth(), 5000);
    }

    private updateWorkerMetrics(workerId : number, metrics : WorkerMetrics): void {
        this.workerMetrics.set(workerId, {
            ...metrics
        });
    }

    private async handleWorkerError(workerId : number): Promise < void > {
        if (this.workers[workerId]) {
            await this.workers[workerId].terminate();
        }
        const newWorker = new Worker(join(__dirname, 'workers', 'worker.js'));
        this.workers[workerId] = newWorker;

        this.workerMetrics.set(workerId, {
            totalTasks: 0,
            successfulTasks: 0,
            failedTasks: 0,
            totalExecutionTime: 0,
            peakMemoryUsage: 0
        });
    }

    private async handleWorkerExit(workerId : number): Promise < void > {
        await this.handleWorkerError(workerId);
    }

    private checkWorkersHealth(): void {
        this.workers.forEach((worker, index) => {
            worker.postMessage(`HEALTH_CHECK WORKER :  ${index}`);
        });
    }

    public async executeTask < T > (fn : (...args : any[]) => T, ...args : any[]): Promise < T > {
        const taskId = ++ this.taskIdCounter;
        const workerId = taskId % this.workers.length;
        const worker = this.workers[workerId];

        return new Promise(
            (resolve, reject) => {
                const timeout = setTimeout(() => {
                    this.taskQueue.delete(taskId);
                    reject(new Error(`Task timeout after ${
                        this.options.taskTimeout
                    }ms`));
                }, this.options.taskTimeout);

                this.taskQueue.set(taskId, {resolve, reject, timeout});

                worker ?. postMessage({id: taskId, type: 'TASK', fn: fn.toString(), args});
            }
        );
    }

    public async executeBatch < T > (fn : (...args : any[]) => T, argsBatch : any[][]): Promise < T[] > {
        return Promise.all(argsBatch.map(args => this.executeTask(fn, ...args)));
    }

    public getMetrics(): Map < number,
    WorkerMetrics > {
        return new Map(this.workerMetrics);
    }

    public async shutdown(): Promise < void > {
        for (const worker of this.workers) {
            await worker.terminate();
        }
        this.workers = [];
        this.workerMetrics.clear();
        this.taskQueue.clear();
    }
}
