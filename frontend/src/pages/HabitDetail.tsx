import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../api/firebase";
import { Habit } from "../types";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function HabitDetail() {
  const { habitId } = useParams<{ habitId: string }>();
  const navigate = useNavigate();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [isRelapsing, setIsRelapsing] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!habitId) return;
    const unsub = onSnapshot(doc(db, "habits", habitId), (docSnap) => {
      if (docSnap.exists()) {
        setHabit({ id: docSnap.id, ...docSnap.data() } as Habit);
      }
    });
    return () => unsub();
  }, [habitId]);

  const handleRelapse = async () => {
    window.Telegram?.WebApp.showConfirm("Are you sure you want to reset your streak?", async (confirmed: boolean) => {
      if (confirmed) {
        setIsRelapsing(true);
        try {
          const reportRelapse = httpsCallable(functions, "reportRelapse");
          await reportRelapse({ habitId, reason });
          setReason("");
          window.Telegram?.WebApp.showAlert("Streak reset. Keep your head up!");
        } catch (e) {
          console.error(e);
          window.Telegram?.WebApp.showAlert("Error reporting relapse");
        } finally {
          setIsRelapsing(false);
        }
      }
    });
  };

  if (!habit) return <p>Loading...</p>;

  const currentStreak = Math.floor(Math.abs(new Date().getTime() - habit.startDate.toDate().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <button className="btn" style={{ width: 'auto', padding: '8px', background: 'transparent', color: 'var(--text-color)' }} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ margin: 0 }}>{habit.title}</h1>
      </div>

      <div className="streak-circle">
        <div className="number">{currentStreak}</div>
        <div className="label">Days</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: 'var(--hint-color)', marginBottom: '8px' }}>Best Streak</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{Math.max(habit.bestStreak, currentStreak)}</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: 'var(--hint-color)', marginBottom: '8px' }}>Total Relapses</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{habit.totalRelapses}</div>
        </div>
      </div>

      <div className="card">
        <h2>Report Relapse</h2>
        <p style={{ marginBottom: '16px' }}>If you slipped up, record it here to start fresh and track what triggered it.</p>
        <textarea 
          placeholder="What triggered this? (optional)" 
          rows={3} 
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button className="btn danger" onClick={handleRelapse} disabled={isRelapsing}>
          <AlertTriangle size={20} style={{ marginRight: '8px' }}/>
          I Slipped Up
        </button>
      </div>
    </div>
  );
}
