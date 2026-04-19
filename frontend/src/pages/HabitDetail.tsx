import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, runTransaction, collection, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "../api/firebase";
import { useAppStore } from "../store/useAppStore";
import type { Habit } from "../types";
import { ArrowLeft, AlertTriangle, Trash2 } from "lucide-react";

export default function HabitDetail() {
  const { user } = useAppStore();
  const { habitId } = useParams<{ habitId: string }>();
  const navigate = useNavigate();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [isRelapsing, setIsRelapsing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!habitId) return;
    const unsub = onSnapshot(doc(db, "habits", habitId), (docSnap) => {
      if (docSnap.exists()) {
        setHabit({ id: docSnap.id, ...docSnap.data() } as Habit);
      } else {
        // If it got deleted, navigate back
        navigate('/', { replace: true });
      }
    });
    return () => unsub();
  }, [habitId, navigate]);

  const handleDeleteHabit = async () => {
    if (!user || !habitId) return;
    window.Telegram?.WebApp.showConfirm("Вы уверены, что хотите удалить эту привычку? Это действие необратимо.", async (confirmed: boolean) => {
      if (confirmed) {
        setIsDeleting(true);
        try {
          // Delete logs/relapses optionally, but strictly deleting the habit doc is minimal viable approach
          await deleteDoc(doc(db, "habits", habitId));
          window.Telegram?.WebApp.showAlert("Привычка удалена.");
          navigate('/', { replace: true });
        } catch (e) {
          console.error(e);
          window.Telegram?.WebApp.showAlert("Ошибка при удалении");
          setIsDeleting(false);
        }
      }
    });
  };

  const handleRelapse = async () => {
    if (!user || !habitId) return;
    window.Telegram?.WebApp.showConfirm("Вы уверены, что хотите сбросить текущий стрик?", async (confirmed: boolean) => {
      if (confirmed) {
        setIsRelapsing(true);
        try {
          await runTransaction(db, async (transaction) => {
            const habitRef = doc(db, "habits", habitId);
            const habitDoc = await transaction.get(habitRef);
            
            if (!habitDoc.exists()) throw new Error("Habit not found");
            const habitData = habitDoc.data();
            
            const currentStreakCount = Math.floor(Math.abs(new Date().getTime() - habitData.startDate.toDate().getTime()) / (1000 * 60 * 60 * 24));
            const newBestStreak = Math.max(currentStreakCount, habitData.bestStreak || 0);

            transaction.update(habitRef, {
              startDate: serverTimestamp(),
              bestStreak: newBestStreak,
              currentStreak: 0,
              totalRelapses: (habitData.totalRelapses || 0) + 1
            });

            const relapseRef = doc(collection(db, "relapses"));
            transaction.set(relapseRef, {
              userId: user.uid,
              habitId,
              date: serverTimestamp(),
              reason: reason || ""
            });
          });

          setReason("");
          window.Telegram?.WebApp.showAlert("Счетчик сброшен. Не сдавайтесь!");
        } catch (e) {
          console.error(e);
          window.Telegram?.WebApp.showAlert("Ошибка при записи срыва");
        } finally {
          setIsRelapsing(false);
        }
      }
    });
  };

  if (!habit) return <p>Загрузка...</p>;

  const currentStreak = Math.floor(Math.abs(new Date().getTime() - habit.startDate.toDate().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn" style={{ width: 'auto', padding: '8px', background: 'transparent', color: 'var(--text-color)' }} onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
          </button>
          <h1 style={{ margin: 0 }}>{habit.title}</h1>
        </div>
        <button 
          className="btn" 
          disabled={isDeleting}
          onClick={handleDeleteHabit}
          style={{ width: 'auto', padding: '8px', background: 'transparent', color: '#ff4d4d' }}
        >
          <Trash2 size={24} />
        </button>
      </div>

      <div className="streak-circle">
        <div className="number">{currentStreak}</div>
        <div className="label">Дней</div>
      </div>
      
      <div style={{ textAlign: 'center', marginBottom: '24px', fontSize: '14px', color: 'var(--hint-color)' }}>
        Счетчик запущен: {habit.startDate ? habit.startDate.toDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Только что'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: 'var(--hint-color)', marginBottom: '8px' }}>Лучший стрик</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{Math.max(habit.bestStreak, currentStreak)}</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: 'var(--hint-color)', marginBottom: '8px' }}>Всего срывов</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{habit.totalRelapses}</div>
        </div>
      </div>

      <div className="card">
        <h2>Зафиксировать срыв</h2>
        <p style={{ marginBottom: '16px' }}>Если вы сорвались, запишите это, чтобы начать заново и отследить причины.</p>
        <textarea 
          placeholder="Что спровоцировало срыв? (необязательно)" 
          rows={3} 
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button className="btn danger" onClick={handleRelapse} disabled={isRelapsing}>
          <AlertTriangle size={20} style={{ marginRight: '8px' }}/>
          Я сорвался
        </button>
      </div>
    </div>
  );
}
