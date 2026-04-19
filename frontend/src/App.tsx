import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { signInWithCustomToken } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { ListTodo, BookOpen, Activity, LoaderCircle } from "lucide-react";
import { app, auth, functions } from "./api/firebase";
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
        const initData = tg?.initData || "";
        
        if (!initData && import.meta.env.MODE === "development") {
          // Dev mock fallback - replace in production if needed, or enforce Telegram only
          console.warn("Running in dev mode without Telegram context.");
          setLoading(false);
          return;
        }

        const authWithTelegram = httpsCallable(functions, 'authWithTelegram');
        const result = await authWithTelegram({ initData });
        const { customToken, uid } = result.data as { customToken: string, uid: string };
        
        await signInWithCustomToken(auth, customToken);
        
        // Listen to auth state and fetch user profile
        auth.onAuthStateChanged((user) => {
          if (user) {
            setUser({
              uid: user.uid,
              username: tg?.initDataUnsafe?.user?.username || "User",
              createdAt: new Date(),
              achievements: []
            });
          } else {
            setUser(null);
          }
          setLoading(false);
        });

      } catch (error) {
        console.error("Auth failed:", error);
        setLoading(false);
      }
    };

    authenticate();
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
