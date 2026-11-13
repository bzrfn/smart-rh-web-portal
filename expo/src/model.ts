export type Role = 'admin' | 'empleado';
export type Session = { role: Role; name: string; until: number };
export type Person = { id: number; name: string; email: string; role: Role; status: 'Activo' | 'Pendiente'; department: string; vacation: number };
export type Attendance = { id: number; personId: number; date: string; entry: string; exit: string; status: string };
export type RequestItem = { id: number; personId: number; type: 'Vacaciones' | 'Incapacidad'; start: string; end: string; reason: string; status: 'Pendiente' | 'Aprobada' | 'Rechazada'; days: number };
export type Ticket = { id: string; title: string; description: string; personId: number; status: 'Abierto' | 'En atención' | 'Resuelto'; reply: string };
export type DemoState = { people: Person[]; attendance: Attendance[]; requests: RequestItem[]; tickets: Ticket[]; events: {id:number;title:string;date:string}[]; audit: string[] };
export const STORAGE_KEY = 'smarth_expo_demo_v1';
export const DEMO_PASSWORD = 'ExpoSMART2026!';
export const DEMO_ACCOUNTS = { admin: 'evaluador@demo.example', empleado: 'empleado@demo.example' };
export const DEMO_DATE = '2026-11-13';
export function initialState(): DemoState {
 return {
  people: [
   {id:1,name:'Andrea Rivera',email:'andrea.rivera@example.invalid',role:'empleado',status:'Activo',department:'Operaciones',vacation:12},
   {id:2,name:'Mateo Vega',email:'mateo.vega@example.invalid',role:'empleado',status:'Activo',department:'Tecnología',vacation:12},
   {id:3,name:'Lucía Torres',email:'lucia.torres@example.invalid',role:'empleado',status:'Activo',department:'Administración',vacation:14},
   {id:4,name:'Diego Morales',email:'diego.morales@example.invalid',role:'empleado',status:'Pendiente',department:'Por completar',vacation:12}
  ],
  attendance:[{id:1,personId:1,date:DEMO_DATE,entry:'09:02',exit:'',status:'En jornada'},{id:2,personId:2,date:DEMO_DATE,entry:'08:58',exit:'18:01',status:'Completa'},{id:3,personId:3,date:DEMO_DATE,entry:'09:05',exit:'',status:'Por revisar'}],
  requests:[{id:1,personId:2,type:'Vacaciones',start:'2026-12-01',end:'2026-12-03',reason:'Descanso programado de demostración.',status:'Pendiente',days:3},{id:2,personId:1,type:'Incapacidad',start:'2026-11-10',end:'2026-11-11',reason:'Caso ficticio con comprobante de muestra.',status:'Pendiente',days:2}],
  tickets:[{id:'DEMO-001',title:'Registro de asistencia no visible',description:'El empleado de muestra registró su entrada. Se revisó fecha y listado; falta validación administrativa.',personId:1,status:'Abierto',reply:''}],
  events:[{id:1,title:'Inducción del personal de muestra',date:'2026-11-18'},{id:2,title:'Cierre de nómina de demostración',date:'2026-11-30'}],
  audit:['Se cargaron datos ficticios para evaluación.']
 };
}
export function authenticate(email:string,password:string,now=Date.now()):Session|null {
 const role=(Object.keys(DEMO_ACCOUNTS) as Role[]).find(r=>DEMO_ACCOUNTS[r]===email.trim().toLowerCase());
 return role&&password===DEMO_PASSWORD?{role,name:role==='admin'?'Evaluador Expo':'Andrea Rivera',until:now+2*60*60*1000}:null;
}
export function activeSession(session:Session|null,now=Date.now()){return Boolean(session&&session.until>now&&(session.role==='admin'||session.role==='empleado'));}
export function peopleFor(state:DemoState,role:Role){return role==='admin'?state.people:state.people.filter(p=>p.id===1);}
export function requestsFor(state:DemoState,role:Role){return state.requests.filter(r=>role==='admin'||r.personId===1);}
export function daysBetween(start:string,end:string){const a=Date.parse(start+'T12:00:00Z'),b=Date.parse(end+'T12:00:00Z');return Number.isFinite(a)&&Number.isFinite(b)?Math.round((b-a)/86400000)+1:0;}
export function reviewRequest(state:DemoState,id:number,status:'Aprobada'|'Rechazada',role:Role):DemoState {
 if(role!=='admin')throw new Error('Esta acción requiere la vista administrativa de demostración.');
 const target=state.requests.find(r=>r.id===id);
 if(!target||target.status!=='Pendiente')throw new Error('La solicitud ya fue atendida o no existe.');
 const person=state.people.find(p=>p.id===target.personId);
 if(status==='Aprobada'&&target.type==='Vacaciones'&&(!person||person.vacation<target.days))throw new Error('El saldo de vacaciones no es suficiente.');
 return {...state,requests:state.requests.map(r=>r.id===id?{...r,status}:r),people:state.people.map(p=>p.id===target.personId&&target.type==='Vacaciones'&&status==='Aprobada'?{...p,vacation:p.vacation-target.days}:p),audit:[`Solicitud ${id}: ${status.toLowerCase()} en la demo.`,...state.audit]};
}
export function createRequest(state:DemoState,input:{type:string;start:string;end:string;reason:string}):DemoState {
 const days=daysBetween(input.start,input.end),type=input.type as RequestItem['type'];
 if(!['Vacaciones','Incapacidad'].includes(type)||days<1||days>90||input.reason.trim().length<8)throw new Error('Indica fechas válidas (máximo 90 días) y un motivo de al menos 8 caracteres.');
 if(type==='Vacaciones'&&days>state.people[0].vacation)throw new Error('La solicitud supera el saldo de vacaciones disponible.');
 if(state.requests.some(r=>r.personId===1&&r.status!=='Rechazada'&&input.start<=r.end&&input.end>=r.start))throw new Error('Las fechas se superponen con otra solicitud de muestra.');
 return {...state,requests:[{id:Math.max(0,...state.requests.map(r=>r.id))+1,personId:1,type,start:input.start,end:input.end,reason:input.reason.trim().slice(0,1000),status:'Pendiente',days},...state.requests],audit:['Se creó una solicitud de muestra.',...state.audit]};
}
export function createTicket(state:DemoState,title:string,description:string,personId=1):DemoState {
 if(title.trim().length<5||description.trim().length<15)throw new Error('Escribe un título de al menos 5 caracteres y una descripción de al menos 15.');
 const max=state.tickets.reduce((n,t)=>Math.max(n,Number(t.id.replace('DEMO-',''))||0),0);
 return {...state,tickets:[{id:'DEMO-'+String(max+1).padStart(3,'0'),title:title.trim().slice(0,120),description:description.trim().slice(0,2000),personId,status:'Abierto',reply:''},...state.tickets],audit:['Se creó un ticket de demostración.',...state.audit]};
}
export function nextAttendance(state:DemoState):DemoState {
 const row=state.attendance.find(a=>a.personId===1&&a.date===DEMO_DATE);
 if(row?.exit)throw new Error('La jornada de muestra ya está completa. Puedes reiniciar la demo para repetirla.');
 return {...state,attendance:row?state.attendance.map(a=>a.id===row.id?{...a,exit:'18:00',status:'Completa'}:a):[{id:Math.max(0,...state.attendance.map(a=>a.id))+1,personId:1,date:DEMO_DATE,entry:'09:00',exit:'',status:'En jornada'},...state.attendance],audit:['Se simuló un registro QR sin enviar datos al servidor.',...state.audit]};
}
export function safeRestoredState(raw:string|null):DemoState {
 if(!raw)return initialState();
 try{const data=JSON.parse(raw);if(!data||!Array.isArray(data.people)||!Array.isArray(data.attendance)||!Array.isArray(data.requests)||!Array.isArray(data.tickets)||!Array.isArray(data.events)||!Array.isArray(data.audit))return initialState();return data;}catch{return initialState();}
}
