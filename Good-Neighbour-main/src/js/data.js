'use strict';

/* ---------- vocab ---------- */
const CAT={litter:{label:'Litter'},dumping:{label:'Illegal dumping'},damage:{label:'Damaged public property'},bin:{label:'Overflowing bin'},other:{label:'Other'}};
const CAT_HELP={litter:'Rubbish on paths, grass or roads',dumping:'Bulky items or bags left where they shouldn’t be',damage:'Benches, play equipment, signs, paving',bin:'A public bin that is full or spilling',other:'Anything else a neighbor could help with'};
const STATUSES=['New','Claimed','In Progress','Resolved'];
const ST={New:{cls:'st-new',mk:'#E8A92E',help:'Reported and waiting for a volunteer to take it on.'},Claimed:{cls:'st-claimed',mk:'#27B3A8',help:'A volunteer has said they’ll handle it.'},'In Progress':{cls:'st-progress',mk:'#7BCB5B',help:'Work has started. Notes and photos appear on the timeline.'},Resolved:{cls:'st-resolved',mk:'#CDE9D3',help:'Finished, with a note or photo showing what was done.'}};
const PPL={tara:'Tara N.',arun:'Arun K.',meera:'Meera S.',ravi:'Ravi P.',dev:'Dev L.',joyce:'Joyce M.',imran:'Imran H.'};
const LM=[{n:'Community Park gate',x:300,y:262},{n:'the park playground',x:190,y:190},{n:'Mill Road bus stop',x:342,y:312},{n:'the corner shop on Mill Road',x:612,y:322},{n:'the library',x:545,y:238},{n:'Library Lane footpath',x:514,y:150},{n:'the canal footbridge',x:210,y:462},{n:'the canal bridge on Library Lane',x:530,y:455},{n:'the school gate on Orchard Street',x:648,y:410},{n:'the canal path fence',x:690,y:432}];
const SERIES={rep:[14,18,16,21,19,24,22,27,25,29,26,31],res:[9,12,13,15,16,18,19,21,22,24,23,27]};
const BASE_HOURS=436, BASE_VOL=58;

/* ---------- icons ---------- */
const ICONS={home:'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',map:'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',plus:'M12 5v14M5 12h14',chart:'M5 20V11M12 20V5M19 20v-7',user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6',bell:'M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4',check:'M5 12.5l4.5 4.5L19 7.5',flag:'M5 21V4M5 4h11l-2 4 2 4H5',pin:'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',search:'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',x:'M6 6l12 12M18 6L6 18',camera:'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',leaf:'M5 19c0-9 5-14 15-14 0 10-5 15-15 14zM5 19l8-8',clock:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',hand:'M8 12V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8c0 4-2 7-6 7-3 0-4-2-6-5l-1-2a1.5 1.5 0 0 1 2.5-1.5L8 14',list:'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',locate:'M12 3v3M12 18v3M3 12h3M18 12h3M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',chev:'M9 6l6 6-6 6',arrow:'M5 12h14M13 6l6 6-6 6',back:'M19 12H5M11 6l-6 6 6 6',alert:'M12 4l9 16H3zM12 10v4M12 17h.01',bin:'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6',litter:'M9 3h6l1 3H8zM8 6h8l-1 15H9zM9 11h6',dumping:'M3 20h18M5 20v-6h6v6M11 20v-9h7v9',damage:'M5 5h14v4H5zM4 12h16v3H4zM6 15v5M18 15v5',other:'M6 12h.01M12 12h.01M18 12h.01',info:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',shield:'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',note:'M5 4h14v12H9l-4 4zM9 9h6M9 12h4',undo:'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'};
const ic=(n,s=20,sw=1.8)=>`<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${n==='other'?3.6:sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[n]}"/></svg>`;
const SSYM={
 New:c=>`<circle cx="12" cy="12" r="9" fill="none" stroke="${c}" stroke-width="2.4"/><path d="M12 7v6M12 16.5h.01" stroke="${c}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`,
 Claimed:c=>`<circle cx="12" cy="12" r="9" fill="none" stroke="${c}" stroke-width="2.4"/><circle cx="12" cy="12" r="3.2" fill="${c}"/>`,
 'In Progress':c=>`<circle cx="12" cy="12" r="9" fill="none" stroke="${c}" stroke-width="2.4"/><path d="M12 3a9 9 0 0 1 0 18z" fill="${c}"/>`,
 Resolved:c=>`<circle cx="12" cy="12" r="10" fill="${c}"/><path d="M7.5 12.5l3 3 6-7" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`};
const sIcon=(st,s=16,c='currentColor')=>`<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${SSYM[st](c)}</svg>`;
const chip=st=>`<span class="chip ${ST[st].cls}">${sIcon(st,16)}${st}</span>`;
const catChip=c=>`<span class="chip chip-cat">${ic(c,16)}${CAT[c].label}</span>`;

/* ---------- state ---------- */
const KEY='good-neighbor-demo-v2';
let state;
function seed(){
  const now=Date.now();
  const T=(h,who,type,text,x)=>Object.assign({ts:now-h*H,who,type,text},x||{});
  const I=(id,title,cat,status,x,y,place,desc,reporter,volunteer,hAgo,tl)=>({id,title,cat,status,x,y,place,desc,reporter,volunteer,reportedAt:now-hAgo*H,timeline:tl});
  return {v:2,signedIn:true,mode:'volunteer',hours:7.5,extraReported:0,extraResolved:0,flags:[],nextId:114,
   profile:{name:'Maya Raman',email:'maya.demo@example.com',hood:'Kaveri Gardens',roles:['resident','volunteer'],photo:null,prefs:{claimed:true,update:true,resolved:true,milestone:true,near:false}},
   issues:[
    I(101,'Overflowing bin near the community park','bin','New',305,265,'Park Road, by the Community Park gate','The bin by the park gate has been full since the weekend. Wrappers and bottles are spilling onto the footpath and blowing into the road.','me',null,5,[T(5,'me','reported','Full since the weekend. Photo attached.',{photo:'before'})]),
    I(102,'Litter along the footpath by the library','litter','Claimed',548,200,'Library Lane footpath','Wrappers, cups and bottles line the footpath outside the library, mostly near the hedge.','tara','arun',26,[T(26,'tara','reported','Wrappers and bottles along the footpath outside the library.',{photo:'before'}),T(20,'arun','claim','I can bring bags and gloves on Saturday morning.')]),
    I(103,'Broken bench beside the bus stop','damage','In Progress',350,320,'Mill Road bus stop','Two slats on the bench are split and one end is loose, so it isn’t safe to sit on.','dev','meera',96,[T(96,'dev','reported','Two slats are split and one end is loose.',{photo:'before'}),T(70,'meera','claim','I can fix this with new slats and screws.'),T(30,'meera','status','Measured the slats and ordered replacement boards from the hardware shop. I’ll start once they arrive.',{status:'In Progress'})]),
    I(104,'Illegal dumping near the canal path','dumping','New',210,455,'Canal path, near the footbridge','Bags of household waste and a broken chair have been left beside the footbridge. Please don’t touch anything sharp.','joyce',null,3,[T(3,'joyce','reported','Bags of household waste and a broken chair near the footbridge.',{photo:'before'})]),
    I(105,'Worn swing chain at the park playground','damage','Claimed',190,190,'Community Park playground','The chain on the left swing is badly rusted and looks close to snapping.','me','ravi',48,[T(48,'me','reported','The chain on the left swing is badly rusted and looks close to snapping.'),T(40,'ravi','claim','I know the park caretaker and will ask about a replacement.'),T(3,'ravi','note','Tied a warning ribbon to the swing. The caretaker will bring a new chain this week.')]),
    I(106,'Overflowing bin outside the corner shop','bin','New',612,320,'Mill Road, outside the corner shop','The bin outside the shop overflows most evenings and wrappers end up in the road.','imran',null,9,[T(9,'imran','reported','Overflowing every evening this week.')]),
    I(107,'Litter at the school gate','litter','Resolved',648,408,'Orchard Street school gate','Crisp packets and bottles collected by the school gate after the weekend fair.','me','arun',144,[T(144,'me','reported','Crisp packets and bottles collected by the gate.',{photo:'before'}),T(130,'arun','claim','Happy to pick this up on my way past.'),T(124,'arun','status','Picked up two bags of litter and swept the gate area.',{status:'Resolved',photo:'after'})]),
    I(108,'Fallen branch across the footpath','other','In Progress',508,152,'Library Lane, north footpath','A large branch came down in the rain and covers half the footpath.','tara','me',24,[T(24,'tara','reported','A large branch came down in last night’s rain and covers half the footpath.',{photo:'before'}),T(18,'me','claim','I can clear this tomorrow.'),T(6,'me','status','Cleared the smaller branches. I need a second person to move the trunk.',{status:'In Progress',photo:'progress'})]),
    I(109,'Loose paving slab on the Mill Road footpath','damage','Resolved',440,312,'Mill Road footpath','One slab rocks underfoot, which is a trip risk for anyone with a stroller or walking aid.','dev','me',220,[T(220,'dev','reported','One slab rocks underfoot.',{photo:'before'}),T(210,'me','claim','I’ll fix it with a bag of sand.'),T(196,'me','status','Lifted the slab, levelled the base with sand and set it back. It’s steady now.',{status:'Resolved',photo:'after'})]),
    I(110,'Dumped mattress beside the canal bridge','dumping','Claimed',535,452,'Canal bridge on Library Lane','A mattress and two chairs have been left beside the bridge.','imran','meera',50,[T(50,'imran','reported','A mattress and two chairs left beside the canal bridge.',{photo:'before'}),T(40,'meera','claim','I’m also passing this to the municipal bulk-waste service, and will post here when I hear back.')]),
    I(111,'Overflowing bin by the library entrance','bin','New',505,236,'Library entrance','The bin by the entrance is full and the lid won’t close.','joyce',null,14,[T(14,'joyce','reported','The lid won’t close and bags are piling up beside it.')]),
    I(112,'Litter caught in the canal fence','litter','New',690,430,'Canal path fence','Plastic bags and bottles are caught in the fence along the canal path.','dev',null,52,[T(52,'dev','reported','Lots of plastic caught in the fence.',{photo:'before'})]),
    I(113,'Peeling paint on the library railing','damage','Resolved',530,255,'Library steps','The railing paint was flaking onto the steps and rough to the touch.','tara','ravi',288,[T(288,'tara','reported','The paint is flaking onto the steps.',{photo:'before'}),T(270,'ravi','claim','I have a wire brush and weatherproof paint.'),T(250,'ravi','status','Sanded back and repainted two coats. Please give it a day to dry fully.',{status:'Resolved',photo:'after'})])
   ],
   notifs:[
    {id:1,type:'update',ts:now-3*H,read:false,issue:105,text:'Ravi P. added an update to your report'},
    {id:2,type:'near',ts:now-14*H,read:false,issue:111,text:'New report near your pin'},
    {id:3,type:'claimed',ts:now-40*H,read:true,issue:105,text:'Ravi P. claimed your report'},
    {id:4,type:'resolved',ts:now-124*H,read:true,issue:107,text:'Your report was resolved by Arun K.'},
    {id:5,type:'milestone',ts:now-196*H,read:true,issue:109,text:'New milestone: Finished the job'}],nid:6};
}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.v===2)return s}catch(e){}return seed()}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}
state=load();
