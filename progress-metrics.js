/** Indicadores auditables. No confundir etapa de desarrollo con conformidad de pruebas. */
const canon=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/\s+/g,' ');
const str=value=>String(value??'').trim();
const validReference=value=>!!str(value)&&!['-','NO APLICA','N/A','NO ENTREGO','PENDIENTE','SIN EVIDENCIA','NO INFORMADO'].includes(canon(value));
const positiveTest=new Set(['APROBADA','APROBADO','CONCLUIDA APROBADA','CONCLUIDAS APROBADAS']);
const positiveApproval=new Set(['CONFORME','APROBADA','APROBADO','CONFORMIDAD OTORGADA']);

export function calculateDevelopment(systems,weights){
 const components=(systems||[]).flatMap(s=>s.components||[]);
 const evaluated=components.filter(c=>Object.hasOwn(weights,c.status));
 const breakdown=Object.entries(weights).map(([state,weight])=>{
  const count=evaluated.filter(c=>c.status===state).length;
  return {state,weight,count,points:count*weight};
 });
 const points=breakdown.reduce((sum,x)=>sum+x.points,0);
 const exact=evaluated.length?points/evaluated.length:null;
 return {value:exact===null?null:Math.round(exact),exact,points,evaluated:evaluated.length,total:components.length,unclassified:components.length-evaluated.length,breakdown};
}

/**
 * Hoja OPCIONAL del Excel técnico: 'Validaciones' o 'Validaciones Laboral'.
 * Columnas exactas (se admiten acentos y mayúsculas):
 * Integración | Resultado de pruebas | Evidencia de pruebas | Conformidad | Evidencia de conformidad
 * Se acredita una integración SÓLO con ambas evaluaciones afirmativas y sus 2 referencias.
 * La mera entrega de datos/ambientes, análisis o envío a calidad NO acredita pruebas.
 * Las claves deben coincidir con los nombres del catálogo fijo para no generar asociaciones hipotéticas.
 */
export function calculateValidation(sheets,catalog){
 const denom=(catalog||[]).length;
 const sheetEntry=[...(sheets?.entries?.()||[])].find(([name])=>['VALIDACIONES','VALIDACIONES LABORAL'].includes(canon(name)));
 const byName=new Map((catalog||[]).map(item=>[canon(item.nombre),item]));
 const records=new Map(),warnings=[];
 if(sheetEntry){
  const [sheet,rows]=sheetEntry;
  const expected=['INTEGRACION','RESULTADO DE PRUEBAS','EVIDENCIA DE PRUEBAS','CONFORMIDAD','EVIDENCIA DE CONFORMIDAD'];
  let headerAt=-1,indices=[];
  for(let i=0;i<Math.min(rows.length,15);i++){
   const h=(rows[i]||[]).map(canon);const candidate=expected.map(x=>h.indexOf(x));
   if(candidate.every(n=>n>=0)){headerAt=i;indices=candidate;break;}
  }
  if(headerAt<0)warnings.push(`La hoja «${sheet}» existe, pero no tiene las cinco columnas de evidencias requeridas.`);
  else{
   for(let i=headerAt+1;i<rows.length;i++){
    const raw=rows[i]||[],[idx,idxTest,idxTestEvidence,idxApproval,idxApprovalEvidence]=indices;
    const name=str(raw[idx]);if(!name)continue;
    const item=byName.get(canon(name));
    if(!item){warnings.push(`«${name}» (${sheet}!${i+1}) no coincide con el catálogo fijo.`);continue;}
    const testResult=str(raw[idxTest]),testEvidence=str(raw[idxTestEvidence]);
    const approval=str(raw[idxApproval]),approvalEvidence=str(raw[idxApprovalEvidence]);
    const testVerified=positiveTest.has(canon(testResult))&&validReference(testEvidence);
    const approved=positiveApproval.has(canon(approval))&&validReference(approvalEvidence);
    const result={name:item.nombre,testResult,testEvidence,approval,approvalEvidence,testVerified,approved,accredited:testVerified&&approved,source:`${sheet}!${i+1}`};
    if(records.has(canon(name))){warnings.push(`«${name}»: registro duplicado en ${sheet}!${i+1}; se descarta para evitar doble conteo.`);continue;}
    records.set(canon(name),result);
   }
  }
 }
 const entries=(catalog||[]).map(item=>records.get(canon(item.nombre))||{name:item.nombre,testResult:'',testEvidence:'',approval:'',approvalEvidence:'',testVerified:false,approved:false,accredited:false,source:''});
 const complete=entries.filter(r=>r.accredited).length;
 const withTest=entries.filter(r=>r.testVerified).length;
 const withApproval=entries.filter(r=>r.approved).length;
 const readable=!!sheetEntry&&!warnings.some(x=>x.includes('cinco columnas'));
 return {sourcePresent:!!sheetEntry,readable,value:readable&&denom?Math.round(complete/denom*100):null,complete,total:denom,withTest,withApproval,rowsRead:records.size,entries,warnings,sourceName:sheetEntry?.[0]||null};
}
