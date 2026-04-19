import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../api/firebase";
import { useAppStore } from "../store/useAppStore";
import type { MoodEntry } from "../types";
import { Send, Trash2, Edit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PREDEFINED_TAGS = ["Семья", "Работа", "Стресс", "Скука", "Тусовка", "Усталость", "Одиночество", "Болезнь", "Достижение"];

export default function Diary() {
  const { user } = useAppStore();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [mood, setMood] = useState<number>(3);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editComment, setEditComment] = useState("");

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "mood_entries"), 
      where("userId", "==", user.uid)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const data: MoodEntry[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as MoodEntry));
      data.sort((a, b) => {
        const timeA = a.date?.toMillis ? a.date.toMillis() : Date.now();
        const timeB = b.date?.toMillis ? b.date.toMillis() : Date.now();
        return timeB - timeA;
      });
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
        tags: selectedTags,
        date: serverTimestamp()
      });
      setComment("");
      setMood(3);
      setSelectedTags([]);
      window.Telegram?.WebApp.HapticFeedback.notificationOccurred("success");
    } catch (e) {
      console.error(e);
      window.Telegram?.WebApp.showAlert("Ошибка при сохранении");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (tag: string) => {
    window.Telegram?.WebApp.HapticFeedback.selectionChanged();
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleDelete = async (id: string | undefined) => {
    if (!id) return;
    window.Telegram?.WebApp.showConfirm("Удалить запись?", async (confirmed: boolean) => {
      if (confirmed) {
        await deleteDoc(doc(db, "mood_entries", id));
      }
    });
  }

  const handleUpdate = async (id: string | undefined) => {
    if (!id) return;
    await updateDoc(doc(db, "mood_entries", id), { comment: editComment });
    setEditingId(null);
  }

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
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
      <h1>Дневник настроения</h1>

      <div className="card glass">
        <h2>Как вы себя чувствуете сегодня?</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          {[1,2,3,4,5].map(val => (
            <motion.button 
              key={val} 
              whileTap={{ scale: 0.8 }}
              onClick={() => {
                setMood(val);
                window.Telegram?.WebApp.HapticFeedback.selectionChanged();
              }}
              style={{
                fontSize: '36px', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer',
                opacity: mood === val ? 1 : 0.3,
                transform: mood === val ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.2s',
                textShadow: mood === val ? '0 0 10px rgba(255,255,255,0.5)' : 'none'
              }}
            >
              {getEmojiForMood(val)}
            </motion.button>
          ))}
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {PREDEFINED_TAGS.map(t => (
            <button 
              key={t} 
              className={`tag-btn ${selectedTags.includes(t) ? 'active' : ''}`}
              onClick={() => toggleTag(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <textarea 
          placeholder="Почему вы так себя чувствуете? Запишите свои мысли..." 
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          style={{ background: 'rgba(255,255,255,0.05)' }}
        />
        
        <motion.button whileTap={{ scale: 0.95 }} className="btn" onClick={handleSubmit} disabled={isSubmitting}>
          <Send size={20} style={{ marginRight: '8px' }}/>
          Сохранить дневник
        </motion.button>
      </div>

      <h2>Прошлые записи</h2>
      {entries.length === 0 && <p>Пока нет записей.</p>}
      <AnimatePresence>
        {entries.map((entry, index) => (
          <motion.div 
            key={entry.id} 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0, padding: 0, margin: 0 }}
            transition={{ delay: index * 0.05 }}
            className="card" 
            style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}
          >
            <div style={{ fontSize: '32px', transform: 'translateY(-4px)' }}>{getEmojiForMood(entry.mood)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '12px', color: 'var(--hint-color)' }}>
                  {entry.date ? entry.date.toDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : 'Только что'}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {editingId !== entry.id && (
                    <button onClick={() => { setEditingId(entry.id || null); setEditComment(entry.comment); }} style={{ background: 'none', border: 'none', color: 'var(--hint-color)', cursor: 'pointer', padding: 0 }}>
                      <Edit size={14} />
                    </button>
                  )}
                  <button onClick={() => handleDelete(entry.id)} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', padding: 0 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              {entry.tags && entry.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {entry.tags.map(t => (
                    <span key={t} style={{ fontSize: 10, background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 8, color: 'var(--hint-color)' }}>{t}</span>
                  ))}
                </div>
              )}

              {editingId === entry.id ? (
                <div style={{ marginTop: 8 }}>
                  <textarea value={editComment} onChange={e => setEditComment(e.target.value)} rows={2} style={{ marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn" style={{ padding: '4px 8px', width: 'auto' }} onClick={() => handleUpdate(entry.id)}>Сохр.</button>
                    <button className="btn" style={{ padding: '4px 8px', width: 'auto', background: 'transparent', color: 'var(--text-color)' }} onClick={() => setEditingId(null)}>Отмена</button>
                  </div>
                </div>
              ) : (
                entry.comment && <div style={{ marginTop: '8px', lineHeight: 1.4 }}>{entry.comment}</div>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
