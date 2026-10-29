/** Identidad para lecturas de Neon; Google Drive tiene otro token y otro permiso. */
import {editorConfigurationError} from './bitacora-config-servidor.js';
const normalizeEmails=value=>new Set(String(value||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean));
const error=(status,message)=>Object.assign(new Error(message),{status});

/** Una cuenta lectora puede consultar, pero solo un editor puede modificar o sincronizar. */
export async function identifyViewer(req){
 const configError=editorConfigurationError(process.env);
 if(configError)throw error(503,configError);
 const match=String(req?.headers?.authorization||'').match(/^Bearer ([A-Za-z0-9._~-]{15,4096})$/);
 if(!match)throw error(401,'Inicia sesión para acceder a la información privada de Neon.');
 const token=match[1],clientId=process.env.GOOGLE_OAUTH_CLIENT_ID;
 let verification,profile;
 try{
  [verification,profile]=await Promise.all([
   fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(9000)}),
   fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},signal:AbortSignal.timeout(9000)})
  ]);
 }catch{throw error(503,'No fue posible verificar la sesión de identidad con Google.');}
 if(!verification.ok||!profile.ok)throw error(401,'La sesión de identidad caducó. Inicia sesión de nuevo.');
 let claims,user;
 try{[claims,user]=await Promise.all([verification.json(),profile.json()]);}catch{throw error(401,'No pudo verificarse la identidad de la sesión.');}
 if(![claims.aud,claims.issued_to].includes(clientId))throw error(403,'El token no pertenece al cliente autorizado de esta aplicación.');
 const email=String(user.email||'').trim().toLowerCase();
 if(!email||![true,'true'].includes(user.email_verified)||claims.email&&String(claims.email).toLowerCase()!==email)throw error(403,'La cuenta no tiene un correo verificado.');
 // Requiere permiso explícito de identidad, no el permiso de Google Drive.
 const scopes=String(claims.scope||'').split(/\s+/).filter(Boolean);
 if(!scopes.some(s=>['email','https://www.googleapis.com/auth/userinfo.email'].includes(s)))throw error(403,'Se requiere un token de identidad; el permiso de Drive no autoriza la lectura de Neon.');
 const editors=normalizeEmails(process.env.DOCUMENT_EDITOR_EMAILS);
 const readers=normalizeEmails(process.env.DASHBOARD_VIEWER_EMAILS);
 if(!editors.has(email)&&!readers.has(email))throw error(403,'Esta cuenta no está autorizada para consultar el tablero.');
 return {email,canEdit:editors.has(email),role:editors.has(email)?'editor':'lector'};
}
export async function identifyEditor(req){
 const identity=await identifyViewer(req);
 if(!identity.canEdit)throw error(403,'Tu sesión permite consultar, pero no editar, publicar ni sincronizar datos.');
 return identity.email;
}
