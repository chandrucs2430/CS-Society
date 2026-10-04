'use strict';
/* ---------- state ---------- */
let state;
function seed(){return {signedIn:false,mode:'resident',hours:0,flags:[],
  profileStatus:'signedOut',profileError:'',profileUserId:null,
  profile:{name:'',email:'',hood:'',roles:[],photo:null,avatarPath:null,prefs:{claimed:true,update:true,resolved:true,milestone:true,near:false}},
  issues:[],notifs:[],people:{},communityProfiles:[]}}
state=seed();state.loc={lat:10.8155,lng:78.6965,label:'Tiruchirappalli, Tamil Nadu'};
