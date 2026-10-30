/** Presentación estable de la fecha de publicación documental, en horario de Perú. */
export function formatDocumentPublicationDate(iso){
 if(!iso)return 'No registrada';
 const instant=new Date(iso);
 if(Number.isNaN(instant.getTime()))return 'No registrada';
 return new Intl.DateTimeFormat('es-PE',{
  timeZone:'America/Lima',day:'2-digit',month:'2-digit',year:'numeric',
  hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true
 }).format(instant);
}
