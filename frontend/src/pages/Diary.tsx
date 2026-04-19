import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../api/firebase";
import { useAppStore } from "../store/useAppStore";
import { MoodEntry } from "../types";
import { Send } from "lucide-react";

export default function Diary() {
  const { user } = useAppStore();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [mood, setMood] = useState<number>(3);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "mood_entries"), 
      where("userId", "==", user.uid),
      orderBy("date", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data: MoodEntry[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as MoodEntry));
      setEntries(data);
    });
    return () => unsub();
  }, [user]);

  const handleSubmit = async () => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "mood_entries"), {
        userId: user.uid,
        mood,
        comment,
        date: serverTimestamp()
      });
      setComment("");
      setMood(3);
    } catch (e) {
      console.error(e);
      window.Telegram?.WebApp.showAlert("Error saving mood");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEmojiForMood = (m: number) => {
    switch (m) {
      case 1: return "😢";
      case 2: return "🙁";
      case 3: return "😐";
      case 4: return "🙂";
      case 5: return "😁";
      default: return "😐";
    }
  };

  return (
    <div>
      <h1>Mood Diary</h1>

      <div className="card">
        <h2>How are you feeling today?</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          {[1,2,3,4,5].map(val => (
            <button 
              key={val} 
              onClick={() => setMood(val)}
              style={{
                fontSize: '32px', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                opacity: mood === val ? 1 : 0.4,
                transform: mood === val ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.2s'
              }}
            >
              {getEmojiForMood(val)}
            </button>
          ))}
        </div>
        
        <textarea 
          placeholder="Why do you feel this way? (optional)" 
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />
        
        <button className="btn" onClick={handleSubmit} disabled={isSubmitting}>
          <Send size={20} style={{ marginRight: '8px' }}/>
          Save Entry
        </button>
      </div>

      <h2>Past Entries</h2>
      {entries.length === 0 && <p>No entries yet.</p>}
      {entries.map(entry => (
        <div key={entry.id} className="card" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ fontSize: '32px' }}>{getEmojiForMood(entry.mood)}</div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--hint-color)' }}>
              {entry.date ? entry.date.toDate().toLocaleString() : 'Just now'}
            </div>
            {entry.comment && <div style={{ marginTop: '4px' }}>{entry.comment}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
