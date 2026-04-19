import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "../api/firebase";
import { useAppStore } from "../store/useAppStore";
import type { ActivityLog } from "../types";
import { Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Logs() {
  const { user, habits } = useAppStore();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [selectedHabitId, setSelectedHabitId] = useState("");
  const [amount, setAmount] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "activity_logs"), 
      where("userId", "==", user.uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data: ActivityLog[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as ActivityLog));
      data.sort((a, b) => {
        const timeA = a.date?.toMillis ? a.date.toMillis() : Date.now();
        const timeB = b.date?.toMillis ? b.date.toMillis() : Date.now();
        return timeB - timeA;
      });
      setLogs(data);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (habits.length > 0 && !selectedHabitId) {
      setSelectedHabitId(habits[0].id || "");
    }
  }, [habits, selectedHabitId]);

  const handleSubmit = async () => {
    if (!user || isSubmitting || !selectedHabitId) return;
    
    const habit = habits.find(h => h.id === selectedHabitId);
    if (!habit) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "activity_logs"), {
        userId: user.uid,
        habitId: selectedHabitId,
        actionName: habit.title,
        amount,
        date: serverTimestamp()
      });
      setAmount(1);
      window.Telegram?.WebApp.HapticFeedback.notificationOccurred("success");
    } catch (e) {
      console.error(e);
      window.Telegram?.WebApp.showAlert("Ошибка при сохранении");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string | undefined) => {
    if (!id) return;
    window.Telegram?.WebApp.showConfirm("Удалить этот лог?", async (confirmed: boolean) => {
      if (confirmed) {
        await deleteDoc(doc(db, "activity_logs", id));
      }
    });
  };

  const getHabit = (id: string) => {
    return habits.find(h => h.id === id);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
      <h1>Журнал активностей</h1>

      <div className="card">
        <h2>Записать дозу / срыв</h2>
        <p style={{ marginBottom: '16px' }}>Отслеживайте потребление в процессе контроля (например, сколько раз сорвались).</p>
        
        {habits.length === 0 ? (
          <p>Пожалуйста, создайте цель сначала.</p>
        ) : (
          <>
            <select 
              value={selectedHabitId} 
              onChange={(e) => setSelectedHabitId(e.target.value)}
            >
              {habits.map(h => (
                <option key={h.id} value={h.id}>{h.icon} {h.title}</option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="number" 
                min="1"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 1)}
                style={{ marginBottom: 0 }}
              />
              <motion.button whileTap={{ scale: 0.95 }} className="btn" style={{ width: 'auto' }} onClick={handleSubmit} disabled={isSubmitting}>
                <Plus size={20} /> Добавить
              </motion.button>
            </div>
          </>
        )}
      </div>

      <h2>Недавние логи</h2>
      {logs.length === 0 && <p>Пока нет логов.</p>}
      <AnimatePresence>
        {logs.map((log, index) => {
          const habitInfo = getHabit(log.habitId);
          return (
            <motion.div 
              key={log.id} 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0, margin: 0, padding: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card" 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {habitInfo?.icon} {habitInfo?.title || "Неизвестно"}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--hint-color)' }}>
                  {log.date ? log.date.toDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Только что'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                  +{log.amount}
                </div>
                <button onClick={() => handleDelete(log.id)} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: 0 }}>
                  <Trash2 size={20} />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </motion.div>
  );
}
