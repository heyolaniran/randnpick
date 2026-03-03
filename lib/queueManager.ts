import { v4 as uuidv4 } from 'uuid';

export class QueueManager {
    private static instance: QueueManager;
    private availableNumbers: number[] = [];
    private assignedNumbers: Map<string, number> = new Map();
    private maxNumber: number = 100;
    private isProcessing: boolean = false;
    private queue: Array<{ userId: string, resolve: (val: any) => void, action: () => Promise<any> }> = [];
    private activeConnections: number = 0;

    private constructor() {
        this.reset(100);
    }

    public static getInstance(): QueueManager {
        // Handle Next.js hot reloading by attaching to global
        if (process.env.NODE_ENV === 'development') {
            if (!(global as any).queueManagerInstance) {
                (global as any).queueManagerInstance = new QueueManager();
            }
            return (global as any).queueManagerInstance;
        }

        if (!QueueManager.instance) {
            QueueManager.instance = new QueueManager();
        }
        return QueueManager.instance;
    }

    public reset(max: number) {
        this.maxNumber = max;
        this.availableNumbers = Array.from({ length: max }, (_, i) => i + 1);
        this.assignedNumbers.clear();
        // Shuffle the numbers initially for true randomness
        for (let i = this.availableNumbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.availableNumbers[i], this.availableNumbers[j]] = [this.availableNumbers[j], this.availableNumbers[i]];
        }
    }

    public async pickNumber(userId: string): Promise<{ success: boolean; number?: number; error?: string; queuePos?: number }> {
        // Double Check: ID unique uniquement
        if (this.assignedNumbers.has(userId)) {
            return { success: true, number: this.assignedNumbers.get(userId) };
        }

        return new Promise((resolve) => {
            const queuePos = this.queue.length + 1;

            this.queue.push({
                userId,
                resolve,
                action: async () => {
                    this.activeConnections++;
                    try {
                        // Re-vérification après attente dans la file
                        if (this.assignedNumbers.has(userId)) {
                            return { success: true, number: this.assignedNumbers.get(userId) };
                        }

                        if (this.availableNumbers.length === 0) return { success: false, error: "Plus de numéros disponibles" };

                        // Simulation de traitement (file d'attente visible)
                        await new Promise(r => setTimeout(r, 1500));

                        const picked = this.availableNumbers.pop();
                        this.assignedNumbers.set(userId, picked!);

                        return { success: true, number: picked };
                    } finally {
                        this.activeConnections--;
                    }
                }
            });

            if (!this.isProcessing) {
                this.processNext();
            }
        });
    }

    private async processNext() {
        if (this.queue.length > 0) {
            this.isProcessing = true;
            const task = this.queue.shift();
            if (task) {
                const result = await task.action();
                task.resolve(result);
                this.processNext();
            }
        } else {
            this.isProcessing = false;
        }
    }

    public getStats() {
        return {
            remaining: this.availableNumbers.length,
            assigned: this.assignedNumbers.size,
            activeUsers: this.activeConnections,
            waitingInQueue: this.queue.length,
            max: this.maxNumber
        };
    }
}

export const queueManager = QueueManager.getInstance();
