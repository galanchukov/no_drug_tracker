import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../api/firebase";
import { useAppStore } from "../store/useAppStore";
import type { Habit } from "../types";
import { Plus, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const EMOJIS = ["🚭", "🍷", "📱", "🎮", "🍔", "🤬", "🛌"];
const COLORS = ["#ff4d4d", "#ff9f43", "#1dd1a1", "#5f27cd", "#54a0ff", "var(--secondary-bg)"];

export default function Home() {
  const { user, habits, setHabits } = useAppStore();
  const [isCreating, setIsCreating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // New habit form
  const [newTitle, setNewTitle] = useState("");
  const [newIcon, setNewIcon] = useState(EMOJIS[0]);
  const [newColor, setNewColor] = useState(COLORS[5]);
  const [newReason, setNewReason] = useState("");
  const [newDailyCost, setNewDailyCost] = useState("");

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "habits"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedHabits: Habit[] = [];
      snapshot.forEach((doc) => {
        fetchedHabits.push({ id: doc.id, ...doc.data() } as Habit);
      });
      // Sort by best streak logic or creation date
      fetchedHabits.sort((a,b) => {
        return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
      });
      setHabits(fetchedHabits);
    });
    return () => unsubscribe();
  }, [user, setHabits]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !user) return;
    setIsCreating(true);
    try {
      await addDoc(collection(db, "habits"), {
        userId: user.uid,
        title: newTitle.trim(),
        icon: newIcon,
        color: newColor,
        reason: newReason.trim(),
        dailyCost: newDailyCost ? parseFloat(newDailyCost) : 0,
        startDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        currentStreak: 0,
        bestStreak: 0,
        totalRelapses: 0
      });
      setNewTitle("");
      setNewReason("");
      setNewDailyCost("");
      setShowAdvanced(false);
      window.Telegram?.WebApp.HapticFeedback.notificationOccurred("success");
    } catch (e) {
      console.error(e);
      window.Telegram?.WebApp.showAlert("Ошибка при создании");
    } finally {
      setIsCreating(false);
    }
  };

  const getDaysStreak = (startDate: any) => {
    if (!startDate) return 0;
    const diff = Math.abs(new Date().getTime() - startDate.toDate().getTime());
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Ваши цели
      </h1>
      
      <div className="card">
        <h2>Добавить цель</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="Напр. Сладкое, Курение..." 
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ marginBottom: 0 }}
          />
          <button className="btn" style={{ width: 'auto', background: 'var(--secondary-bg)', color: 'var(--text-color)' }} onClick={() => setShowAdvanced(!showAdvanced)}>
            <Settings size={20} />
          </button>
          <button className="btn" style={{ width: 'auto' }} onClick={handleCreate} disabled={isCreating || !newTitle.trim()}>
            <Plus size={20} />
          </button>
        </div>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div 
              initial={{ height: 0, opacity: 0, marginTop: 0 }} 
              animate={{ height: 'auto', opacity: 1, marginTop: 16 }} 
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--hint-color)' }}>Иконка</div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '8px' }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => setNewIcon(e)} style={{ fontSize: '24px', background: newIcon === e ? 'var(--button-color)' : 'transparent', border: 'none', borderRadius: '8px', padding: '4px', cursor: 'pointer' }}>{e}</button>
                ))}
              </div>

              <div style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--hint-color)' }}>Цвет карточки</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setNewColor(c)} style={{ width: '32px', height: '32px', borderRadius: '50%', background: c, border: newColor === c ? '3px solid var(--text-color)' : '3px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>

              <input 
                type="number" 
                placeholder="Траты в день (₽) - для расчета экономии" 
                value={newDailyCost}
                onChange={(e) => setNewDailyCost(e.target.value)}
                style={{ marginBottom: '8px' }}
              />
              <textarea 
                placeholder="Личная мотивация: Почему я хочу это бросить?" 
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                rows={2}
                style={{ marginBottom: 0 }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ marginTop: '24px' }}>
        {habits.length === 0 && <p>У вас пока нет целей. Добавьте первую сверху!</p>}
        {habits.map((habit, index) => (
          <motion.div key={habit.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
            <Link to={`/habit/${habit.id}`}>
              <motion.div whileTap={{ scale: 0.98 }} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: habit.color || 'var(--secondary-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {habit.icon && <span style={{ fontSize: '32px' }}>{habit.icon}</span>}
                  <div>
                    <h3 style={{ fontSize: '18px', marginBottom: '4px', color: habit.color !== 'var(--secondary-bg)' ? '#fff' : 'inherit' }}>{habit.title}</h3>
                    <span className="badge" style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: habit.color !== 'var(--secondary-bg)' ? '#fff' : 'inherit' }}>Рекорд: {habit.bestStreak} дн.</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', color: habit.color !== 'var(--secondary-bg)' ? '#fff' : 'inherit' }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {getDaysStreak(habit.startDate)}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Дней</div>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
