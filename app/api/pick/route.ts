import { NextResponse } from 'next/server';
import { QueueManager } from '@/lib/queueManager';

export async function POST(req: Request) {
    try {
        const { userId } = await req.json();
        if (!userId) {
            return NextResponse.json({ error: "L'identifiant utilisateur est requis" }, { status: 400 });
        }

        const qm = QueueManager.getInstance();
        const result = await qm.pickNumber(userId);

        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }
    } catch (error) {
        console.error("Pick Error:", error);
        return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
    }
}

export async function GET() {
    const qm = QueueManager.getInstance();
    return NextResponse.json(qm.getStats());
}

export async function PUT(req: Request) {
    try {
        const { max } = await req.json();
        if (typeof max !== 'number' || max <= 0) {
            return NextResponse.json({ error: "Nombre maximum invalide" }, { status: 400 });
        }
        const qm = QueueManager.getInstance();
        qm.reset(max);
        return NextResponse.json({ message: `Pool réinitialisé à ${max}`, stats: qm.getStats() });
    } catch (error) {
        return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
    }
}
