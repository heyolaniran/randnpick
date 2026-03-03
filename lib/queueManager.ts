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

    public async pickNumber(userId: string, userIp: string): Promise<{ success: boolean; number?: number; error?: string }> {
        // We create a combined tracking set to prevent same IP or same ID picking twice
        const alreadyAssigned = Array.from(this.assignedNumbers.entries()).find(
            ([id, num]) => id === userId || id === `ip_${userIp}`
        );

        if (alreadyAssigned) {
            return { success: true, number: alreadyAssigned[1] };
        }

        return new Promise((resolve) => {
            this.queue.push(async () => {
                try {
                    // Re-check inside the queue for both ID and IP
                    const reCheck = Array.from(this.assignedNumbers.entries()).find(
                        ([id, num]) => id === userId || id === `ip_${userIp}`
                    );

                    if (reCheck) {
                        resolve({ success: true, number: reCheck[1] });
                    } else if (this.availableNumbers.length === 0) {
                        resolve({ success: false, error: "Plus de numéros disponibles" });
                    } else {
                        // Simulate a small delay for "queue" effect/processing
                        await new Promise(r => setTimeout(r, 800));
                        const picked = this.availableNumbers.pop();

                        // Store both to block both identifiers
                        this.assignedNumbers.set(userId, picked!);
                        this.assignedNumbers.set(`ip_${userIp}`, picked!);

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
