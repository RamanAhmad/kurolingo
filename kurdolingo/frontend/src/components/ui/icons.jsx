// icons.jsx — Kurdolingo SVG-Icon-Bibliothek
// Alle Icons sind 16×16 viewBox, stroke-basiert, konsistenter Stil
import React from 'react';

const base = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none',
               stroke: 'currentColor', strokeWidth: 1.8,
               strokeLinecap: 'round', strokeLinejoin: 'round' };

export const IconPlus      = (p) => <svg {...base} {...p}><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>;
export const IconPencil    = (p) => <svg {...base} {...p}><path d="M11 2l3 3-8 8H3v-3l8-8z"/></svg>;
export const IconTrash     = (p) => <svg {...base} {...p}><polyline points="2,4 14,4"/><path d="M5 4V2h6v2"/><path d="M3 4l1 10h8l1-10"/></svg>;
export const IconSave      = (p) => <svg {...base} {...p}><path d="M13 13H3a1 1 0 01-1-1V3l2-1h7l2 2v8a1 1 0 01-1 1z"/><path d="M5 13V8h6v5"/><path d="M5 3h5v3H5z"/></svg>;
export const IconX         = (p) => <svg {...base} {...p}><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>;
export const IconArrowLeft = (p) => <svg {...base} {...p}><polyline points="10,3 4,8 10,13"/><line x1="4" y1="8" x2="14" y2="8"/></svg>;
export const IconArrowRight= (p) => <svg {...base} {...p}><line x1="2" y1="8" x2="12" y2="8"/><polyline points="6,3 12,8 6,13"/></svg>;
export const IconRefresh   = (p) => <svg {...base} {...p}><path d="M13 2v4H9"/><path d="M3 14v-4h4"/><path d="M13 6A6 6 0 104 11"/></svg>;
export const IconSettings  = (p) => <svg {...base} {...p}><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4"/></svg>;
export const IconUpload    = (p) => <svg {...base} {...p}><polyline points="4,6 8,2 12,6"/><line x1="8" y1="2" x2="8" y2="11"/><path d="M2 13h12"/></svg>;
export const IconSearch    = (p) => <svg {...base} {...p}><circle cx="7" cy="7" r="4"/><line x1="10.5" y1="10.5" x2="14" y2="14"/></svg>;
export const IconCheck     = (p) => <svg {...base} {...p}><polyline points="2,8 6,12 14,4"/></svg>;
export const IconWarning   = (p) => <svg {...base} {...p}><path d="M8 1L15 14H1L8 1z"/><line x1="8" y1="6" x2="8" y2="10"/><circle cx="8" cy="12" r=".5" fill="currentColor" stroke="none"/></svg>;
export const IconPlay      = (p) => <svg {...base} {...p} fill="currentColor" stroke="none"><polygon points="4,2 13,8 4,14"/></svg>;
export const IconVolume    = (p) => <svg {...base} {...p}><polygon points="2,6 6,6 10,2 10,14 6,10 2,10" fill="currentColor" stroke="none"/><path d="M12 5a4 4 0 010 6" strokeWidth="1.8" fill="none"/></svg>;
export const IconLink      = (p) => <svg {...base} {...p}><path d="M6 10a4 4 0 005.66 0l2-2a4 4 0 00-5.66-5.66l-1 1"/><path d="M10 6a4 4 0 00-5.66 0l-2 2a4 4 0 005.66 5.66l1-1"/></svg>;
export const IconLogout    = (p) => <svg {...base} {...p}><path d="M10 3H4a1 1 0 00-1 1v8a1 1 0 001 1h6"/><polyline points="13,5 15,8 13,11" strokeWidth="1.8"/><line x1="8" y1="8" x2="15" y2="8"/></svg>;
export const IconUser      = (p) => <svg {...base} {...p}><circle cx="8" cy="5" r="3"/><path d="M2 14c0-3 2.7-5 6-5s6 2 6 5"/></svg>;
export const IconStar      = (p) => <svg {...base} {...p}><polygon points="8,1 10,6 15,6 11,9.5 12.5,14.5 8,11.5 3.5,14.5 5,9.5 1,6 6,6" strokeWidth="1.5"/></svg>;
export const IconDownload  = (p) => <svg {...base} {...p}><polyline points="4,10 8,14 12,10"/><line x1="8" y1="14" x2="8" y2="5"/><path d="M2 3h12"/></svg>;
export const IconImage     = (p) => <svg {...base} {...p}><rect x="2" y="2" width="12" height="12" rx="2"/><circle cx="5.5" cy="5.5" r="1" fill="currentColor" stroke="none"/><polyline points="2,11 5,7 8,10 11,7 14,11"/></svg>;
export const IconMic       = (p) => <svg {...base} {...p}><rect x="5" y="1" width="6" height="8" rx="3"/><path d="M2 8a6 6 0 0012 0"/><line x1="8" y1="14" x2="8" y2="16" strokeWidth="2"/><line x1="5" y1="16" x2="11" y2="16"/></svg>;
export const IconGlobe     = (p) => <svg {...base} {...p}><circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c-2 2-3 3.5-3 6s1 4 3 6M8 2c2 2 3 3.5 3 6s-1 4-3 6"/></svg>;
export const IconBook      = (p) => <svg {...base} {...p}><path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4l-2-2V3a1 1 0 012-1z"/><line x1="4" y1="6" x2="10" y2="6"/><line x1="4" y1="9" x2="10" y2="9"/></svg>;
export const IconFlame     = (p) => <svg {...base} {...p} fill="currentColor" stroke="none"><path d="M8 1C6 4 3 6 3 9.5a5 5 0 0010 0c0-2-1-3-1-3-1 2-2 2-2 2C10 8 9 5 8 1z"/></svg>;
export const IconBolt      = (p) => <svg {...base} {...p} fill="currentColor" stroke="none"><polygon points="9,1 4,9 8,9 7,15 12,7 8,7"/></svg>;
export const IconGem       = (p) => <svg {...base} {...p}><polygon points="8,1 14,5 14,11 8,15 2,11 2,5" strokeWidth="1.5"/><polyline points="2,5 8,9 14,5" strokeWidth="1.5"/><line x1="8" y1="9" x2="8" y2="15" strokeWidth="1.5"/></svg>;
export const IconHeart     = (p) => <svg {...base} {...p}><path d="M8 13s-6-4-6-7.5A3.5 3.5 0 018 3a3.5 3.5 0 016 2.5C14 9 8 13 8 13z"/></svg>;
export const IconTrophy    = (p) => <svg {...base} {...p}><path d="M5 2h6v5a3 3 0 01-6 0V2z"/><path d="M2 3h3M11 3h3"/><path d="M2 3c0 4 2 5 3 6M14 3c0 4-2 5-3 6"/><line x1="8" y1="10" x2="8" y2="13"/><path d="M5 13h6"/></svg>;
export const IconGrid      = (p) => <svg {...base} {...p}><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>;
export const IconList      = (p) => <svg {...base} {...p}><line x1="4" y1="5" x2="14" y2="5"/><line x1="4" y1="8" x2="14" y2="8"/><line x1="4" y1="11" x2="14" y2="11"/><circle cx="2" cy="5"  r=".8" fill="currentColor" stroke="none"/><circle cx="2" cy="8"  r=".8" fill="currentColor" stroke="none"/><circle cx="2" cy="11" r=".8" fill="currentColor" stroke="none"/></svg>;
export const IconFilter    = (p) => <svg {...base} {...p}><polygon points="1,2 15,2 10,8 10,14 6,12 6,8"/></svg>;
export const IconAdmin     = (p) => <svg {...base} {...p}><path d="M8 1l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z"/></svg>;
export const IconCopy      = (p) => <svg {...base} {...p}><rect x="5" y="5" width="9" height="9" rx="1"/><path d="M5 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v10a1 1 0 001 1h2"/></svg>;
export const IconEye       = (p) => <svg {...base} {...p}><path d="M1 8S3 3 8 3s7 5 7 5-2 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2.5"/></svg>;
export const IconShield    = (p) => <svg {...base} {...p}><path d="M8 1l5 2v5c0 3-2 5-5 7C5 13 3 11 3 8V3l5-2z"/></svg>;
