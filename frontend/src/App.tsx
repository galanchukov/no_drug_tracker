import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ListTodo, BookOpen, LoaderCircle, TrendingUp, UserRound } from "lucide-react";
import { auth, db } from "./api/firebase";
import { useAppStore } from "./store/useAppStore";
import "./index.css";

// Pages
import Home from "./pages/Home";
import HabitDetail from "./pages/HabitDetail";
import Diary from "./pages/Diary";
import Logs from "./pages/Logs";
import Stats from "./pages/Stats";
import Profile from "./pages/Profile";

const tg = window.Telegram?.WebApp;

function BottomNav() {
  const location = useLocation();
  
  return (
    <nav className="bottom-nav">
      <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <ListTodo size={24} />
        <span>Цели</span>
      </Link>
      <Link to="/stats" className={`nav-item ${location.pathname === '/stats' ? 'active' : ''}`}>
        <TrendingUp size={24} />
        <span>Стата</span>
      </Link>
      <Link to="/diary" className={`nav-item ${location.pathname === '/diary' ? 'active' : ''}`}>
        <BookOpen size={24} />
        <span>Дневник</span>
      </Link>
      <Link to="/profile" className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}>
        <UserRound size={24} />
        <span>Профиль</span>
      </Link>
    </nav>
  );
}

function App() {
  const { setUser, setLoading, isLoading } = useAppStore();

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      document.documentElement.style.setProperty('--bg-color', tg.themeParams.bg_color);
      document.documentElement.style.setProperty('--text-color', tg.themeParams.text_color);
      document.documentElement.style.setProperty('--button-color', tg.themeParams.button_color);
      document.documentElement.style.setProperty('--button-text-color', tg.themeParams.button_text_color);
      document.documentElement.style.setProperty('--hint-color', tg.themeParams.hint_color);
      document.documentElement.style.setProperty('--secondary-bg', tg.themeParams.secondary_bg_color);
    }

    const authenticate = async () => {
      try {
        const cred = await signInAnonymously(auth);
        const fbUid = cred.user.uid;
        
        let targetUsername = tg?.initDataUnsafe?.user?.username || tg?.initDataUnsafe?.user?.first_name || "Аноним";
        let targetUid = tg?.initDataUnsafe?.user?.id?.toString() || fbUid;

        const userRef = doc(db, "users", targetUid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          await setDoc(userRef, {
            uid: targetUid,
            username: targetUsername,
            createdAt: serverTimestamp(),
            achievements: [],
            xp: 0,
            level: 1,
          });
        }
        
        setUser({
          uid: targetUid,
          username: targetUsername,
          createdAt: new Date(),
          achievements: [],
          xp: 0,
          level: 1,
        });

      } catch (error) {
        console.error("Auth failed:", error);
      } finally {
        setLoading(false);
      }
    };

    auth.onAuthStateChanged((userAuth) => {
      if (!userAuth) {
        authenticate();
      } else {
        const fbUid = userAuth.uid;
        let targetUid = tg?.initDataUnsafe?.user?.id?.toString() || fbUid;
        let targetUsername = tg?.initDataUnsafe?.user?.username || tg?.initDataUnsafe?.user?.first_name || "Аноним";

        getDoc(doc(db, "users", targetUid)).then(async docSnap => {
          if (docSnap.exists()) {
             setUser({
               uid: docSnap.data().uid,
               username: docSnap.data().username,
               createdAt: docSnap.data().createdAt,
               achievements: docSnap.data().achievements || [],
               xp: docSnap.data().xp || 0,
               level: docSnap.data().level || 1,
             });
          } else {
             await setDoc(doc(db, "users", targetUid), {
                uid: targetUid,
                username: targetUsername,
                createdAt: serverTimestamp(),
                achievements: [],
                xp: 0,
                level: 1,
             });
             setUser({
               uid: targetUid,
               username: targetUsername,
               createdAt: new Date(),
               achievements: [],
               xp: 0,
               level: 1,
             });
          }
          setLoading(false);
        }).catch(err => {
          console.error(err);
          setLoading(false);
        });
      }
    });
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <LoaderCircle size={48} className="animate-fade" color="var(--button-color)" style={{ animation: 'spin 2s linear infinite' }} />
        <p>Загрузка данных...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="animate-fade" style={{ padding: '16px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/habit/:habitId" element={<HabitDetail />} />
          <Route path="/diary" element={<Diary />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
      <BottomNav />
    </BrowserRouter>
  );
}

export default App;
