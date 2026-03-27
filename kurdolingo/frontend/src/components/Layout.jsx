import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import Logo from './ui/Logo';
import LangPicker from './ui/LangPicker';
import { IconLogout, IconSettings } from './ui/icons';
import { useT } from '../i18n';

const MOBILE_BP = 768;

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.innerWidth < MOBILE_BP);
  useEffect(() => {
    const h = () => setM(window.innerWidth < MOBILE_BP);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return m;
}

/* ── Hamburger-Icon ──────────────────────────────────────────────────────── */
function HamburgerIcon({ open }) {
  const bar = {
    display: 'block', width: 20, height: 2, borderRadius: 2,
    background: 'var(--text-primary)', transition: 'all .25s ease',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 20, height: 16, justifyContent: 'center' }}>
      <span style={{ ...bar, transform: open ? 'rotate(45deg) translate(4px, 4px)' : 'none' }} />
      <span style={{ ...bar, opacity: open ? 0 : 1 }} />
      <span style={{ ...bar, transform: open ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }} />
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const t         = useT();
  const isMobile  = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);

  const NAV = [
    { to: '/',            icon: '🏠', label: t('nav.learn')       },
    { to: '/vocab',       icon: '📖', label: t('nav.vocab')       },
    { to: '/leaderboard', icon: '🏆', label: t('nav.leaderboard') },
    { to: '/kurdistan',   icon: '🏔️', label: t('nav.kurdistan')   },
    { to: '/community',   icon: '💬', label: t('nav.community')   },
    { to: '/shop',        icon: '🛍️', label: t('nav.shop')        },
    { to: '/profile',     icon: '👤', label: t('nav.profile')     },
  ];

  // Schließe Drawer bei Navigation
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // Schließe Drawer bei Resize auf Desktop
  useEffect(() => { if (!isMobile) setDrawerOpen(false); }, [isMobile]);

  // Body-Scroll blockieren wenn Drawer offen
  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* ══ Header ══ */}
      <header style={{
        background: 'var(--white)',
        height: 'var(--header-h)',
        display: 'flex',
        alignItems: 'center',
        padding: isMobile ? '0 12px' : '0 var(--sp-6)',
        gap: isMobile ? 8 : 'var(--sp-4)',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 200,
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>

        {/* Hamburger (Mobile) */}
        {isMobile && (
          <button
            onClick={() => setDrawerOpen(s => !s)}
            aria-label="Menü"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 4px', display: 'flex', alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <HamburgerIcon open={drawerOpen} />
          </button>
        )}

        <Logo onClick={() => navigate('/')} />

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 'var(--sp-2)' }}>
          {/* Stat-Chips */}
          <div className="stat-chip" style={isMobile ? { padding: '2px 6px' } : undefined}>
            <span className="stat-icon">🔥</span>
            <span style={{ fontWeight: 700, fontSize: isMobile ? 11 : 12 }}>
              {(user?.streak ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="stat-chip" style={isMobile ? { padding: '2px 6px' } : undefined}>
            <span className="stat-icon" style={{ color: 'var(--cyan)' }}>⚡</span>
            <span style={{ fontWeight: 700, fontSize: isMobile ? 11 : 12 }}>
              {(user?.total_xp ?? 0).toLocaleString()}
            </span>
          </div>
          {!isMobile && (
            <div className="stat-chip">
              <span className="stat-icon" style={{ color: 'var(--purple)' }}>💎</span>
              <span style={{ fontWeight: 700, fontSize: 12 }}>
                {(user?.gems ?? 0).toLocaleString()}
              </span>
            </div>
          )}

          {!isMobile && <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 var(--sp-1)' }} />}

          {user?.role === 'admin' && !isMobile && (
            <button
              className="btn btn-sm btn-danger"
              onClick={() => navigate('/admin')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}
            >
              <IconSettings style={{ width: 12, height: 12 }} />
              {t('nav.admin')}
            </button>
          )}

          {!isMobile && <LangPicker />}

          {/* Avatar */}
          <button
            onClick={() => navigate('/profile')}
            style={{
              width: isMobile ? 30 : 36, height: isMobile ? 30 : 36,
              borderRadius: 'var(--r-md)',
              background: 'linear-gradient(135deg, var(--teal) 0%, var(--teal-dk) 100%)',
              color: '#fff', fontWeight: 800, fontSize: isMobile ? 12 : 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--teal-lt)',
              cursor: 'pointer', flexShrink: 0,
              transition: 'transform var(--dur-fast) var(--ease)',
              fontFamily: 'var(--font)',
            }}
          >
            {(user?.name?.[0] ?? '?').toUpperCase()}
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>

        {/* ══ Desktop-Sidebar ══ */}
        {!isMobile && (
          <nav style={{
            width: 'var(--sidebar-w)',
            background: 'var(--white)',
            padding: 'var(--sp-4) var(--sp-3)',
            display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0,
            borderRight: '1px solid var(--border)',
          }}>
            {NAV.map(({ to, icon, label }) => (
              <NavLink
                key={to} to={to} end={to === '/'}
                className="nav-link-side"
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 'var(--r-md)',
                  textDecoration: 'none', fontWeight: 700, fontSize: 14,
                  background: isActive ? 'var(--teal-xlt)' : 'transparent',
                  color: isActive ? 'var(--teal)' : 'var(--text-secondary)',
                  transition: 'all var(--dur-fast) var(--ease)',
                  borderLeft: isActive ? '3px solid var(--teal)' : '3px solid transparent',
                })}
              >
                <span style={{ fontSize: 18, width: 24, textAlign: 'center', lineHeight: 1 }}>{icon}</span>
                {label}
              </NavLink>
            ))}

            <div style={{ flex: 1, minHeight: 'var(--sp-4)' }} />

            <button
              onClick={handleLogout}
              className="nav-link-side"
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px', borderRadius: 'var(--r-md)', border: 'none',
                background: 'transparent', color: 'var(--text-muted)',
                fontFamily: 'var(--font)', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', width: '100%',
                transition: 'color var(--dur-fast), background var(--dur-fast)',
              }}
            >
              <IconLogout style={{ width: 16, height: 16, flexShrink: 0 }} />
              {t('nav.logout')}
            </button>

            {/* Legal footer links */}
            <div style={{
              borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 10,
              display: 'flex', flexWrap: 'wrap', gap: '4px 12px', paddingInline: 14,
            }}>
              {[
                { to: '/impressum', label: 'Impressum' },
                { to: '/datenschutz', label: 'Datenschutz' },
                { to: '/nutzungsbedingungen', label: 'Nutzungsbedingungen' },
              ].map(l => (
                <NavLink key={l.to} to={l.to} style={{
                  fontSize: 10, color: 'var(--text-muted)', textDecoration: 'none',
                  fontWeight: 600, lineHeight: 2,
                }}>{l.label}</NavLink>
              ))}
            </div>
          </nav>
        )}

        {/* ══ Main content ══ */}
        <main style={{ flex: 1, overflow: 'auto', paddingBottom: isMobile ? 20 : 80 }}>
          <Outlet />
        </main>
      </div>

      {/* ══ Mobile Drawer (Overlay + Slide-Out) ══ */}
      {isMobile && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,.45)',
              zIndex: 298,
              opacity: drawerOpen ? 1 : 0,
              pointerEvents: drawerOpen ? 'auto' : 'none',
              transition: 'opacity .25s ease',
              backdropFilter: drawerOpen ? 'blur(4px)' : 'none',
            }}
          />

          {/* Drawer */}
          <div
            ref={drawerRef}
            style={{
              position: 'fixed',
              top: 0, left: 0, bottom: 0,
              width: 280,
              background: 'var(--white)',
              zIndex: 299,
              transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
              display: 'flex', flexDirection: 'column',
              boxShadow: drawerOpen ? '4px 0 24px rgba(0,0,0,.12)' : 'none',
              overflowY: 'auto',
            }}
          >
            {/* Drawer-Header */}
            <div style={{
              padding: '20px 20px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: 'linear-gradient(135deg, var(--teal) 0%, var(--teal-dk) 100%)',
                color: '#fff', fontWeight: 800, fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {(user?.name?.[0] ?? '?').toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{
                  fontSize: 15, fontWeight: 800, color: 'var(--text-primary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                  Level {user?.level ?? 1} · 💎 {(user?.gems ?? 0).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 18, color: 'var(--text-muted)', padding: 4,
                }}
              >✕</button>
            </div>

            {/* Nav-Links */}
            <div style={{ padding: '12px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {NAV.map(({ to, icon, label }) => (
                <NavLink
                  key={to} to={to} end={to === '/'}
                  onClick={() => setDrawerOpen(false)}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', borderRadius: 12,
                    textDecoration: 'none', fontWeight: 700, fontSize: 15,
                    background: isActive ? 'var(--teal-xlt)' : 'transparent',
                    color: isActive ? 'var(--teal)' : 'var(--text-primary)',
                    transition: 'all .15s',
                    borderLeft: isActive ? '3px solid var(--teal)' : '3px solid transparent',
                  })}
                >
                  <span style={{ fontSize: 20, width: 28, textAlign: 'center', lineHeight: 1 }}>{icon}</span>
                  {label}
                </NavLink>
              ))}

              {user?.role === 'admin' && (
                <NavLink
                  to="/admin"
                  onClick={() => setDrawerOpen(false)}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 16px', borderRadius: 12,
                    textDecoration: 'none', fontWeight: 700, fontSize: 15,
                    background: isActive ? 'rgba(224,72,72,.08)' : 'transparent',
                    color: isActive ? 'var(--red)' : 'var(--red)',
                    marginTop: 8,
                  })}
                >
                  <span style={{ fontSize: 20, width: 28, textAlign: 'center', lineHeight: 1 }}>
                    <IconSettings style={{ width: 18, height: 18 }} />
                  </span>
                  {t('nav.admin')}
                </NavLink>
              )}
            </div>

            {/* Drawer-Footer */}
            <div style={{
              padding: '12px 12px 20px',
              borderTop: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ padding: '4px 16px' }}>
                <LangPicker />
              </div>
              <button
                onClick={() => { setDrawerOpen(false); handleLogout(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px', borderRadius: 12, border: 'none',
                  background: 'transparent', color: 'var(--text-muted)',
                  fontFamily: 'var(--font)', fontWeight: 700, fontSize: 15,
                  cursor: 'pointer', width: '100%',
                }}
              >
                <IconLogout style={{ width: 18, height: 18, flexShrink: 0 }} />
                {t('nav.logout')}
              </button>

              {/* Legal links */}
              <div style={{
                borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 10,
                display: 'flex', flexWrap: 'wrap', gap: '4px 14px', paddingInline: 16,
              }}>
                {[
                  { to: '/impressum', label: 'Impressum' },
                  { to: '/datenschutz', label: 'Datenschutz' },
                  { to: '/nutzungsbedingungen', label: 'AGB' },
                ].map(l => (
                  <NavLink key={l.to} to={l.to}
                    onClick={() => setDrawerOpen(false)}
                    style={{
                      fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none',
                      fontWeight: 600, lineHeight: 2,
                    }}>{l.label}</NavLink>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        .nav-link-side:hover { background: var(--stone-50) !important; color: var(--teal) !important; }
      `}</style>
    </div>
  );
}
