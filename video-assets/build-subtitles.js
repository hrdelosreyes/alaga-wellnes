// Builds .srt files + voiceover-scripts.md from therapist-tutorial-video-scripts.md
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','therapist-tutorial-video-scripts.md'),'utf8');
const names={1:'overview',2:'mag-apply',3:'setup',4:'unang-booking',5:'kita-at-payout',6:'referral-bonus'};
const ts=s=>{const ms=Math.round(s*1000),h=String(Math.floor(ms/3600000)).padStart(2,'0'),m=String(Math.floor(ms/60000)%60).padStart(2,'0'),x=String(Math.floor(ms/1000)%60).padStart(2,'0'),z=String(ms%1000).padStart(3,'0');return `${h}:${m}:${x},${z}`};
const parts=src.split(/^## EP /m).slice(1);
let vo='# Voiceover Scripts (clean read-through)\n\nRead at a natural pace. Times are the target windows per line.\n';
for(const p of parts){
 const ep=Number(p[0]);const title=p.split('\n')[0].replace(/^\d+\s*—\s*/,'').replace(/\s*⭐/,'');
 const rows=[];
 for(const l of p.split('\n')){
  const c=l.split('|').map(x=>x.trim());
  if(c.length<7)continue;
  const m=c[2].match(/^(\d+)[–-](\d+)s$/);if(!m)continue;
  const text=c[5].replace(/^"|"$/g,'').replace(/\\"/g,'"');
  rows.push({a:+m[1],b:+m[2],text});
 }
 const cues=[];
 for(const r of rows){
  const w=r.text.split(' ');const ch=[];const n=Math.ceil(w.length/6),sz=Math.ceil(w.length/n);for(let i=0;i<w.length;i+=sz)ch.push(w.slice(i,i+sz).join(' '));
  const tot=ch.reduce((a,c)=>a+c.length,0),end=Math.max(r.a+0.5,r.b-0.2);let t=r.a;
  for(const c of ch){const d=(end-r.a)*c.length/tot;cues.push({a:t,b:t+d-0.05,text:c});t+=d}
 }
 const srt=cues.map((r,i)=>`${i+1}\n${ts(r.a)} --> ${ts(r.b)}\n${r.text}\n`).join('\n');
 fs.writeFileSync(path.join(__dirname,'subtitles',`EP${ep}-${names[ep]}.srt`),srt);
 vo+=`\n## EP ${ep} — ${title}\n\n`+rows.map(r=>`**[${r.a}–${r.b}s]** ${r.text}`).join('\n\n')+'\n';
}
fs.writeFileSync(path.join(__dirname,'voiceover-scripts.md'),vo);
console.log('done',parts.length);
