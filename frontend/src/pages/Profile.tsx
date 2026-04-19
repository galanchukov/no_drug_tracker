import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../api/firebase";
import { useAppStore } from "../store/useAppStore";
import { motion } from "framer-motion";
import { Edit2, Save, Award } from "lucide-react";
import confetti from "canvas-confetti";

export default function Profile() {
  const { user, habits } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || "");
  const [isSaving, setIsSaving] = useState(false);

  // Gamification: 1 clean day = 10 XP
  // Level threshold = level * 100 XP
  const calcExperience = () => {
    let xp = 0;
    habits.forEach(h => {
      if (h.startDate) {
        const streak = Math.floor(Math.abs(new Date().getTime() - h.startDate.toDate().getTime()) / (1000 * 60 * 60 * 24));
        xp += streak * 10;
      }
    });
    return xp;
  };

  const xpAmount = calcExperience();
  const currentLevel = Math.floor(xpAmount / 100) + 1;
  const progressPercent = ((xpAmount % 100) / 100) * 100;

  const handleSave = async () => {
    if (!user || isSaving) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        username: username,
        level: currentLevel,
        xp: xpAmount
      });
      setIsEditing(false);
      window.Telegram?.WebApp.showAlert("Профиль обновлен");
    } catch (e) {
      console.error(e);
      window.Telegram?.WebApp.showAlert("Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const getBadges = () => {
    let badges = [];
    const maxStreak = Math.max(...habits.map(h => h.bestStreak || 0), 0);
    
    if (maxStreak >= 3) badges.push({ id: 1, name: "Первые шаги", desc: "3 дня без срывов", icon: "🌱" });
    if (maxStreak >= 7) badges.push({ id: 2, name: "Неделя чистоты", desc: "7 дней", icon: "🥉" });
    if (maxStreak >= 30) badges.push({ id: 3, name: "Стальная воля", desc: "30 дней", icon: "🥈" });
    if (maxStreak >= 90) badges.push({ id: 4, name: "Новый человек", desc: "90 дней", icon: "🥇" });
    if (maxStreak >= 365) badges.push({ id: 5, name: "Магистр преодоления", desc: "1 год!", icon: "👑" });
    
    return badges;
  };

  const userBadges = getBadges();

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0 }}>Ваш профиль</h1>
        {!isEditing ? (
          <button className="btn" style={{ width: 'auto', padding: '8px' }} onClick={() => setIsEditing(true)}>
            <Edit2 size={20} />
          </button>
        ) : (
          <button className="btn" style={{ width: 'auto', padding: '8px', background: 'var(--button-color)' }} onClick={handleSave} disabled={isSaving}>
            <Save size={20} />
          </button>
        )}
      </div>

      <div className="card" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <motion.div 
          onClick={triggerConfetti}
          whileTap={{ scale: 0.9 }}
          style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--button-color), #8a2be2)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {currentLevel}
        </motion.div>
        
        {isEditing ? (
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold' }}
          />
        ) : (
          <h2 style={{ margin: '0 0 8px 0' }}>{user?.username || "Аноним"}</h2>
        )}
        
        <p style={{ color: 'var(--hint-color)', fontSize: '14px', margin: '0 0 16px 0' }}>
          Уровень {currentLevel} • {xpAmount} XP
        </p>

        <div style={{ width: '100%', height: '8px', background: 'var(--secondary-bg)', borderRadius: '4px', overflow: 'hidden' }}>
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${progressPercent}%` }} 
            transition={{ duration: 1 }}
            style={{ height: '100%', background: 'var(--button-color)' }} 
          />
        </div>
        <div style={{ fontSize: '12px', color: 'var(--hint-color)', marginTop: '8px' }}>
          {xpAmount % 100} / 100 XP до следующего уровня
        </div>
      </div>

      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Award size={24} /> Ваши достижения</h2>
      
      {userBadges.length === 0 ? (
        <p style={{ color: 'var(--hint-color)' }}>У вас пока нет достижений. Держитесь у цели, чтобы получить первые награды!</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {userBadges.map((badge, index) => (
            <motion.div 
              key={badge.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="card"
              onClick={triggerConfetti}
              style={{ textAlign: 'center', cursor: 'pointer' }}
            >
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>{badge.icon}</div>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{badge.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--hint-color)', marginTop: '4px' }}>{badge.desc}</div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
