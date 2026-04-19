import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { motion } from "framer-motion";

export default function Stats() {
  const { habits } = useAppStore();

  const totalSaved = useMemo(() => {
    let saved = 0;
    habits.forEach(h => {
      if (h.dailyCost && h.startDate) {
        const days = Math.floor(Math.abs(new Date().getTime() - h.startDate.toDate().getTime()) / (1000 * 60 * 60 * 24));
        saved += days * h.dailyCost;
      }
    });
    return saved;
  }, [habits]);

  const totalCleanDays = useMemo(() => {
    let days = 0;
    habits.forEach(h => {
      if (h.startDate) {
        days += Math.floor(Math.abs(new Date().getTime() - h.startDate.toDate().getTime()) / (1000 * 60 * 60 * 24));
      }
    });
    return days;
  }, [habits]);

  const totalRelapses = useMemo(() => {
    return habits.reduce((acc, curr) => acc + (curr.totalRelapses || 0), 0);
  }, [habits]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <h1>Статистика</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: 'var(--hint-color)', marginBottom: '8px' }}>Общая чистота</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalCleanDays} дн.</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: 'var(--hint-color)', marginBottom: '8px' }}>Сэкономлено</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalSaved} ₽</div>
        </div>
        <div className="card" style={{ textAlign: 'center', gridColumn: 'span 2' }}>
          <div style={{ fontSize: '14px', color: 'var(--hint-color)', marginBottom: '8px' }}>Всего срывов по всем целям</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalRelapses}</div>
        </div>
      </div>

      <h2>Цели</h2>
      {habits.length === 0 && <p>У вас еще нет целей.</p>}
      {habits.map((habit, index) => {
          const streak = Math.floor(Math.abs(new Date().getTime() - habit.startDate.toDate().getTime()) / (1000 * 60 * 60 * 24));
          const saved = (habit.dailyCost || 0) * streak;
          
          return (
            <motion.div key={habit.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1 }}>
              <Link to={`/habit/${habit.id}`}>
                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: habit.color || 'var(--secondary-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {habit.icon && <span style={{ fontSize: '28px' }}>{habit.icon}</span>}
                    <div>
                      <h3 style={{ fontSize: '18px', margin: 0, color: habit.color ? '#fff' : 'inherit' }}>{habit.title}</h3>
                      {habit.dailyCost && <div style={{ fontSize: '12px', color: habit.color ? '#eee' : 'var(--hint-color)', marginTop: 4 }}>Экономия: {habit.dailyCost} ₽/день</div>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', color: habit.color ? '#fff' : 'inherit' }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{saved} ₽</div>
                  </div>
                </div>
              </Link>
            </motion.div>
          )
      })}
    </motion.div>
  );
}
