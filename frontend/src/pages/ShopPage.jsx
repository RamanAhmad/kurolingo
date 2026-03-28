import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import api from '../api/client';
import Spinner from '../components/ui/Spinner';
import { IconRefresh } from '../components/ui/icons';
import { useT } from '../i18n';

// ── Countdown timer ───────────────────────────────────────────────────────────
function useCountdown(activeUntil) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!activeUntil) { setRemaining(''); return; }
    const tick = () => {
      const ms = new Date(activeUntil) - Date.now();
      if (ms <= 0) { setRemaining('Abgelaufen'); return; }
      const h  = Math.floor(ms / 3600000);
      const m  = Math.floor((ms % 3600000) / 60000);
      const s  = Math.floor((ms % 60000) / 1000);
      if (h > 0) setRemaining(`${h}h ${m}m`);
      else if (m > 0) setRemaining(`${m}m ${s}s`);
      else setRemaining(`${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeUntil]);

  return remaining;
}

// ── Shop Item Card ────────────────────────────────────────────────────────────
function ShopItemCard({ item, onBuy, buying }) {
  const t = useT();
  const countdown = useCountdown(item.active_until);
  const isActive  = item.active;
  const cantAfford = !item.can_afford;
  const isBlocked  = item.already_active;

  let statusLabel = null;
  let statusColor = '';

  if (isActive && item.category === 'timed') {
    statusLabel = countdown ? `⏱ ${countdown}` : 'Aktiv';
    statusColor = 'var(--teal)';
  }
  if (isActive && item.id === 'heart' && item.category === 'instant') {
    statusLabel = null;
  }

  return (
    <div style={{
      background: 'var(--white)',
      border: `1px solid ${isActive && item.category === 'timed' ? 'var(--teal)' : 'var(--border)'}`,
      borderRadius: 'var(--r-xl)',
      padding: '20px 16px',
      textAlign: 'center',
      transition: 'transform .15s, box-shadow .15s',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
    }}
    onMouseEnter={e => {
      if (!isBlocked) {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,.08)';
      }
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = '';
      e.currentTarget.style.boxShadow = '';
    }}
    >
      {/* Active ribbon */}
      {isActive && item.category === 'timed' && (
        <div style={{
          position: 'absolute', top: 10, right: -22,
          background: 'var(--teal)', color: 'var(--white)',
          fontSize: 10, fontWeight: 800, padding: '3px 28px',
          transform: 'rotate(35deg)',
          letterSpacing: '.5px',
        }}>AKTIV</div>
      )}

      {/* Icon */}
      <div style={{ fontSize: 42, marginBottom: 10, lineHeight: 1 }}>{item.icon}</div>

      {/* Name */}
      <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 4 }}>{item.name}</div>

      {/* Desc */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5, minHeight: 32 }}>
        {item.desc}
      </div>

      {/* Countdown if active */}
      {statusLabel && (
        <div style={{
          fontSize: 13, fontWeight: 800, color: statusColor,
          background: 'var(--teal-lt)', borderRadius: 20, padding: '4px 12px',
          marginBottom: 12, display: 'inline-block',
        }}>
          {statusLabel}
        </div>
      )}

      {/* Price */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 5, fontWeight: 900, fontSize: 16,
        color: cantAfford ? 'var(--red)' : 'var(--purple)',
        marginBottom: 12,
      }}>
        💎 {item.price}
      </div>

      {/* Buy button */}
      <button
        className={`btn btn-sm btn-full ${
          isBlocked   ? 'btn-check-inactive' :
          cantAfford  ? ''                   :
          'btn-accent'
        }`}
        style={{
          justifyContent: 'center',
          opacity: isBlocked ? .6 : 1,
          background: cantAfford && !isBlocked ? 'var(--stone-100)' : undefined,
          color: cantAfford && !isBlocked ? 'var(--text-muted)' : undefined,
          border: cantAfford && !isBlocked ? '1px solid var(--border)' : undefined,
          cursor: isBlocked ? 'default' : 'pointer',
        }}
        disabled={isBlocked || buying}
        onClick={() => !isBlocked && !cantAfford && onBuy(item.id)}
      >
        {buying ? '…' :
         isBlocked ? t('shop.active') :
         cantAfford ? t('shop.cantAfford') :
         t('shop.buy')}
      </button>

      {cantAfford && !isBlocked && (
        <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6, fontWeight: 700 }}>
          {t('shop.needMore', { n: item.price - (item.userGems || 0) })}
        </div>
      )}
    </div>
  );
}

// ── Main Shop Page ─────────────────────────────────────────────────────────────
export default function ShopPage() {
  const { user, refreshUser, addToast } = useStore();
  const t = useT();
  const [shopData, setShopData] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [shopError, setShopError] = useState('');
  const [buying,   setBuying]   = useState(null); // item_id currently being bought

  const load = () => {
    setLoading(true);
    setShopError('');
    api.get('/shop')
      .then(r => { setShopData(r.data); setLoading(false); })
      .catch(err => {
        const msg = err?.response?.data?.error || err?.message || 'Unbekannter Fehler';
        console.error('[Shop] Ladefehler:', err?.response?.status, msg);
        setShopError(msg);
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  const handleBuy = async (itemId) => {
    if (buying) return;
    setBuying(itemId);
    try {
      const { data } = await api.post('/shop/buy', { item_id: itemId });
      addToast(data.message || `Gekauft!`, 'ok');
      // Update store with new gems/hearts
      await refreshUser();
      // Reload shop to reflect new state
      load();
    } catch (e) {
      addToast(e.response?.data?.error || 'Kauf fehlgeschlagen', 'err');
    } finally {
      setBuying(null);
    }
  };

  const gems   = shopData?.gems   ?? user?.gems   ?? 0;
  const hearts = shopData?.hearts ?? user?.hearts ?? 5;

  const categories = React.useMemo(() => [
    { id: 'instant', label: '⚡ ' + t('shop.instant'), desc: t('shop.instantDesc') },
    { id: 'timed',   label: '⏱ ' + t('shop.timed'),   desc: t('shop.timedDesc')   },
  ], [t]);

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '20px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900 }}>🛍️ {t('shop.title')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 2 }}>
            {t('shop.subtitle')}
          </p>
        </div>

        {/* Currency display */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
            padding: '10px 16px', boxShadow: 'var(--shadow-xs)',
          }}>
            <span style={{ fontSize: 22 }}>💎</span>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--purple)', lineHeight: 1 }}>
                {gems.toLocaleString()}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                Gems
              </div>
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
            padding: '10px 16px', boxShadow: 'var(--shadow-xs)',
          }}>
            <span style={{ fontSize: 22 }}>❤️</span>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--red)', lineHeight: 1 }}>
                {hearts} / 5
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                Herzen
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gems info */}
      <div style={{
        background: 'var(--sun-lt)', border: '1px solid color-mix(in srgb, var(--sun) 50%, transparent)', borderRadius: 'var(--r-md)',
        padding: '12px 16px', marginBottom: 24, fontSize: 13, fontWeight: 600, color: '#7A4800',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>💡</span>
        <span>{t('shop.gemHint', {n: 1})}</span>
      </div>

      {loading ? (
        <Spinner text={t('shop.loading')} />
      ) : !shopData ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>{t('shop.loadError')}</p>
          <p style={{ fontSize: 13, marginBottom: 8, color: 'var(--text-muted)' }}>
            {t('shop.backendCheck')}
          </p>
          {shopError && (
            <p style={{ fontSize: 12, marginBottom: 16, color: 'var(--red)',
              background: 'var(--red-lt)', padding: '8px 14px', borderRadius: 8,
              fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {shopError}
            </p>
          )}
          <button className="btn btn-ghost btn-md" onClick={load}>
            🔄 {t('shop.retryBtn')}
          </button>
        </div>
      ) : (
        <>
          {categories.map(cat => {
            const items = shopData.items.filter(i => i.category === cat.id);
            if (items.length === 0) return null;
            return (
              <div key={cat.id} style={{ marginBottom: 32 }}>
                <div style={{ marginBottom: 14 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 900 }}>{cat.label}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{cat.desc}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
                  {items.map(item => (
                    <ShopItemCard
                      key={item.id}
                      item={{ ...item, can_afford: gems >= item.price, userGems: gems }}
                      onBuy={handleBuy}
                      buying={buying === item.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Active boosts summary */}
          {shopData.items.some(i => i.active && i.category === 'timed') && (
            <div style={{
              background: 'var(--teal-lt)', border: '1px solid var(--teal)', borderRadius: 'var(--r-lg)',
              padding: '16px 18px', marginTop: 8,
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 900, color: 'var(--teal-dk)', marginBottom: 10 }}>✅ {t('shop.activeBoosts')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {shopData.items.filter(i => i.active && i.category === 'timed').map(item => (
                  <ActiveBoostRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Active boost row with live timer ─────────────────────────────────────────
function ActiveBoostRow({ item }) {
  const t = useT();
  const countdown = useCountdown(item.active_until);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 20 }}>{item.icon}</span>
      <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: 'var(--teal-dk)' }}>
        {item.name}
      </div>
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--teal)' }}>
        {countdown || t('shop.active')}
      </div>
    </div>
  );
}
