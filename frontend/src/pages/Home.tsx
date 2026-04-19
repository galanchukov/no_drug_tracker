import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../api/firebase";
import { useAppStore } from "../store/useAppStore";
import type { Habit } from "../types";
import { Plus } from "lucide-react";

export default function Home() {
  const { user, habits, setHabits } = useAppStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "habits"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedHabits: Habit[] = [];
      snapshot.forEach((doc) => {
        fetchedHabits.push({ id: doc.id, ...doc.data() } as Habit);
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
        startDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        currentStreak: 0,
        bestStreak: 0,
        totalRelapses: 0
      });
      setNewTitle("");
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
    <div>
      <h1>Мои привычки</h1>
      
      <div className="card">
        <h2>Добавить привычку</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="Напр. Сладкое, Курение..." 
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ marginBottom: 0 }}
          />
          <button className="btn" style={{ width: 'auto' }} onClick={handleCreate} disabled={isCreating}>
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        {habits.length === 0 && <p>У вас пока нет привычек. Добавьте первую сверху!</p>}
        {habits.map((habit) => (
          <Link key={habit.id} to={`/habit/${habit.id}`}>
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>{habit.title}</h3>
                <span className="badge">Рекорд: {habit.bestStreak} дн.</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {getDaysStreak(habit.startDate)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--hint-color)' }}>Дней</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
