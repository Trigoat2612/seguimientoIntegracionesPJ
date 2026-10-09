/** Sistema (columna F de Sistemas) > integración técnica (columna G) > endpoint.
 * No se adjudican endpoints a componentes sin correspondencia verificable. */
const key=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
const noDup=values=>[...new Set(values.filter(Boolean))];
const stem=value=>key(value).replace(/(?:\s+(?:REST|API|WS))+$/,'').trim();
const UNASSIGNED='__PENDIENTE_DE_ASOCIACION__';
const STAGES={'Pendiente':0,'En análisis':20,'En revisión':35,'En desarrollo':55,'Enviado a calidad':80,'No requiere modificación':100};
export const systemId=name=>`system:${key(name)}`;
export const integrationId=(system,component)=>`integration:${key(system)}|${key(component)}`;
export const endpointId=endpoint=>`endpoint:${endpoint.id}`;
export function buildHierarchy(model){
 const systems=[],byName=new Map();
 function ensureSystem(name){const id=systemId(name);if(byName.has(id))return byName.get(id);const s={id,name,integrations:[],statusCounts:{},components:[],progress:null,progressCoverage:0,progressTotal:0,endpoints:[],sources:[],unassigned:0,operationCount:0,routes:0,attributes:0,dbDependencies:0};systems.push(s);byName.set(id,s);return s;}
 for(const group of model.integrations){
  const s=ensureSystem(group.name);s.components=group.components;s.statusCounts=group.statusCounts;s.progress=group.progress;s.progressCoverage=group.progressCoverage;s.progressTotal=group.progressTotal;s.sources=group.sources;s.dbDependencies=group.dbDependencies;
  const componentMap=new Map();
  for(const c of group.components){
   const named=c.component&&key(c.component)!=='SIN COMPONENTE';
   const name=named?c.component:'Pendiente de asociación';const id=integrationId(s.name,named?name:UNASSIGNED);
   let integration=componentMap.get(id);
   if(!integration){integration={id,systemId:s.id,system:s.name,name,components:[],endpoints:[],statusCounts:{},progress:null,progressCoverage:0,progressTotal:0,matched:!!named,source:named?'Sistemas':'Sistemas: componente sin nombre',sources:[]};componentMap.set(id,integration);s.integrations.push(integration);}
   integration.components.push(c);integration.statusCounts[c.status]=(integration.statusCounts[c.status]||0)+1;integration.sources.push(`Sistemas!${c.row}`);
  }
  for(const t of s.integrations){const eligible=t.components.filter(c=>Object.hasOwn(STAGES,c.status));t.progressCoverage=eligible.length;t.progressTotal=t.components.length;t.progress=eligible.length?Math.round(eligible.reduce((sum,c)=>sum+STAGES[c.status],0)/eligible.length):null;}
 }
 for(const ep of model.endpoints){
  const s=ensureSystem(ep.integration);let linked=s.integrations.find(t=>t.matched&&key(t.name)===key(ep.component));
  let mapping='Componente exacto';
  if(!linked){const base=stem(ep.component);if(base.length>=9&&base.includes(' ')){const candidates=s.integrations.filter(t=>t.matched&&stem(t.name)===base);if(candidates.length===1){linked=candidates[0];mapping='Nombre base de servicio equivalente';}}}
  if(!linked){const candidate=s.integrations.filter(t=>t.matched&&key(ep.path).startsWith(key(t.name)+' '));if(candidate.length===1){linked=candidate[0];mapping='Prefijo de ruta';}}
  if(!linked){
   linked=s.integrations.find(t=>!t.matched);
   if(!linked){linked={id:integrationId(s.name,UNASSIGNED),systemId:s.id,system:s.name,name:'Pendiente de asociación',components:[],endpoints:[],statusCounts:{},progress:null,progressCoverage:0,progressTotal:0,matched:false,source:'Sin vínculo verificable en Sistemas',sources:[]};s.integrations.push(linked);}
   mapping='Sin correspondencia confirmada';s.unassigned++;
  }
  ep.systemId=s.id;ep.technicalIntegrationId=linked.id;ep.mappingBasis=mapping;
  linked.endpoints.push(ep);s.endpoints.push(ep);
 }
 for(const s of systems){
  s.integrations.sort((a,b)=>Number(b.matched)-Number(a.matched)||a.name.localeCompare(b.name,'es'));
  s.operationCount=s.endpoints.length;s.routes=s.endpoints.filter(e=>e.kind==='Ruta API').length;s.attributes=s.endpoints.reduce((sum,e)=>sum+e.attributeTotal,0);
  for(const t of s.integrations){t.sources=noDup([...t.sources,...t.endpoints.flatMap(e=>e.sources)]);t.routes=t.endpoints.filter(e=>e.kind==='Ruta API').length;t.attributes=t.endpoints.reduce((sum,e)=>sum+e.attributeTotal,0);}
 }
 return {systems,integrations:systems.flatMap(s=>s.integrations),unassigned:systems.reduce((sum,s)=>sum+s.unassigned,0)};
}
