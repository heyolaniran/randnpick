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

    public async pickNumber(userId: string, userIp: string): Promise<{ success: boolean; number?: number; error?: string; queuePos?: number }> {
        // Double Check: ID unique ou IP déjà enregistrée
        const existingEntry = Array.from(this.assignedNumbers.entries()).find(
            ([key, _]) => key === userId || key === `ip_${userIp}`
        );

        if (existingEntry) {
            return { success: true, number: existingEntry[1] };
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
                        const reCheck = Array.from(this.assignedNumbers.entries()).find(
                            ([k, _]) => k === userId || k === `ip_${userIp}`
                        );

                        if (reCheck) return { success: true, number: reCheck[1] };
                        if (this.availableNumbers.length === 0) return { success: false, error: "Plus de numéros disponibles" };

                        // Simulation de traitement (file d'attente visible)
                        await new Promise(r => setTimeout(r, 1500));

                        const picked = this.availableNumbers.pop();
                        this.assignedNumbers.set(userId, picked!);
                        this.assignedNumbers.set(`ip_${userIp}`, picked!);

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
            assigned: Array.from(this.assignedNumbers.keys()).filter(k => !k.startsWith('ip_')).length,
            activeUsers: this.activeConnections,
            waitingInQueue: this.queue.length,
            max: this.maxNumber
        };
    }
}

export const queueManager = QueueManager.getInstance();
