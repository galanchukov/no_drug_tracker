import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, runTransaction, collection, serverTimestamp, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../api/firebase";
import { useAppStore } from "../store/useAppStore";
import type { Habit } from "../types";
import { ArrowLeft, AlertTriangle, Trash2, Edit, Wind } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MOTIVATION_QUOTES = [
  "Каждая слабость сейчас — это шаг назад от той жизни, которую ты заслуживаешь.",
  "Вспомни, почему ты начал.",
  "Срыв даст тебе 10 минут иллюзии, а потом заберет твою гордость.",
  "Боль от дисциплины весит граммы. Боль от сожаления весит тонны.",
  "Ты уже доказал, что можешь держаться. Не предавай себя ради мимолетного порыва."
];

export default function HabitDetail() {
  const { user } = useAppStore();
  const { habitId } = useParams<{ habitId: string }>();
  const navigate = useNavigate();
  const [habit, setHabit] = useState<Habit | null>(null);
  const [isRelapsing, setIsRelapsing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reason, setReason] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showSos, setShowSos] = useState(false);
  const [sosQuote, setSosQuote] = useState("");
  
  // Edit states
  const [editTitle, setEditTitle] = useState("");
  const [editReason, setEditReason] = useState("");

  useEffect(() => {
    if (showSos) {
      setSosQuote(MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)]);
    }
  }, [showSos]);

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
          setShowSos(false);
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
  const lostMoney = (habit.dailyCost || 0) * currentStreak;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
      {/* SOS Modal */}
      <AnimatePresence>
        {showSos && (
          <motion.div 
            className="sos-modal glass"
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <h2 style={{ color: '#fff', fontSize: 24, marginBottom: 8 }}>Дыши со мной</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>Вдох - Выдох. Тяга временна.</p>
            
            <div className="breathe-indicator">
              <Wind size={40} style={{ color: 'white', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }} />
            </div>

            <div style={{ padding: '24px', background: 'rgba(255,255,255,0.1)', borderRadius: 16, marginTop: 40, fontStyle: 'italic', maxWidth: '300px' }}>
              "{sosQuote}"
            </div>

            <div style={{ marginTop: 24 }}>
              <p style={{ color: '#ff4d4d', fontWeight: 'bold' }}>Срыв обнулит {currentStreak} чистых дней!</p>
              {lostMoney > 0 && <p style={{ color: '#ff9f43' }}>Вы впустую потратите сэкономленные {lostMoney} ₽</p>}
            </div>

            <button className="btn" style={{ marginTop: '40px', background: 'white', color: '#000' }} onClick={() => setShowSos(false)}>
              Я справлюсь
            </button>
            <button className="btn danger" style={{ marginTop: '16px', background: 'transparent', border: 'none', textDecoration: 'underline' }} onClick={handleRelapse}>
              Всё равно сорваться...
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
        <button className="btn-sos" onClick={() => setShowSos(true)}>SOS</button>
      </div>

      {isEditing ? (
        <div className="card glass">
          <label style={{ fontSize: '12px', color: 'var(--hint-color)' }}>Мотивация</label>
          <textarea value={editReason} onChange={e => setEditReason(e.target.value)} rows={3} />
        </div>
      ) : (
        habit.reason && (
          <div className="card glass" style={{ marginBottom: '24px', fontStyle: 'italic', color: 'var(--hint-color)', borderLeft: `4px solid ${habit.color || 'var(--button-color)'}` }}>
            "{habit.reason}"
          </div>
        )
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="card glass" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: 'var(--hint-color)', marginBottom: '8px' }}>Лучший стрик</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{Math.max(habit.bestStreak, currentStreak)}</div>
        </div>
        <div className="card glass" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: 'var(--hint-color)', marginBottom: '8px' }}>Всего срывов</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{habit.totalRelapses}</div>
        </div>
      </div>

      <div className="card">
        <h2>Зафиксировать обычный срыв</h2>
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
