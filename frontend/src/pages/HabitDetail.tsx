import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, runTransaction, collection, serverTimestamp, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../api/firebase";
import { useAppStore } from "../store/useAppStore";
import type { Habit } from "../types";
import { ArrowLeft, AlertTriangle, Trash2, Edit } from "lucide-react";
import { motion } from "framer-motion";

export default function HabitDetail() {
  const { user } = useAppStore();
  const { habitId } = useParams<{ habitId: string }>();
  const navigate = useNavigate();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [isRelapsing, setIsRelapsing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reason, setReason] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit states
  const [editTitle, setEditTitle] = useState("");
  const [editReason, setEditReason] = useState("");

  useEffect(() => {
    if (!habitId) return;
    const unsub = onSnapshot(doc(db, "habits", habitId), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Habit;
        setHabit(data);
        if (!isEditing) {
          setEditTitle(data.title);
          setEditReason(data.reason || "");
        }
      } else {
        navigate('/', { replace: true });
      }
    });
    return () => unsub();
  }, [habitId, navigate, isEditing]);

  const handleDeleteHabit = async () => {
    if (!user || !habitId) return;
    window.Telegram?.WebApp.showConfirm("Вы уверены, что хотите удалить эту цель? Это действие необратимо.", async (confirmed: boolean) => {
      if (confirmed) {
        setIsDeleting(true);
        try {
          await deleteDoc(doc(db, "habits", habitId));
          window.Telegram?.WebApp.HapticFeedback.notificationOccurred("success");
          navigate('/', { replace: true });
        } catch (e) {
          console.error(e);
          window.Telegram?.WebApp.showAlert("Ошибка при удалении");
          setIsDeleting(false);
        }
      }
    });
  };

  const handleUpdateHabit = async () => {
    if (!habitId || !editTitle.trim()) return;
    try {
      await updateDoc(doc(db, "habits", habitId), {
        title: editTitle.trim(),
        reason: editReason.trim()
      });
      setIsEditing(false);
      window.Telegram?.WebApp.HapticFeedback.impactOccurred("medium");
    } catch (e) {
      console.error(e);
      window.Telegram?.WebApp.showAlert("Ошибка при сохранении");
    }
  }

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
          window.Telegram?.WebApp.HapticFeedback.notificationOccurred("warning");
          window.Telegram?.WebApp.showAlert("Счетчик сброшен. Важен не срыв, а то, что вы продолжаете пытаться!");
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
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn" style={{ width: 'auto', padding: '8px', background: 'transparent', color: 'var(--text-color)' }} onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
          </button>
          {isEditing ? (
            <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ margin: 0 }} />
          ) : (
            <h1 style={{ margin: 0 }}>{habit.icon} {habit.title}</h1>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isEditing ? (
            <button className="btn" onClick={handleUpdateHabit} style={{ width: 'auto', padding: '8px 16px' }}>
              Сохранить
            </button>
          ) : (
            <>
              <button 
                className="btn" 
                onClick={() => setIsEditing(true)}
                style={{ width: 'auto', padding: '8px', background: 'transparent', color: 'var(--text-color)' }}
              >
                <Edit size={24} />
              </button>
              <button 
                className="btn" 
                disabled={isDeleting}
                onClick={handleDeleteHabit}
                style={{ width: 'auto', padding: '8px', background: 'transparent', color: '#ff4d4d' }}
              >
                <Trash2 size={24} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="streak-circle" style={{ borderColor: habit.color || 'var(--button-color)' }}>
        <motion.div key={currentStreak} initial={{ scale: 0 }} animate={{ scale: 1 }} className="number" style={{ color: habit.color || 'inherit' }}>{currentStreak}</motion.div>
        <div className="label">Дней</div>
      </div>
      
      <div style={{ textAlign: 'center', marginBottom: '24px', fontSize: '14px', color: 'var(--hint-color)' }}>
        Счетчик запущен: {habit.startDate ? habit.startDate.toDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Только что'}
      </div>

      {isEditing ? (
        <div className="card">
          <label style={{ fontSize: '12px', color: 'var(--hint-color)' }}>Мотивация</label>
          <textarea value={editReason} onChange={e => setEditReason(e.target.value)} rows={3} />
        </div>
      ) : (
        habit.reason && (
          <div className="card" style={{ marginBottom: '24px', fontStyle: 'italic', color: 'var(--hint-color)', borderLeft: `4px solid ${habit.color || 'var(--button-color)'}` }}>
            "{habit.reason}"
          </div>
        )
      )}

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
          placeholder="Что спровоцировало срыв? (Грусть, стресс, скука...)" 
          rows={3} 
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <motion.button whileTap={{ scale: 0.95 }} className="btn danger" onClick={handleRelapse} disabled={isRelapsing} style={{ width: '100%' }}>
          <AlertTriangle size={20} style={{ marginRight: '8px' }}/>
          Я сорвался
        </motion.button>
      </div>
    </motion.div>
  );
}
