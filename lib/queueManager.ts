import { v4 as uuidv4 } from 'uuid';

export class QueueManager {
    private static instance: QueueManager;
    private availableNumbers: number[] = [];
    private assignedNumbers: Map<string, number> = new Map();
    private maxNumber: number = 100; // Default max
    private isProcessing: boolean = false;
    private queue: Array<() => void> = [];

    private constructor() {
        this.reset(100);
    }

    public static getInstance(): QueueManager {
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

    public async pickNumber(userId: string): Promise<{ success: boolean; number?: number; error?: string }> {
        // Basic queue/lock implementation to ensure sequential processing
        if (this.assignedNumbers.has(userId)) {
            return { success: true, number: this.assignedNumbers.get(userId) };
        }

        return new Promise((resolve) => {
            this.queue.push(async () => {
                try {
                    if (this.assignedNumbers.has(userId)) {
                        resolve({ success: true, number: this.assignedNumbers.get(userId) });
                    } else if (this.availableNumbers.length === 0) {
                        resolve({ success: false, error: "Plus de numéros disponibles" });
                    } else {
                        // Simulate a small delay for "queue" effect/processing
                        await new Promise(r => setTimeout(r, 800));
                        const picked = this.availableNumbers.pop();
                        this.assignedNumbers.set(userId, picked!);
                        resolve({ success: true, number: picked });
                    }
                } finally {
                    this.processNext();
                }
            });

            if (!this.isProcessing) {
                this.processNext();
            }
        });
    }

    private processNext() {
        if (this.queue.length > 0) {
            this.isProcessing = true;
            const nextTask = this.queue.shift();
            if (nextTask) nextTask();
        } else {
            this.isProcessing = false;
        }
    }

    public getStats() {
        return {
            remaining: this.availableNumbers.length,
            assigned: this.assignedNumbers.size,
            max: this.maxNumber
        };
    }
}

export const queueManager = QueueManager.getInstance();
