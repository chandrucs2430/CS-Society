'use strict';
const H=36e5, HOME={x:400,y:290}, KM=0.004;
/* ---------- vocab ---------- */
const CAT={litter:{label:'Litter'},dumping:{label:'Illegal dumping'},damage:{label:'Damaged public property'},bin:{label:'Overflowing bin'},other:{label:'Other'}};
const CAT_HELP={litter:'Rubbish on paths, grass or roads',dumping:'Bulky items or bags left where they shouldn’t be',damage:'Benches, play equipment, signs, paving',bin:'A public bin that is full or spilling',other:'Anything else a neighbor could help with'};
const STATUSES=['New','Claimed','In Progress','Resolved'];
const ST={New:{cls:'st-new',mk:'#E8A92E',help:'Reported and waiting for a volunteer to take it on.'},Claimed:{cls:'st-claimed',mk:'#27B3A8',help:'A volunteer has said they’ll handle it.'},'In Progress':{cls:'st-progress',mk:'#7BCB5B',help:'Work has started. Notes and photos appear on the timeline.'},Resolved:{cls:'st-resolved',mk:'#CDE9D3',help:'Finished, with a note or photo showing what was done.'}};
const PPL={};
const LM=[];

