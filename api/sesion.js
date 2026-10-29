/** Identidad autenticada para la interfaz. No requiere acceso a Google Drive. */
import {identifyViewer} from '../autorizacion-servidor.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).json({error:'Método no permitido.'});
 try{
  const {email,role,canEdit}=await identifyViewer(req);
  return res.status(200).json({email,role,canEdit,driveRequired:false});
 }catch(e){return res.status(e.status||500).json({error:e.status?e.message:'No se pudo verificar la sesión.'});}
}
