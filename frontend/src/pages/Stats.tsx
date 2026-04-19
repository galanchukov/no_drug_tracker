import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../api/firebase";
import { useAppStore } from "../store/useAppStore";
import { motion } from "framer-motion";
import type { MoodEntry } from "../types";

export default function Stats() {
  const { habits, user } = useAppStore();
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchMoods = async () => {
      const q = query(collection(db, "mood_entries"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      const data: MoodEntry[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as MoodEntry));
      setMoodEntries(data);
    };
    fetchMoods();
  }, [user]);

  const stats = useMemo(() => {
    let rawTotalDays = 0;
    let totalRelapses = 0;
    let totalSavedMoney = 0;

    habits.forEach(h => {
      const currentStreak = Math.floor(Math.abs(new Date().getTime() - h.startDate.toDate().getTime()) / (1000 * 60 * 60 * 24));
      rawTotalDays += currentStreak;
      totalRelapses += (h.totalRelapses || 0);
      if (h.dailyCost) {
        totalSavedMoney += currentStreak * h.dailyCost;
      }
    });

    return { totalDays: rawTotalDays, totalRelapses, totalSavedMoney };
  }, [habits]);

  const topNegativeTriggers = useMemo(() => {
    const triggerCounts: Record<string, number> = {};
    moodEntries.forEach(entry => {
      if (entry.mood <= 2 && entry.tags) {
        entry.tags.forEach(tag => {
          triggerCounts[tag] = (triggerCounts[tag] || 0) + 1;
        });
      }
    });
    
    return Object.entries(triggerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [moodEntries]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <h1>Статистика</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="card glass" style={{ textAlign: 'center', margin: 0 }}>
          <div style={{ fontSize: '14px', color: 'var(--hint-color)', marginBottom: '8px' }}>Общие дни чистоты</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--success-color)' }}>{stats.totalDays}</div>
        </div>
        <div className="card glass" style={{ textAlign: 'center', margin: 0 }}>
          <div style={{ fontSize: '14px', color: 'var(--hint-color)', marginBottom: '8px' }}>Срывов (всего)</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--danger-color)' }}>{stats.totalRelapses}</div>
        </div>
      </div>

      <div className="card glass" style={{ textAlign: 'center', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.1), rgba(0, 210, 255, 0.1))' }}>
        <div style={{ fontSize: '14px', color: 'var(--hint-color)', marginBottom: '8px' }}>Сэкономлено денег</div>
        <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#34c759' }}>{stats.totalSavedMoney} ₽</div>
        <div style={{ fontSize: '12px', color: 'var(--hint-color)', marginTop: '8px' }}>Сумма по всем активным стрикам</div>
      </div>

      {topNegativeTriggers.length > 0 && (
        <div className="card glass">
          <h2 style={{ fontSize: '18px', color: '#ff4d4d' }}>⚠️ Главные триггеры срывов</h2>
          <p style={{ fontSize: '12px', marginBottom: '16px' }}>Теги, которые чаще всего встречаются в дневнике при плохом настроении:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topNegativeTriggers.map(([tag, count], index) => (
              <div key={tag} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
                <span style={{ fontWeight: 'bold' }}>{index + 1}. {tag}</span>
                <span className="badge" style={{ background: '#ff4d4d' }}>Упоминаний: {count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 style={{ marginTop: '32px' }}>Детализация по целям</h2>
      {habits.length === 0 && <p>У вас еще нет целей.</p>}
      {habits.map((habit) => {
        const currentStreak = Math.floor(Math.abs(new Date().getTime() - habit.startDate.toDate().getTime()) / (1000 * 60 * 60 * 24));
        const saved = (habit.dailyCost || 0) * currentStreak;

        return (
          <Link key={habit.id} to={`/habit/${habit.id}`}>
            <motion.div whileTap={{ scale: 0.98 }} className="card glass" style={{ borderLeft: `4px solid ${habit.color || 'var(--button-color)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>{habit.icon} {habit.title}</h3>
                  <div style={{ fontSize: '12px', color: 'var(--hint-color)' }}>Сэкономлено: {saved} ₽</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{currentStreak} дн.</div>
                  <div style={{ fontSize: '12px', color: 'var(--danger-color)' }}>Срывов: {habit.totalRelapses}</div>
                </div>
              </div>
            </motion.div>
          </Link>
        )
      })}
    </motion.div>
  );
}
