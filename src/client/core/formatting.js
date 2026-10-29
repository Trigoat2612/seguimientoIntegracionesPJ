/** Formatos y clases semánticas compartidos por las vistas. No realizan peticiones ni escrituras. */
export const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const number=n=>Number(n||0).toLocaleString('es-PE');
export const trim=(v,n=80)=>{const s=String(v??'');return s.length>n?s.slice(0,n-1)+'…':s};
export const percent=(num,den)=>den?Math.round(num/den*100)+'%':'—';
export const unique=a=>[...new Set(a.filter(Boolean))];
export const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export const statusClass=s=>/Enviado a calidad|No requiere modificaci/i.test(s)?'badge-green':/En desarrollo/i.test(s)?'badge-blue':/Pendiente/i.test(s)?'badge-yellow':/Revisi[oó]n|An[aá]lisis/i.test(s)?'badge-purple':/mixto|sin estado/i.test(s)?'badge-gray':'badge-gray';
export const equivalentClass=s=>s==='No existe'?'badge-red':s==='No documentado'?'badge-gray':'badge-green';
