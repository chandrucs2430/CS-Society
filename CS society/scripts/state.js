'use strict';
/* ---------- state ---------- */
const KEY='cs-society-live-v1';
let state;
function seed(){return {v:3,signedIn:false,mode:'resident',hours:0,extraReported:0,extraResolved:0,flags:[],nextId:1,
  profile:{name:'',email:'',hood:'',roles:['resident','volunteer'],photo:null,prefs:{claimed:true,update:true,resolved:true,milestone:true,near:false}},
  issues:[],notifs:[],nid:1}}
function load(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.v===3)return s}catch(e){}return seed()}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}
state=load();if(!state.loc)state.loc={lat:10.8155,lng:78.6965,label:'Tiruchirappalli, Tamil Nadu'};

