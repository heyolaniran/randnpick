'use client';

import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [pickedNumber, setPickedNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ remaining: number; max: number; assigned: number } | null>(null);
  const [status, setStatus] = useState<string>('Prêt à tirer');
  const [isAdmin, setIsAdmin] = useState(false);
  const [maxInput, setMaxInput] = useState<number>(100);

  // Initialize UserId from localStorage or generate new one
  useEffect(() => {
    let id = localStorage.getItem('random_queue_id');
    if (!id) {
      id = uuidv4();
      localStorage.setItem('random_queue_id', id);
    }
    setUserId(id);

    // Check for admin role in cache
    const role = localStorage.getItem('random_queue_role');
    if (role === 'admin') setIsAdmin(true);

    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/pick');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  const handlePick = async () => {
    if (!userId) return;
    setLoading(true);
    setStatus('Rejoint la file d’attente...');
    setPickedNumber(null);

    try {
      const res = await fetch('/api/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();

      if (data.success) {
        setPickedNumber(data.number);
        setStatus('Numéro tiré !');
        fetchStats();
      } else {
        setStatus(`Erreur : ${data.error}`);
      }
    } catch (err) {
      setStatus('La requête a échoué. Vérifiez le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir réinitialiser le pool à ${maxInput} ?`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/pick', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max: maxInput })
      });
      const data = await res.json();
      setStats(data.stats);
      setPickedNumber(null);
      setStatus('Pool réinitialisé avec succès par l’administrateur');
    } catch (err) {
      setStatus('La réinitialisation a échoué');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-6 sm:p-24 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <main className="z-10 w-full max-w-lg flex flex-col gap-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-2 leading-tight">
            Random Queue <span className="text-blue-500">Pick</span>
          </h1>
          <p className="text-zinc-400 font-medium">Système de sélection numéroté unique</p>
        </div>

        {/* User Badge */}
        <div className="flex justify-center">
          <div className="status-badge flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-mono text-zinc-300">ID: {userId?.slice(0, 8)}...</span>
          </div>
        </div>

        {/* Picking Area */}
        <div className="glass-card rounded-[2rem] p-8 sm:p-12 text-center space-y-8 min-h-[400px] flex flex-col justify-center transition-all duration-500">
          {pickedNumber ? (
            <div className="space-y-4 animate-in fade-in zoom-in duration-500">
              <span className="text-sm font-semibold uppercase tracking-widest text-blue-400">Votre Numéro</span>
              <div className="number-reveal animate-float">{pickedNumber}</div>
              <p className="text-zinc-400 text-sm">Réservé avec succès pour votre identifiant</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center">
                {loading ? (
                  <div className="space-y-4 py-8">
                    <div className="relative w-20 h-20">
                      <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500/20 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-zinc-400 font-medium">{status}</p>
                  </div>
                ) : (
                  <div className="space-y-4 py-8">
                    <div className="text-6xl text-zinc-700 font-bold opacity-30 select-none">?</div>
                    <p className="text-zinc-400">{status}</p>
                  </div>
                )}
              </div>

              <button
                disabled={loading || !!pickedNumber}
                onClick={handlePick}
                className="btn-primary w-full text-lg h-14"
              >
                {loading ? 'Traitement en cours...' : 'Tirer mon numéro'}
              </button>
            </div>
          )}
        </div>

        {/* Stats & Controls */}
        <div className="glass-card rounded-2xl p-6 border-zinc-800/50">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <span className="block text-2xl font-bold text-white">{stats?.remaining ?? 0}</span>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Disponible</span>
            </div>
            <div className="text-center border-x border-white/5">
              <span className="block text-2xl font-bold text-white">{stats?.assigned ?? 0}</span>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Attribué</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-bold text-white">{stats?.max ?? 0}</span>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Total</span>
            </div>
          </div>

          {isAdmin && (
            <div className="flex gap-2 items-center pt-4 border-t border-white/5 animate-in slide-in-from-bottom-2 duration-300">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={maxInput}
                  onChange={(e) => setMaxInput(parseInt(e.target.value) || 1)}
                  className="w-full bg-black/40 border border-zinc-800 rounded-lg h-10 px-3 text-sm focus:outline-none focus:border-blue-500 transition-colors text-white"
                  placeholder="Nouvelle taille du pool..."
                />
              </div>
              <button
                onClick={handleReset}
                disabled={loading}
                className="px-4 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all border border-white/5"
              >
                Réinitialisation Admin
              </button>
            </div>
          )}
        </div>

        <footer className="text-center text-zinc-500 text-xs px-4">
          Chaque numéro est unique et réservé en fonction de votre identifiant unique.
          Concurrence contrôlée par une file d’attente séquentielle côté serveur.
        </footer>
      </main>
    </div>
  );
}
