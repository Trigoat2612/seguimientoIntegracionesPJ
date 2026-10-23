/** Diagnóstico SIN secretos de las variables usadas exclusivamente por la API. */
export const SERVER_ENV_KEYS=Object.freeze(['DATABASE_URL','GOOGLE_OAUTH_CLIENT_ID','DOCUMENT_EDITOR_EMAILS']);
export function environmentReadiness(env={}){
 const present={
  DATABASE_URL:!!String(env.DATABASE_URL||'').trim(),
  GOOGLE_OAUTH_CLIENT_ID:!!String(env.GOOGLE_OAUTH_CLIENT_ID||'').trim(),
  DOCUMENT_EDITOR_EMAILS:String(env.DOCUMENT_EDITOR_EMAILS||'').split(',').some(s=>s.trim())
 };
 return {present,missing:SERVER_ENV_KEYS.filter(k=>!present[k]),ready:Object.values(present).every(Boolean)};
}
export function editorConfigurationError(env={}){
 const missing=environmentReadiness(env).missing.filter(k=>k!=='DATABASE_URL');
 if(!missing.length)return '';
 return `La API no recibe ${missing.join(' y ')}. Revisa las variables Development del proyecto Vercel vinculado y reinicia npx vercel dev. El archivo .env.local por sí solo no demuestra que la función las haya cargado.`;
}
export function canShowLocalDiagnostic(env={},hostname=''){
 const host=String(hostname||'').split(':')[0].toLowerCase();
 return env.VERCEL_ENV!=='production' && (env.VERCEL_ENV==='development' || host==='localhost'||host==='127.0.0.1');
}
