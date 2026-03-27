import React from 'react';
import { useStore } from '../../store';
import { IconCheck, IconX, IconWarning } from './icons';

export default function ToastManager() {
  const toasts = useStore(s => s.toasts);
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{t.type === 'ok' ? <IconCheck style={{width:14,height:14,color:'#0B9E88'}}/> : t.type === 'err' ? <IconX style={{width:14,height:14,color:'#D94040'}}/> : <IconWarning style={{width:14,height:14,color:'#E8A020'}}/>}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
