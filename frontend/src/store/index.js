import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client';

export const useStore = create(
  persist(
    (set, get) => ({
      // ── Auth ───────────────────────────────────────────────────────────
      user:  null,
      token: null,
      _authChecked: false,

      // ── Startup-Verifikation ─────────────────────────────────────────
      // Wird einmalig beim App-Start aufgerufen. Prüft ob ein Token im
      // localStorage existiert UND ob der Server ihn noch akzeptiert.
      // Verhindert: Flash-of-Content → 401 → Redirect bei abgelaufenem Token.
      verifySession: async () => {
        const token = localStorage.getItem('kl_token');
        if (!token) {
          set({ user: null, token: null, _authChecked: true });
          return false;
        }
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data, token, _authChecked: true });
          return true;
        } catch {
          // Token ungültig/abgelaufen — aufräumen
          localStorage.removeItem('kl_token');
          set({ user: null, token: null, activeCourse: null, progress: {},
                _coursesCache: null, courses: [], _authChecked: true });
          return false;
        }
      },

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('kl_token', data.token);
        set({ user: data.user, token: data.token });

        // ── Streak-Achievement Toast ─────────────────────────────────────────
        const streak = data.user?.streak ?? 0;
        const streakMilestones = [
          { n: 3,  label: '🔥 3 Tage Streak! Achievement freigeschaltet!' },
          { n: 7,  label: '💪 7 Tage Streak! "Woche durch" freigeschaltet!' },
          { n: 30, label: '🏆 30 Tage Streak! Monats-Champion freigeschaltet!' },
        ];
        for (const { n, label } of streakMilestones) {
          if (streak === n) {
            setTimeout(() => get().addToast(label, 'ok'), 800);
            break;
          }
        }

        return data;
      },

      register: async (email, name, password) => {
        const { data } = await api.post('/auth/register', { email, name, password });
        localStorage.setItem('kl_token', data.token);
        set({ user: data.user, token: data.token });
        return data;
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (_) { /* Token bereits abgelaufen — ignorieren */ }
        localStorage.removeItem('kl_token');
        set({ user: null, token: null, activeCourse: null, progress: {},
              _coursesCache: null, courses: [] });
      },

      refreshUser: async () => {
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data });
        } catch {}
      },

      // ── Course selection ───────────────────────────────────────────────
      activeCourse: null,
      setActiveCourse: (course) => set({ activeCourse: course }),

      // ── Progress cache ─────────────────────────────────────────────────
      progress: {},   // { [pairId]: { [lessonId]: progressRow } }

      loadCourses: async (force = false) => {
        const cache = get()._coursesCache;
        const AGE_MS = 5 * 60 * 1000; // 5 Minuten
        if (!force && cache && (Date.now() - cache.loadedAt) < AGE_MS) {
          return cache.data; // Cache-Hit
        }
        try {
          const { data } = await api.get('/courses');
          set({ courses: data, _coursesCache: { data, loadedAt: Date.now() } });
          return data;
        } catch { return get().courses; }
      },

      loadProgress: async (pairId) => {
        try {
          const { data } = await api.get(`/progress/${pairId}`);
          const map = {};
          data.forEach(r => { map[r.lesson_id] = r; });
          set(s => ({ progress: { ...s.progress, [pairId]: map } }));
        } catch {}
      },

      completeLesson: async (lessonId, pairId, xpEarned, accuracy) => {
        try {
          // Send hearts_remaining so the backend can persist hearts lost during the lesson
          const heartsRemaining = get().session?.hearts ?? get().user?.hearts ?? 5;
          const { data } = await api.post('/progress/complete', {
            lesson_id: lessonId, pair_id: pairId,
            xp_earned: xpEarned, accuracy,
            hearts_remaining: heartsRemaining,
          });
          // Sync ALL fields returned from server — including hearts
          const prevUser = get().user;
          const prevLevel = prevUser?.level ?? 1;
          const prevXp    = prevUser?.total_xp ?? 0;

          set(s => ({
            user: s.user ? {
              ...s.user,
              total_xp:           data.total_xp           ?? s.user.total_xp,
              streak:             data.streak             ?? s.user.streak,
              gems:               data.gems               ?? s.user.gems,
              hearts:             data.hearts             ?? s.user.hearts,
              next_regen_minutes: data.next_regen_minutes ?? 0,
              level:              data.level              ?? s.user.level,
            } : s.user
          }));

          // ── Level-Up Toast ───────────────────────────────────────────────────
          const newLevel = data.level ?? prevLevel;
          if (newLevel > prevLevel) {
            get().addToast(`🎉 Level ${newLevel} erreicht! Weiter so!`, 'ok');
          }

          // ── Achievement Toast (erste 3 Sekunden nach Abschluss) ──────────────
          // Prüfe ob neue Achievements freigeschaltet wurden basierend auf XP-Schwellen
          const newXp = data.total_xp ?? prevXp;
          const xpMilestones = [
            { xp: 100,  label: '⚡ XP-Starter freigeschaltet!' },
            { xp: 500,  label: '⚡ XP-Sammler freigeschaltet!' },
            { xp: 1000, label: '💎 XP-Meister freigeschaltet!' },
          ];
          for (const { xp, label } of xpMilestones) {
            if (prevXp < xp && newXp >= xp) {
              setTimeout(() => get().addToast(label, 'ok'), 1200);
              break;
            }
          }

          await get().loadProgress(pairId);
          return data;
        } catch (err) {
          console.error('completeLesson failed:', err.message);
          return null;
        }
      },

      // ── Lesson session (in-memory only) ────────────────────────────────
      session: null,

      startSession: (lesson) => {
        // Use the user's actual current hearts (may be < 5 if they lost some).
        const userHearts = get().user?.hearts ?? 5;
        set({
          session: {
            lesson,
            exercises:      lesson.exercises || [],
            current:        0,
            hearts:         userHearts,
            prevHearts:     userHearts,
            correct:        0,
            total:          0,
            answered:       false,
            lastCorrect:    false,
            unlimitedActive: false, // will be resolved async below
            gameOver:       false,
          }
        });
        // Check if unlimited is active — fire-and-forget, updates session once resolved
        api.get('/shop/active').then(r => {
          if (r.data?.unlimited) {
            const s = get().session;
            if (s) set({ session: { ...s, unlimitedActive: true } });
          }
        }).catch(() => {});
      },

      submitAnswer: async (exerciseId, userAnswer) => {
        const s = get().session;
        if (!s) return { correct: false, correct_answer: '', xp_gained: 0 };
        const { data } = await api.post(`/lessons/${s.lesson.id}/submit`, {
          exercise_id: exerciseId,
          user_answer: userAnswer,
        });
        set(st => {
          const unlimitedActive = st.session?.unlimitedActive ?? false;
          const newHearts = (!data.correct && !unlimitedActive)
            ? Math.max(0, st.session.hearts - 1)
            : st.session.hearts;

          // Inject correct_answer from server into the exercise so the UI
          // can show feedback. The answer field is stripped from GET responses
          // (security: prevents cheating) but returned by POST /submit.
          const updatedExercises = st.session.exercises.map(ex =>
            ex.id === exerciseId ? { ...ex, answer: data.correct_answer } : ex
          );

          const newState = {
            ...st.session,
            exercises:   updatedExercises,
            answered:    true,
            lastCorrect: data.correct,
            prevHearts:  st.session.hearts,
            hearts:      newHearts,
            correct:     data.correct ? st.session.correct + 1 : st.session.correct,
            total:       st.session.total + 1,
          };
          return { session: newState };
        });
        // Update user XP/gems locally from response instead of extra API call
        if (data.correct && data.xp_gained > 0) {
          set(s => ({
            user: s.user ? {
              ...s.user,
              total_xp: (s.user.total_xp || 0) + data.xp_gained,
              gems:     (s.user.gems     || 0) + 1,
            } : s.user,
          }));
        }
        return data;
      },

      nextExercise: () => {
        const s = get().session;
        if (!s) return;
        const next = s.current + 1;
        if (next >= s.exercises.length) {
          set(st => ({ session: { ...st.session, finished: true } }));
        } else {
          set(st => ({ session: { ...st.session, current: next, answered: false, lastCorrect: false, prevHearts: st.session.hearts } }));
        }
      },

      endSession: () => set({ session: null }),

      // Herz abziehen ohne answered=true zu setzen (für Match-Typ falsche Paare)
      loseHeart: () => {
        const s = get().session;
        if (!s) return;
        // Unlimited active → no deduction
        if (s.unlimitedActive) return;
        set(st => ({
          session: {
            ...st.session,
            prevHearts: st.session.hearts,
            hearts: Math.max(0, st.session.hearts - 1),
          }
        }));
      },

      // ── Toasts ─────────────────────────────────────────────────────────
      toasts: [],
      addToast: (msg, type = 'ok') => {
        const id = Date.now();
        set(s => ({ toasts: [...s.toasts, { id, msg, type }] }));
        setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 3200);
      },
    }),
    {
      name: 'kurdolingo',
      // Persist user + course data. Token lives in localStorage (kl_token).
      // verifySession() re-syncs both on app startup.
      partialize: s => ({ user: s.user, token: s.token, activeCourse: s.activeCourse, _coursesCache: s._coursesCache, courses: s.courses }),
    }
  )
);
