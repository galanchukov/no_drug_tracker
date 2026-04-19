import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../api/firebase";
import { useAppStore } from "../store/useAppStore";
import { ActivityLog, Habit } from "../types";
import { Plus } from "lucide-react";

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
      where("userId", "==", user.uid),
      orderBy("date", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data: ActivityLog[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as ActivityLog));
      setLogs(data);
    });
    return () => unsub();
  }, [user]);

  // Default to first habit if none selected
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
        actionName: habit.title, // or ask user to input specific action
        amount,
        date: serverTimestamp()
      });
      setAmount(1);
    } catch (e) {
      console.error(e);
      window.Telegram?.WebApp.showAlert("Error saving log");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getHabitTitle = (id: string) => {
    return habits.find(h => h.id === id)?.title || "Unknown Habit";
  };

  return (
    <div>
      <h1>Activity Tracker</h1>

      <div className="card">
        <h2>Log Substance/Action</h2>
        <p style={{ marginBottom: '16px' }}>Track instances without necessarily resetting your streak (e.g. tracking how many cigarettes while reducing).</p>
        
        {habits.length === 0 ? (
          <p>Please create a habit first.</p>
        ) : (
          <>
            <select 
              value={selectedHabitId} 
              onChange={(e) => setSelectedHabitId(e.target.value)}
            >
              {habits.map(h => (
                <option key={h.id} value={h.id}>{h.title}</option>
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
              <button className="btn" style={{ width: 'auto' }} onClick={handleSubmit} disabled={isSubmitting}>
                <Plus size={20} /> Add
              </button>
            </div>
          </>
        )}
      </div>

      <h2>Recent Logs</h2>
      {logs.length === 0 && <p>No logs yet.</p>}
      {logs.map(log => (
        <div key={log.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{getHabitTitle(log.habitId)}</div>
            <div style={{ fontSize: '12px', color: 'var(--hint-color)' }}>
              {log.date ? log.date.toDate().toLocaleString() : 'Just now'}
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
            +{log.amount}
          </div>
        </div>
      ))}
    </div>
  );
}
