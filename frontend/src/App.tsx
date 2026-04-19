import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ListTodo, BookOpen, Activity, LoaderCircle } from "lucide-react";
import { auth, db } from "./api/firebase";
import { useAppStore } from "./store/useAppStore";
import "./index.css";

// Pages
import Home from "./pages/Home";
import HabitDetail from "./pages/HabitDetail";
import Diary from "./pages/Diary";
import Logs from "./pages/Logs";

const tg = window.Telegram?.WebApp;

function BottomNav() {
  const location = useLocation();
  
  return (
    <nav className="bottom-nav">
      <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
        <ListTodo size={24} />
        <span>Habits</span>
      </Link>
      <Link to="/diary" className={`nav-item ${location.pathname === '/diary' ? 'active' : ''}`}>
        <BookOpen size={24} />
        <span>Diary</span>
      </Link>
      <Link to="/logs" className={`nav-item ${location.pathname === '/logs' ? 'active' : ''}`}>
        <Activity size={24} />
        <span>Logs</span>
      </Link>
    </nav>
  );
}

function App() {
  const { user, setUser, setLoading, isLoading } = useAppStore();

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
        const uid = cred.user.uid;
        
        let targetUsername = tg?.initDataUnsafe?.user?.username || tg?.initDataUnsafe?.user?.first_name || "Anonymous";

        const userRef = doc(db, "users", uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          await setDoc(userRef, {
            uid: uid,
            username: targetUsername,
            createdAt: serverTimestamp(),
            achievements: []
          });
        }
        
        setUser({
          uid: uid,
          username: targetUsername,
          createdAt: new Date(),
          achievements: []
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
        getDoc(doc(db, "users", userAuth.uid)).then(docSnap => {
          if (docSnap.exists()) {
             setUser({
               uid: docSnap.data().uid,
               username: docSnap.data().username,
               createdAt: docSnap.data().createdAt,
               achievements: docSnap.data().achievements || []
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
        <p>Loading your space...</p>
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
        </Routes>
      </div>
      <BottomNav />
    </BrowserRouter>
  );
}

export default App;
