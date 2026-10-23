/**
 * Los códigos documentales son identificadores. No se deben interpretar como decimales:
 * 4.1, 4.10 y 4.100 son códigos diferentes.
 *
 * Excel puede guardar 4.10 como número 4.1. Si la celda conserva un formato
 * de decimales fijos (0.00), recuperamos el código visible. Con formato General,
 * los ceros finales originales se pierden y NO es legítimo inventarlos.
 */
const text=value=>String(value??'').replace(/\u0000/g,'').trim();

function fixedDecimals(formatCode){
 const firstSection=text(formatCode).split(';',1)[0].trim();
 const match=firstSection.match(/^(?:0|#,##0)\.(0{1,12})$/);
 return match?match[1].length:null;
}

export function readDocumentCode(value,meta=null){
 const original=text(value);
 if(!original)return {value:'',numeric:false,ambiguous:false,recovered:false};
 if(!meta?.numeric)return {value:original,numeric:false,ambiguous:false,recovered:false};
 const places=fixedDecimals(meta.formatCode);
 if(places!==null&&/^-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?$/.test(original)){
  const numeric=Number(original);
  if(Number.isFinite(numeric)&&Math.abs(numeric)<1e12){
   // Sólo representamos el formato que realmente conservó el Excel.
   return {value:numeric.toFixed(places),numeric:true,ambiguous:false,recovered:true};
  }
 }
 // No intentamos adivinar si una celda General que dice 4.1 era 4.10.
 return {value:original,numeric:true,ambiguous:true,recovered:false};
}
