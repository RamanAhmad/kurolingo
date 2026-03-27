/**
 * CommunityPage.jsx — Kurdolingo Community Chat v4
 *
 * v4 Fixes:
 *  ✅ "0"-Bug: !!msg.pinned / !!msg.edited statt raw Integer
 *  ✅ Suche entfernt (Feature nicht gewünscht)
 *  ✅ Emoji-Picker vertikal statt horizontal
 *  ✅ Mobile-optimiert (responsive Layout, Sidebar auto-hide, Touch-UX)
 */

import React, {
  useEffect, useState, useRef, useCallback, useMemo
} from 'react';
import api from '../api/client';
import { useStore } from '../store';
import { useT } from '../i18n';
import Spinner from '../components/ui/Spinner';

const ALLOWED_EMOJIS  = ['👍','❤️','😂','😮','😢','🔥','👏','💡','🎉','💪'];
const POLL_INTERVAL  = 10000;
const EDIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_LEN        = 500;
const MIN_LEN        = 2;
const MOBILE_BP      = 680;

const AVATAR_GRADIENTS = [
  ['#0B9E88','#06D6A0'],['#6B48FF','#A78BFA'],['#E8A020','#FCD34D'],
  ['#D94040','#F87171'],['#378ADD','#60A5FA'],['#22a059','#4ADE80'],
  ['#D85A30','#FB923C'],['#D4537E','#F472B6'],['#0E7490','#22D3EE'],
  ['#7C3AED','#C4B5FD'],
];
function avatarGradient(name) {
  let h = 0;
  for (let i = 0; i < (name||'').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

/* ── Mobile-Hook ───────────────────────────────────────────────────────── */
function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < MOBILE_BP);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth < MOBILE_BP);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return mobile;
}

/* ── SafeText ──────────────────────────────────────────────────────────── */
function SafeText({ text }) {
  const raw = (text || '')
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&#x2F;/g,'/');
  return <>{raw}</>;
}

/* ── Relative Zeit ──────────────────────────────────────────────────────── */
function TimeAgo({ dateStr, t }) {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(()=>tick(n=>n+1), 30000); return ()=>clearInterval(id); }, []);
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  const full  = new Date(dateStr).toLocaleString();
  if (diff < 60)    return <span title={full}>{t('kurdistan.chatJust')}</span>;
  if (diff < 3600)  return <span title={full}>{t('kurdistan.chatMin',  { n: Math.floor(diff/60) })}</span>;
  if (diff < 86400) return <span title={full}>{t('kurdistan.chatHour', { n: Math.floor(diff/3600) })}</span>;
  return <span title={full}>{t('kurdistan.chatDay', { n: Math.floor(diff/86400) })}</span>;
}

/* ── Avatar ─────────────────────────────────────────────────────────────── */
function Avatar({ name, size=38, online=false }) {
  const [c1,c2] = avatarGradient(name);
  return (
    <div style={{ position:'relative', flexShrink:0 }}>
      <div style={{
        width:size, height:size, borderRadius:size*.28,
        background:`linear-gradient(135deg,${c1},${c2})`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:size*.4, fontWeight:900, color:'#fff',
        boxShadow:`0 3px 10px ${c1}55`,
        border:'2px solid rgba(255,255,255,.15)',
        userSelect:'none',
      }}>{(name||'?')[0].toUpperCase()}</div>
      {online && (
        <div style={{
          position:'absolute', bottom:-1, right:-1,
          width:11, height:11, borderRadius:'50%',
          background:'#22C55E',
          border:'2px solid var(--surface)',
          boxShadow:'0 0 6px rgba(34,197,94,.55)',
        }}/>
      )}
    </div>
  );
}

/* ── Emoji Picker (vertikal) ────────────────────────────────────────────── */
function EmojiPicker({ onSelect, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  return (
    <div ref={ref} style={{
      position:'absolute', bottom:'calc(100% + 8px)', left:'50%',
      transform:'translateX(-50%)',
      background:'var(--surface)', border:'1.5px solid var(--border)',
      borderRadius:14, padding:'6px',
      display:'flex', flexDirection:'column', gap:2,
      boxShadow:'0 12px 40px rgba(0,0,0,.18)',
      zIndex:200, animation:'cmSlideUp .18s var(--ease-spring)',
    }}>
      {ALLOWED_EMOJIS.map(e => (
        <button key={e} onClick={() => { onSelect(e); onClose(); }}
          style={{
            background:'none', border:'none', fontSize:20,
            cursor:'pointer', padding:'5px 8px', borderRadius:8,
            transition:'all .12s', lineHeight:1, textAlign:'center',
          }}
          onMouseEnter={ev => { ev.currentTarget.style.background='var(--stone-100)'; ev.currentTarget.style.transform='scale(1.15)'; }}
          onMouseLeave={ev => { ev.currentTarget.style.background='none'; ev.currentTarget.style.transform='scale(1)'; }}
        >{e}</button>
      ))}
    </div>
  );
}

/* ── Bestätigungs-Dialog ────────────────────────────────────────────────── */
function ConfirmDialog({ message, confirmLabel, cancelLabel, onConfirm, onCancel }) {
  return (
    <div onClick={onCancel} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.5)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:9998, backdropFilter:'blur(6px)', animation:'cmFadeIn .15s ease',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'var(--surface)', borderRadius:20,
        padding:'28px 28px 22px', width:'90%', maxWidth:360,
        boxShadow:'0 24px 80px rgba(0,0,0,.25)',
        animation:'cmScaleIn .2s var(--ease-spring)',
        border:'1px solid var(--border)',
      }}>
        <div style={{ fontSize:36, textAlign:'center', marginBottom:12 }}>🗑️</div>
        <p style={{
          fontSize:15, fontWeight:700, color:'var(--text-primary)',
          textAlign:'center', marginBottom:20, lineHeight:1.5,
        }}>{message}</p>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel} style={{
            flex:1, padding:12, borderRadius:12,
            border:'1.5px solid var(--border)', background:'var(--stone-50)',
            fontSize:14, fontWeight:700, cursor:'pointer',
            color:'var(--text-secondary)', fontFamily:'var(--font)', transition:'all .15s',
          }}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{
            flex:1, padding:12, borderRadius:12, border:'none',
            background:'var(--red)', color:'#fff',
            fontSize:14, fontWeight:800, cursor:'pointer',
            fontFamily:'var(--font)',
            boxShadow:'0 4px 12px rgba(224,72,72,.3)', transition:'all .15s',
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Report-Dialog ──────────────────────────────────────────────────────── */
function ReportDialog({ onSubmit, onClose, t }) {
  const [reason, setReason] = useState('');
  const reasons = [
    { key: 'spam',       icon: '🚫', label: t('kurdistan.chatReportSpam') },
    { key: 'offensive',  icon: '⚠️', label: t('kurdistan.chatReportOffensive') },
    { key: 'harassment', icon: '🛑', label: t('kurdistan.chatReportHarass') },
    { key: 'other',      icon: '📝', label: t('kurdistan.chatReportOther') },
  ];
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.5)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:9999, backdropFilter:'blur(6px)', animation:'cmFadeIn .15s ease',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:'var(--surface)', borderRadius:20,
        padding:'26px 26px 20px', width:'90%', maxWidth:380,
        boxShadow:'0 24px 80px rgba(0,0,0,.25)',
        animation:'cmScaleIn .2s var(--ease-spring)',
        border:'1px solid var(--border)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <div style={{
            width:38, height:38, borderRadius:11,
            background:'var(--red-lt)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
          }}>🚩</div>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:'var(--text-primary)' }}>
              {t('kurdistan.chatReportTitle')}
            </div>
            <div style={{ fontSize:12, color:'var(--text-secondary)' }}>
              {t('kurdistan.chatReportChoose')}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
          {reasons.map(r => (
            <button key={r.key} onClick={()=>setReason(r.key)} style={{
              display:'flex', alignItems:'center', gap:12, padding:'11px 14px',
              borderRadius:12,
              border: reason===r.key ? '2px solid var(--teal)' : '1.5px solid var(--border)',
              background: reason===r.key ? 'var(--teal-xlt)' : 'var(--stone-50)',
              cursor:'pointer', fontSize:14, fontWeight:700,
              color: reason===r.key ? 'var(--teal-dk)' : 'var(--text-primary)',
              fontFamily:'var(--font)', transition:'all .15s', textAlign:'left',
            }}>
              <span style={{ fontSize:20 }}>{r.icon}</span>
              {r.label}
              {reason===r.key && <span style={{ marginLeft:'auto', color:'var(--teal)' }}>✓</span>}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{
            flex:1, padding:12, borderRadius:12,
            border:'1.5px solid var(--border)', background:'var(--stone-50)',
            fontSize:14, fontWeight:700, cursor:'pointer',
            color:'var(--text-secondary)', fontFamily:'var(--font)',
          }}>{t('kurdistan.chatReportCancel')}</button>
          <button onClick={()=>reason&&onSubmit(reason)} disabled={!reason} style={{
            flex:1, padding:12, borderRadius:12, border:'none',
            background: reason ? 'var(--red)' : 'var(--stone-200)',
            color: reason ? '#fff' : 'var(--text-muted)',
            fontSize:14, fontWeight:800, cursor: reason?'pointer':'not-allowed',
            fontFamily:'var(--font)',
            boxShadow: reason ? '0 4px 12px rgba(224,72,72,.3)' : 'none',
            transition:'all .15s',
          }}>{t('kurdistan.chatReportSubmit')}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Action Button ──────────────────────────────────────────────────────── */
function ActionBtn({ icon, label, onClick, danger=false, active=false }) {
  const [hov, setHov] = useState(false);
  return (
    <button title={label} onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        background: hov
          ? (danger ? 'rgba(224,72,72,.12)' : active ? 'var(--teal-xlt)' : 'var(--stone-100)')
          : 'none',
        border:'none', cursor:'pointer', fontSize:14,
        padding:'5px 7px', borderRadius:8, transition:'all .12s',
        color: danger ? 'var(--red)' : active ? 'var(--teal)' : 'var(--text-secondary)',
        display:'flex', alignItems:'center',
      }}
    >{icon}</button>
  );
}

/* ── Nachrichtenbubble ──────────────────────────────────────────────────── */
function MessageBubble({ msg, isOwn, isAdmin, user, t, isMobile,
  onDelete, onEdit, onReact, onReport, onReply, onPin }) {

  const [showActions, setShowActions] = useState(false);
  const [showEmoji,   setShowEmoji]   = useState(false);
  const actRef = useRef(null);

  const canEdit   = isOwn && (Date.now() - new Date(msg.created_at).getTime()) < EDIT_WINDOW_MS;
  const canDelete = isOwn || isAdmin;
  const [c1]      = avatarGradient(msg.user_name);

  useEffect(() => {
    if (!showActions) return;
    const h = e => {
      if (actRef.current && !actRef.current.contains(e.target)) {
        setShowActions(false); setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showActions]);

  // Mobile: Tap to toggle actions
  const handleBubbleInteraction = isMobile
    ? () => setShowActions(s => !s)
    : undefined;

  return (
    <div style={{
      display:'flex', gap: isMobile ? 8 : 10,
      flexDirection: isOwn ? 'row-reverse' : 'row',
      alignItems:'flex-start',
      animation:'cmFadeUp .25s var(--ease-out)',
    }}>
      <Avatar name={msg.user_name} size={isMobile ? 30 : 36} />
      <div style={{
        maxWidth: isMobile ? '80%' : '72%', display:'flex', flexDirection:'column',
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        position:'relative',
      }}>

        {/* Sender-Name + Badges — FIX: !!msg.pinned statt msg.pinned */}
        {!isOwn && (
          <div style={{
            fontSize:11, fontWeight:800, color:c1,
            marginBottom:3, paddingInline:6,
            display:'flex', alignItems:'center', gap:5,
          }}>
            {msg.user_name}
            {!!msg.pinned && <span style={{ fontSize:10, color:'var(--sun)' }} title={t('kurdistan.chatPinned')}>📌</span>}
            {isAdmin && msg.report_count > 0 && (
              <span style={{
                background:'var(--red)', color:'#fff',
                fontSize:9, fontWeight:800, borderRadius:6,
                padding:'1px 5px', letterSpacing:'.02em',
              }}>{msg.report_count}× ⚠️</span>
            )}
          </div>
        )}
        {isOwn && !!msg.pinned && (
          <div style={{ fontSize:10, color:'var(--sun)', fontWeight:700, marginBottom:3, paddingInline:6 }}>
            📌 {t('kurdistan.chatPinned')}
          </div>
        )}

        {/* Reply-Preview */}
        {msg.reply_preview && (
          <div style={{
            fontSize:11, marginBottom:5, paddingInline:8,
            display:'flex', gap:6, maxWidth:'100%', alignItems:'center',
          }}>
            <div style={{
              width:3, borderRadius:3, alignSelf:'stretch', flexShrink:0,
              background: isOwn ? 'rgba(255,255,255,.4)' : 'var(--teal)',
            }}/>
            <div style={{ overflow:'hidden' }}>
              <div style={{
                fontWeight:800, fontSize:10,
                color: isOwn ? 'rgba(255,255,255,.7)' : 'var(--teal-dk)',
              }}>{msg.reply_preview.user_name}</div>
              <div style={{
                color:'var(--text-secondary)', fontSize:10,
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:200,
              }}>{msg.reply_preview.message}</div>
            </div>
          </div>
        )}

        {/* Bubble */}
        <div
          onClick={handleBubbleInteraction}
          onMouseEnter={isMobile ? undefined : () => setShowActions(true)}
          onMouseLeave={isMobile ? undefined : () => { if (!showEmoji) setShowActions(false); }}
          style={{
            background: isOwn
              ? 'linear-gradient(135deg, var(--teal) 0%, var(--teal-dk) 100%)'
              : 'var(--surface)',
            color: isOwn ? '#fff' : 'var(--text-primary)',
            borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            padding: isMobile ? '8px 12px' : '10px 15px',
            fontSize: isMobile ? 13 : 14, lineHeight:1.65,
            border: isOwn ? 'none' : '1px solid var(--border)',
            wordBreak:'break-word', maxWidth:'100%',
            boxShadow: isOwn ? '0 4px 16px rgba(13,158,136,.25)' : '0 2px 8px rgba(0,0,0,.06)',
            position:'relative', transition:'box-shadow .15s',
          }}
        >
          <SafeText text={msg.message} />
          {/* FIX: !!msg.edited statt msg.edited */}
          {!!msg.edited && (
            <span style={{ fontSize:10, opacity:.5, marginLeft:6, fontStyle:'italic' }}>
              ({t('kurdistan.chatEdited')})
            </span>
          )}

          {/* Schwebende Aktionen */}
          {showActions && (
            <div ref={actRef} style={{
              position:'absolute', top:-38,
              ...(isOwn ? { left:-4 } : { right:-4 }),
              display:'flex', gap:1, zIndex:100,
              background:'var(--surface)', borderRadius:12,
              border:'1px solid var(--border)',
              boxShadow:'0 8px 24px rgba(0,0,0,.12)',
              padding:'3px 5px', animation:'cmFadeIn .1s ease',
            }}>
              <div style={{ position:'relative' }}>
                <ActionBtn icon="😊" label={t('kurdistan.chatReact')}
                  onClick={()=>setShowEmoji(!showEmoji)} active={showEmoji} />
                {showEmoji && (
                  <EmojiPicker onSelect={emoji=>{ onReact(msg.id, emoji); }}
                    onClose={()=>{ setShowEmoji(false); setShowActions(false); }} />
                )}
              </div>
              <ActionBtn icon="↩" label={t('kurdistan.chatReply')}
                onClick={()=>{ onReply(msg); setShowActions(false); }} />
              {canEdit && (
                <ActionBtn icon="✏️" label={t('kurdistan.chatEditTime')}
                  onClick={()=>{ onEdit(msg); setShowActions(false); }} />
              )}
              {!isOwn && (
                <ActionBtn icon="🚩" label={t('kurdistan.chatReport')}
                  onClick={()=>{ onReport(msg.id); setShowActions(false); }} />
              )}
              {isAdmin && (
                <ActionBtn
                  icon={!!msg.pinned ? '📌' : '📍'}
                  label={!!msg.pinned ? t('kurdistan.chatUnpin') : t('kurdistan.chatPin')}
                  onClick={()=>{ onPin(msg.id); setShowActions(false); }}
                  active={!!msg.pinned}
                />
              )}
              {canDelete && (
                <ActionBtn icon="🗑" label={t('kurdistan.chatDelete')}
                  onClick={()=>{ onDelete(msg.id); setShowActions(false); }} danger />
              )}
            </div>
          )}
        </div>

        {/* Reaktionen */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:5, paddingInline:4 }}>
            {msg.reactions.map(r => (
              <button key={r.emoji} onClick={()=>onReact(msg.id, r.emoji)} style={{
                display:'flex', alignItems:'center', gap:4,
                padding:'3px 9px 3px 6px', borderRadius:12,
                border: r.user_reacted ? '1.5px solid var(--teal)' : '1px solid var(--border)',
                background: r.user_reacted ? 'var(--teal-xlt)' : 'var(--surface)',
                fontSize:12, cursor:'pointer', fontFamily:'var(--font)',
                fontWeight:800, color: r.user_reacted ? 'var(--teal-dk)' : 'var(--text-secondary)',
                transition:'all .12s',
                boxShadow: r.user_reacted ? '0 1px 4px rgba(13,158,136,.2)' : 'none',
              }}>
                <span style={{ fontSize:15 }}>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Zeitstempel */}
        <div style={{
          fontSize:10, color:'var(--text-muted)', marginTop:4, paddingInline:6,
          display:'flex', gap:6, alignItems:'center',
          flexDirection: isOwn ? 'row-reverse' : 'row',
        }}>
          <TimeAgo dateStr={msg.created_at} t={t} />
        </div>
      </div>
    </div>
  );
}

/* ── Online Sidebar ─────────────────────────────────────────────────────── */
function OnlineSidebar({ count, currentUser, t }) {
  const rules = [
    ['🤝', t('kurdistan.chatRule1')],
    ['🚫', t('kurdistan.chatRule2')],
    ['🌍', t('kurdistan.chatRule3')],
    ['🛡️', t('kurdistan.chatRule4')],
    ['🗣️', t('kurdistan.chatRule5')],
  ];
  return (
    <div style={{
      width:196, flexShrink:0,
      display:'flex', flexDirection:'column', gap:12,
    }}>
      <div style={{
        background:'var(--surface)', border:'1.5px solid var(--border)',
        borderRadius:16, padding:'14px 14px', boxShadow:'0 2px 10px rgba(0,0,0,.04)',
      }}>
        <div style={{
          fontSize:10, fontWeight:800, color:'var(--text-muted)',
          textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10,
        }}>{t('kurdistan.chatSidebarOnline')}</div>
        <div style={{
          display:'flex', alignItems:'center', gap:8, padding:'10px 12px',
          borderRadius:12,
          background:'linear-gradient(135deg, var(--teal-xlt), rgba(6,214,160,.04))',
          border:'1px solid rgba(13,158,136,.15)',
        }}>
          <div style={{
            width:10, height:10, borderRadius:'50%', background:'#22C55E',
            boxShadow:'0 0 8px rgba(34,197,94,.6)',
            animation:'cmPulse 2.5s ease infinite', flexShrink:0,
          }}/>
          <span style={{ fontSize:18, fontWeight:900, color:'var(--teal-dk)' }}>{count}</span>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--teal)' }}>
            {t('kurdistan.chatSidebarActive')}
          </span>
        </div>
      </div>

      {currentUser && (
        <div style={{
          background:'var(--surface)', border:'1.5px solid var(--border)',
          borderRadius:16, padding:'14px 14px', boxShadow:'0 2px 10px rgba(0,0,0,.04)',
        }}>
          <div style={{
            fontSize:10, fontWeight:800, color:'var(--text-muted)',
            textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10,
          }}>{t('kurdistan.chatSidebarYou')}</div>
          <div style={{
            display:'flex', alignItems:'center', gap:9,
            padding:'8px 10px', borderRadius:12,
            background:'var(--stone-50)', border:'1px solid var(--border)',
          }}>
            <Avatar name={currentUser.name} size={30} online />
            <div style={{ overflow:'hidden', flex:1 }}>
              <div style={{
                fontSize:12, fontWeight:800, color:'var(--text-primary)',
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
              }}>{currentUser.name}</div>
              {currentUser.role === 'admin' && (
                <div style={{
                  fontSize:9, fontWeight:800, color:'var(--sun-dk)',
                  background:'var(--sun-lt)', borderRadius:4,
                  padding:'1px 5px', display:'inline-block', marginTop:2,
                  border:'1px solid rgba(232,160,32,.25)',
                }}>ADMIN</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{
        background:'var(--surface)', border:'1.5px solid var(--border)',
        borderRadius:16, padding:'14px 14px', boxShadow:'0 2px 10px rgba(0,0,0,.04)',
        flex:1,
      }}>
        <div style={{
          fontSize:10, fontWeight:800, color:'var(--text-muted)',
          textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10,
        }}>📋 {t('kurdistan.chatSidebarRules')}</div>
        {rules.map(([icon, text], i, arr) => (
          <div key={i} style={{
            display:'flex', alignItems:'flex-start', gap:7,
            fontSize:11, color:'var(--text-secondary)', fontWeight:600,
            padding:'6px 0',
            borderBottom: i < arr.length-1 ? '1px solid var(--border)' : 'none',
          }}>
            <span>{icon}</span>
            <span style={{ lineHeight:1.4 }}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════ Haupt-Komponente ═══════════════════════════════════ */
export default function CommunityPage() {
  const t        = useT();
  const { user } = useStore();
  const isAdmin  = user?.role === 'admin';
  const isMobile = useIsMobile();

  const [messages,    setMessages]    = useState([]);
  const [enabled,     setEnabled]     = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [total,       setTotal]       = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [text,        setText]        = useState('');
  const [sending,     setSending]     = useState(false);
  const [error,       setError]       = useState('');
  const [replyTo,     setReplyTo]     = useState(null);
  const [editingMsg,  setEditingMsg]  = useState(null);
  const [reportMsgId, setReportMsgId] = useState(null);
  const [toast,       setToast]       = useState(null);
  const [confirmId,   setConfirmId]   = useState(null);
  const [showSidebar, setShowSidebar] = useState(!isMobile);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [newMsgCount,   setNewMsgCount]   = useState(0);

  const bottomRef    = useRef(null);
  const textareaRef  = useRef(null);
  const prevCountRef = useRef(0);
  const scrollRef    = useRef(null);

  // Sidebar auto-hide wenn auf Mobile gewechselt
  useEffect(() => { if (isMobile) setShowSidebar(false); }, [isMobile]);

  const showToast = useCallback((msg, isError=false) => {
    setToast({ text: msg, isError });
    setTimeout(()=>setToast(null), 3000);
  }, []);

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, []);

  const handleScroll = useCallback(() => {
    const near = isNearBottom();
    setShowScrollBtn(!near);
    if (near) setNewMsgCount(0);
  }, [isNearBottom]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
    setNewMsgCount(0);
    setShowScrollBtn(false);
  }, []);

  /* ── Load ── */
  const load = useCallback((opts={}) => {
    const p = new URLSearchParams();
    if (opts.offset) p.set('offset', opts.offset);
    const url = `/kurdistan/community${p.toString() ? '?'+p : ''}`;
    return api.get(url).then(r => {
      setEnabled(r.data.enabled);
      setTotal(r.data.total || 0);
      setOnlineCount(r.data.online_count || 0);
      const ordered = r.data.messages.slice().reverse();
      if (opts.offset) setMessages(m=>[...ordered,...m]);
      else setMessages(ordered);
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try { await load({ offset: messages.length }); } finally { setLoadingMore(false); }
  };

  useEffect(()=>{ load(); }, [load]);

  /* ── Polling ── */
  useEffect(() => {
    const id = setInterval(() => {
      api.get('/kurdistan/community').then(r => {
        setEnabled(r.data.enabled);
        setOnlineCount(r.data.online_count || 0);
        const ordered = r.data.messages.slice().reverse();
        setMessages(prev => {
          if (ordered.length > prev.length && !isNearBottom()) {
            setNewMsgCount(ordered.length - prev.length);
          }
          return ordered;
        });
      }).catch(()=>{});
    }, POLL_INTERVAL);
    return ()=>clearInterval(id);
  }, [isNearBottom]);

  /* ── Auto-Scroll ── */
  useEffect(() => {
    if (messages.length > prevCountRef.current && isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior:'smooth' });
    }
    prevCountRef.current = messages.length;
  }, [messages.length, isNearBottom]);

  /* ── Senden ── */
  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !enabled) return;
    if (trimmed.length < MIN_LEN) { setError(t('kurdistan.chatMinChars', { n: MIN_LEN })); return; }
    if (trimmed.length > MAX_LEN) { setError(t('kurdistan.chatTooLong')); return; }
    setSending(true); setError('');
    try {
      if (editingMsg) {
        const { data } = await api.put(`/kurdistan/community/${editingMsg.id}`, { message: trimmed });
        setMessages(m=>m.map(msg=>msg.id===editingMsg.id ? { ...msg,...data } : msg));
        setEditingMsg(null);
        showToast(`✅ ${t('kurdistan.chatToastEdited')}`);
      } else {
        const payload = { message: trimmed };
        if (replyTo) payload.reply_to = replyTo.id;
        const { data } = await api.post('/kurdistan/community', payload);
        if (replyTo) data.reply_preview = {
          user_name: replyTo.user_name,
          message:   replyTo.message?.slice(0, 80),
        };
        if (!data.reactions) data.reactions = [];
        setMessages(m=>[...m, data]);
        setReplyTo(null);
        setTimeout(()=>bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 50);
      }
      setText('');
      textareaRef.current?.focus();
    } catch (e) {
      const st = e.response?.status;
      if (st === 429) setError(`⏱ ${t('kurdistan.chatRateLimited')}`);
      else if (st === 401) setError(`🔒 ${t('kurdistan.chatSessionExpired')}`);
      else setError(e.response?.data?.error || t('kurdistan.chatSendError'));
    } finally { setSending(false); }
  };

  const deleteMsg = id => setConfirmId(id);
  const confirmDelete = async () => {
    const id = confirmId; setConfirmId(null);
    try {
      await api.delete(`/kurdistan/community/${id}`);
      setMessages(m=>m.filter(msg=>msg.id!==id));
      showToast(`🗑️ ${t('kurdistan.chatToastDeleted')}`);
    } catch (e) { showToast(e.response?.data?.error || t('kurdistan.chatError'), true); }
  };

  const reactToMsg = async (id, emoji) => {
    try {
      const { data } = await api.post(`/kurdistan/community/${id}/react`, { emoji });
      setMessages(m=>m.map(msg=>msg.id===id ? { ...msg, reactions:data.reactions } : msg));
    } catch (_) {}
  };

  const reportMsg = async reason => {
    try {
      const { data } = await api.post(`/kurdistan/community/${reportMsgId}/report`, { reason });
      if (data.auto_removed) {
        setMessages(m=>m.filter(msg=>msg.id!==reportMsgId));
        showToast(`🚩 ${t('kurdistan.chatToastRemoved')}`);
      } else { showToast(`🚩 ${t('kurdistan.chatToastReported')}`); }
    } catch (e) { showToast(e.response?.data?.error || t('kurdistan.chatError'), true); }
    finally { setReportMsgId(null); }
  };

  const pinMsg = async id => {
    try {
      const { data } = await api.patch(`/kurdistan/community/${id}/pin`);
      setMessages(m=>m.map(msg=>msg.id===id ? { ...msg, pinned:data.pinned } : msg));
      showToast(data.pinned ? `📌 ${t('kurdistan.chatToastPinned')}` : `📌 ${t('kurdistan.chatToastUnpinned')}`);
    } catch (_) {}
  };

  const startEdit = msg => {
    const decoded = (msg.message||'')
      .replace(/&lt;/g,'<').replace(/&gt;/g,'>')
      .replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&#x2F;/g,'/');
    setEditingMsg(msg); setText(decoded); setReplyTo(null);
    setTimeout(()=>textareaRef.current?.focus(), 50);
  };

  const startReply = msg => {
    setReplyTo(msg); setEditingMsg(null); setText('');
    setTimeout(()=>textareaRef.current?.focus(), 50);
  };

  /* FIX: !!a.pinned / !!b.pinned für saubere boolean-Sortierung */
  const sortedMessages = useMemo(() =>
    [...messages].sort((a,b) => {
      if (!!a.pinned && !b.pinned) return -1;
      if (!a.pinned && !!b.pinned) return 1;
      return 0;
    }), [messages]);

  const charPct  = text.length / MAX_LEN;
  const charWarn = charPct > 0.9;
  const RING_R   = 7;
  const RING_C   = 2 * Math.PI * RING_R;

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'calc(100vh - 80px)' }}>
      <Spinner text={t('kurdistan.chatLoading')} />
    </div>
  );

  return (
    <div style={{
      maxWidth:980, margin:'0 auto',
      padding: isMobile ? '12px 8px 8px' : '20px 16px 16px',
      display:'flex', flexDirection:'column',
      height:'calc(100vh - 60px)',
      fontFamily:'var(--font)', gap:0,
    }}>

      <style>{`
        @keyframes cmFadeUp    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cmFadeIn    { from{opacity:0} to{opacity:1} }
        @keyframes cmScaleIn   { from{opacity:0;transform:scale(.94)} to{opacity:1;transform:scale(1)} }
        @keyframes cmSlideUp   { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes cmPulse     { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes cmSpin      { to{transform:rotate(360deg)} }
        @keyframes cmToast     { from{opacity:0;transform:translateX(-50%) translateY(14px) scale(.95)} to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} }
        .cm-scroll::-webkit-scrollbar{width:4px}
        .cm-scroll::-webkit-scrollbar-track{background:transparent}
        .cm-scroll::-webkit-scrollbar-thumb{background:var(--border-dk);border-radius:4px}
      `}</style>

      {/* ══ Header ══ */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        marginBottom: isMobile ? 10 : 14, flexShrink:0,
        gap:8,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap: isMobile ? 8 : 12, minWidth:0 }}>
          {!isMobile && (
            <div style={{
              width:44, height:44, borderRadius:14,
              background:'linear-gradient(135deg, var(--teal), var(--teal-dk))',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:22, boxShadow:'var(--shadow-teal)', flexShrink:0,
            }}>💬</div>
          )}
          <div style={{ minWidth:0 }}>
            <h1 style={{ fontSize: isMobile ? 16 : 20, fontWeight:900, color:'var(--text-primary)', lineHeight:1.2 }}>
              {t('kurdistan.chatTitle')}
            </h1>
            {!isMobile && (
              <p style={{ fontSize:12, color:'var(--text-secondary)', marginTop:1 }}>
                {t('kurdistan.chatSubtitle')}
              </p>
            )}
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap: isMobile ? 4 : 8, flexShrink:0 }}>
          {/* Online-Pill */}
          <div style={{
            display:'flex', alignItems:'center', gap:5,
            padding: isMobile ? '4px 8px' : '6px 12px',
            background:'var(--teal-xlt)',
            borderRadius:10, border:'1px solid rgba(13,158,136,.2)',
          }}>
            <div style={{
              width:7, height:7, borderRadius:'50%', background:'#22C55E',
              boxShadow:'0 0 6px rgba(34,197,94,.6)',
              animation:'cmPulse 2.5s ease infinite',
            }}/>
            <span style={{ fontSize: isMobile ? 11 : 12, fontWeight:800, color:'var(--teal-dk)' }}>
              {onlineCount}
            </span>
          </div>
          {/* Status-Pill */}
          {!isMobile && (
            <div style={{
              display:'flex', alignItems:'center', gap:6, padding:'6px 12px',
              background: enabled ? 'var(--teal-xlt)' : 'var(--red-lt)',
              borderRadius:10,
              border:`1px solid ${enabled ? 'rgba(13,158,136,.2)' : 'rgba(224,72,72,.2)'}`,
            }}>
              <div style={{
                width:8, height:8, borderRadius:'50%',
                background: enabled ? '#22C55E' : '#E04848',
              }}/>
              <span style={{
                fontSize:12, fontWeight:800,
                color: enabled ? 'var(--teal-dk)' : 'var(--red-dk)',
              }}>
                {enabled ? t('kurdistan.chatStatusActive') : t('kurdistan.chatStatusDisabled')}
              </span>
            </div>
          )}
          {/* Sidebar-Toggle */}
          {!isMobile && (
            <button onClick={()=>setShowSidebar(s=>!s)}
              title={showSidebar ? t('kurdistan.chatSidebarHide') : t('kurdistan.chatSidebarShow')}
              style={{
                width:36, height:36, borderRadius:10,
                border:'1.5px solid var(--border)',
                background: showSidebar ? 'var(--teal-xlt)' : 'var(--surface)',
                cursor:'pointer', fontSize:16,
                display:'flex', alignItems:'center', justifyContent:'center',
                color: showSidebar ? 'var(--teal)' : 'var(--text-secondary)',
                transition:'all .15s',
              }}>👥</button>
          )}
        </div>
      </div>

      {/* ══ Body ══ */}
      <div style={{ flex:1, display:'flex', gap: isMobile ? 0 : 14, minHeight:0 }}>

        {/* ── Chat-Spalte ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, gap: isMobile ? 6 : 10 }}>

          {/* Disabled-Banner */}
          {!enabled && (
            <div style={{
              background:'var(--red-lt)', border:'1.5px solid rgba(224,72,72,.2)',
              borderRadius:12, padding: isMobile ? '8px 12px' : '11px 16px',
              display:'flex', gap:10, alignItems:'center',
              fontSize:13, fontWeight:700, color:'#8c1f1f', flexShrink:0,
            }}>
              <span style={{ fontSize:18 }}>🔒</span>
              {t('kurdistan.chatDisabled')}
            </div>
          )}

          {/* Nachrichten-Bereich */}
          <div ref={scrollRef} className="cm-scroll" onScroll={handleScroll} style={{
            flex:1, overflowY:'auto',
            background:'var(--stone-50)',
            borderRadius: isMobile ? 14 : 18,
            border:'1.5px solid var(--border)',
            padding: isMobile ? '10px 8px' : '16px 14px',
            display:'flex', flexDirection:'column', gap: isMobile ? 10 : 14,
            minHeight:0, position:'relative',
            boxShadow:'inset 0 2px 8px rgba(0,0,0,.03)',
          }}>
            {/* Ältere laden */}
            {messages.length < total && messages.length > 0 && (
              <div style={{ textAlign:'center' }}>
                <button onClick={loadMore} disabled={loadingMore} style={{
                  background:'var(--surface)', border:'1.5px solid var(--border)',
                  borderRadius:10, padding:'7px 18px', cursor: loadingMore?'default':'pointer',
                  fontSize:12, fontWeight:700, color:'var(--text-secondary)',
                  fontFamily:'var(--font)', transition:'all .15s',
                  display:'inline-flex', alignItems:'center', gap:6,
                }}>
                  {loadingMore
                    ? <><span style={{ animation:'cmSpin 1s linear infinite', display:'inline-block' }}>⟳</span> {t('kurdistan.chatLoadingMore')}</>
                    : `↑ ${t('kurdistan.chatOlderMessages', { n: total-messages.length })}`
                  }
                </button>
              </div>
            )}

            {/* Leer-State */}
            {sortedMessages.length === 0 ? (
              <div style={{
                flex:1, display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center',
                color:'var(--text-muted)', textAlign:'center', padding:'40px 20px',
              }}>
                <div style={{
                  width:80, height:80, borderRadius:24,
                  background:'linear-gradient(135deg, var(--teal-lt), var(--teal-xlt))',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:40, marginBottom:16,
                  boxShadow:'0 4px 20px rgba(13,158,136,.1)',
                }}>💬</div>
                <div style={{ fontWeight:800, fontSize:15, color:'var(--text-secondary)', marginBottom:6 }}>
                  {t('kurdistan.chatEmpty')}
                </div>
              </div>
            ) : sortedMessages.map(msg => (
              <MessageBubble
                key={msg.id} msg={msg}
                isOwn={!!msg.is_own || msg.user_id===user?.id}
                isAdmin={isAdmin} user={user} t={t}
                isMobile={isMobile}
                onDelete={deleteMsg} onEdit={startEdit}
                onReact={reactToMsg} onReport={setReportMsgId}
                onReply={startReply} onPin={pinMsg}
              />
            ))}

            <div ref={bottomRef} />
          </div>

          {/* ── Scroll-to-Bottom ── */}
          {showScrollBtn && (
            <div style={{
              position:'relative', marginTop:-48, marginBottom:4,
              display:'flex', justifyContent:'center',
              pointerEvents:'none', zIndex:50,
            }}>
              <button onClick={scrollToBottom} style={{
                pointerEvents:'auto',
                background: newMsgCount > 0
                  ? 'linear-gradient(135deg, var(--teal), var(--teal-dk))'
                  : 'var(--surface)',
                color: newMsgCount > 0 ? '#fff' : 'var(--text-secondary)',
                border: newMsgCount > 0 ? 'none' : '1.5px solid var(--border)',
                borderRadius:20, padding:'7px 16px',
                fontSize:12, fontWeight:800, cursor:'pointer',
                fontFamily:'var(--font)',
                boxShadow: newMsgCount > 0
                  ? '0 4px 16px rgba(13,158,136,.3)'
                  : '0 4px 16px rgba(0,0,0,.1)',
                transition:'all .2s',
                display:'flex', alignItems:'center', gap:6,
                animation:'cmFadeIn .15s ease',
              }}>
                {newMsgCount > 0 ? t('kurdistan.chatNewMessages') : '↓'}
              </button>
            </div>
          )}

          {/* ── Input ── */}
          {enabled && (
            <div style={{
              background:'var(--surface)',
              border:'1.5px solid var(--border)',
              borderRadius: isMobile ? 14 : 18,
              padding: isMobile ? '8px 10px' : '12px 14px',
              boxShadow:'0 -2px 20px rgba(0,0,0,.05)',
              flexShrink:0,
            }}>
              {/* Reply / Edit-Pill */}
              {(replyTo || editingMsg) && (
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  marginBottom:8, padding:'6px 10px',
                  background: editingMsg ? 'var(--sun-lt)' : 'var(--teal-xlt)',
                  borderRadius:10, fontSize:12,
                  border:`1px solid ${editingMsg ? 'rgba(232,160,32,.25)' : 'rgba(13,158,136,.2)'}`,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, overflow:'hidden', flex:1 }}>
                    <span style={{ fontSize:14 }}>{editingMsg ? '✏️' : '↩'}</span>
                    <span style={{ fontWeight:800, color: editingMsg ? 'var(--sun-dk)' : 'var(--teal-dk)' }}>
                      {editingMsg ? t('kurdistan.chatEditMode') : replyTo.user_name}
                    </span>
                  </div>
                  <button onClick={()=>{ setEditingMsg(null); setReplyTo(null); setText(''); }} style={{
                    background:'none', border:'none', cursor:'pointer',
                    fontSize:14, color:'var(--text-muted)', padding:'2px 6px', fontWeight:700,
                  }}>✕</button>
                </div>
              )}

              {/* Fehler */}
              {error && (
                <div style={{
                  fontSize:12, color:'var(--red)', marginBottom:6,
                  fontWeight:700, display:'flex', alignItems:'center', gap:6,
                  padding:'5px 10px', background:'var(--red-lt)', borderRadius:8,
                }}>⚠️ {error}</div>
              )}

              {/* Textarea */}
              <div style={{ display:'flex', gap: isMobile ? 6 : 10, alignItems:'flex-end' }}>
                {!isMobile && <Avatar name={user?.name||''} size={36} online />}
                <textarea ref={textareaRef} value={text}
                  onChange={e=>{ setText(e.target.value); setError(''); }}
                  onKeyDown={e=>{ if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={editingMsg ? t('kurdistan.chatEditPlaceholder') : t('kurdistan.chatPlaceholder')}
                  maxLength={MAX_LEN} rows={isMobile ? 1 : 2}
                  style={{
                    flex:1, border:'1.5px solid var(--border)', borderRadius: isMobile ? 12 : 14,
                    padding: isMobile ? '8px 12px' : '10px 14px',
                    fontSize: isMobile ? 13 : 14, fontFamily:'var(--font)',
                    resize:'none', outline:'none', lineHeight:1.5,
                    color:'var(--text-primary)', background:'var(--stone-50)',
                    transition:'border-color .15s, box-shadow .15s',
                  }}
                  onFocus={e=>{ e.target.style.borderColor='var(--teal)'; e.target.style.boxShadow='0 0 0 3px rgba(13,158,136,.08)'; }}
                  onBlur={e=>{ e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none'; }}
                />
                <button onClick={send} disabled={!text.trim()||sending}
                  style={{
                    borderRadius: isMobile ? 12 : 14, flexShrink:0,
                    padding: isMobile ? '8px 14px' : '10px 20px',
                    background: text.trim()
                      ? 'linear-gradient(135deg, var(--teal), var(--teal-dk))'
                      : 'var(--stone-200)',
                    color: text.trim() ? '#fff' : 'var(--text-muted)',
                    border:'none', fontSize: isMobile ? 13 : 14, fontWeight:800,
                    cursor: text.trim() ? 'pointer' : 'not-allowed',
                    fontFamily:'var(--font)',
                    boxShadow: text.trim() ? 'var(--shadow-teal)' : 'none',
                    transition:'all .2s',
                    display:'flex', alignItems:'center', gap:6,
                  }}
                >
                  {sending
                    ? <span style={{ animation:'cmSpin 1s linear infinite', display:'inline-block' }}>⟳</span>
                    : editingMsg ? `✓ ${t('kurdistan.chatSave')}` : `➤ ${isMobile ? '' : t('kurdistan.chatSend')}`
                  }
                </button>
              </div>

              {/* Footer */}
              <div style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                marginTop:4, paddingInline:4,
              }}>
                <span style={{ fontSize:10, color:'var(--text-muted)' }}>
                  {isMobile ? '' : t('kurdistan.chatInputHint')}
                </span>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  {text.length > 0 && (
                    <svg width="18" height="18" viewBox="0 0 18 18"
                      style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
                      <circle cx="9" cy="9" r={RING_R} fill="none"
                        stroke="var(--border)" strokeWidth="2"/>
                      <circle cx="9" cy="9" r={RING_R} fill="none"
                        stroke={charWarn ? 'var(--red)' : 'var(--teal)'}
                        strokeWidth="2"
                        strokeDasharray={RING_C}
                        strokeDashoffset={RING_C*(1-charPct)}
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  <span style={{
                    fontSize:10,
                    fontWeight: charWarn ? 800 : 400,
                    color: charWarn ? 'var(--red)' : 'var(--text-muted)',
                  }}>{text.length}/{MAX_LEN}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar (nur Desktop) ── */}
        {showSidebar && !isMobile && (
          <div style={{ animation:'cmFadeIn .2s ease', flexShrink:0 }}>
            <OnlineSidebar count={onlineCount} currentUser={user} t={t} />
          </div>
        )}
      </div>

      {/* ── Dialoge ── */}
      {reportMsgId && (
        <ReportDialog onSubmit={reportMsg} onClose={()=>setReportMsgId(null)} t={t} />
      )}
      {confirmId && (
        <ConfirmDialog
          message={t('kurdistan.chatConfirmDelete')}
          confirmLabel={t('kurdistan.chatDeleteConfirm')}
          cancelLabel={t('kurdistan.chatCancel')}
          onConfirm={confirmDelete}
          onCancel={()=>setConfirmId(null)}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position:'fixed', bottom:28, left:'50%',
          transform:'translateX(-50%)',
          background: toast.isError ? 'var(--red)' : 'var(--stone-800)',
          color:'#fff', padding:'11px 24px', borderRadius:14,
          fontSize:13, fontWeight:700,
          boxShadow:'0 8px 32px rgba(0,0,0,.25)',
          zIndex:10000, animation:'cmToast .2s ease', pointerEvents:'none',
          display:'flex', alignItems:'center', gap:8,
          maxWidth:'80vw', textAlign:'center',
          whiteSpace:'nowrap',
        }}>{toast.text}</div>
      )}
    </div>
  );
}
