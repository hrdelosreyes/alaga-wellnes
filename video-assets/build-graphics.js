// Generates 1080x1920 tutorial graphics via headless Chrome. Run: node video-assets/build-graphics.js
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const root=__dirname, pub=path.join(root,'..','public');
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const {pathToFileURL}=require("url");const logo=pathToFileURL(path.join(pub,"logo-vertical.png")).href;
const css=`*{box-sizing:border-box;margin:0}body{width:1080px;height:1920px;background:#FBF6F0;color:#2C2420;font-family:'Segoe UI',Arial,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:150px 80px 350px;text-align:center;position:relative}
.logo{position:absolute;top:150px;left:80px;height:90px}
h1{font-size:96px;line-height:1.1;font-weight:800}h2{font-size:56px;font-weight:700;margin-top:36px}p{font-size:46px;color:#6E5F55;margin-top:28px;line-height:1.3}
.terra{color:#C4714A}.sage{color:#6B8C6E}.gold{color:#C9A84C}.dis{position:absolute;bottom:380px;font-size:34px;color:#6E5F55;left:80px;right:80px}
.bar{display:flex;width:100%;height:150px;border-radius:30px;overflow:hidden;margin-top:60px;font-size:54px;font-weight:800;color:#fff}
.bar div{display:flex;align-items:center;justify-content:center}
.node{background:#fff;border:4px solid #EDE5DF;border-radius:30px;padding:30px 50px;font-size:52px;font-weight:700;width:100%}
.arrow{font-size:60px;color:#C4714A;margin:14px 0}`;
const dis='<div class="dis">Hindi garantisadong kita. Depende sa bookings.</div>';
const cards={
 'split-75-25':`<h1>₱505 na <span class="terra">Relax</span></h1><div class="bar"><div style="width:75%;background:#C4714A">75% · ₱379 sa'yo</div><div style="width:25%;background:#6B8C6E">25%</div></div><h2>Take-home mo: <span class="terra">₱379</span></h2><p>Ang 25% ay para sa operations, booking system, payments, at support.</p>${dis}`,
 'referral-chain':`<h1>Referral: <span class="terra">5%</span> bawat level</h1><p style="margin-bottom:40px">Hanggang 2 levels · unang 100 bookings ng na-refer</p><div class="node">Ikaw 💆‍♀️</div><div class="arrow">▼ 5%</div><div class="node">Na-refer mo</div><div class="arrow">▼ 5%</div><div class="node">Na-refer nila</div>${dis}`,
 'bonus-progress':`<h1>Quarterly <span class="gold">Alaga Bonus</span></h1><p>15+ completed bookings kada quarter para ma-qualify</p><div class="bar" style="background:#EDE5DF;margin-top:70px"><div style="width:80%;background:#C9A84C">12 / 15</div></div><h2>Kung qualified, may share ka sa pool</h2>${dis}`,
 'disclaimer':`<h2 style="font-size:70px">Paalala</h2><p style="color:#2C2420">Hindi garantisadong kita.<br>Ang referral at bonus ay <b>up to</b> / kung qualified lang, at depende sa bookings.<br>Weekly ang payout.</p>`,
 'end-card':`<img src="${logo}" style="height:260px;margin-bottom:40px"><h1>Mag-apply na!</h1><h2 class="terra">alagawellness.care</h2><p>Link sa bio</p>`,
 'hook-1':`<h1>Massage therapist ka ba?</h1><p>Paano kumita sa <b class="terra">Alaga</b></p>`,
 'hook-2':`<h1>Mag-apply in <span class="terra">5 minutes</span></h1><p>NBI + TESDA + photo</p>`,
 'hook-3':`<h1>Na-approve ka na! <span class="terra">Ngayon?</span></h1><p>Rates · Availability · Service area</p>`,
 'hook-4':`<h1>May <span class="terra">booking</span> ka!</h1><p>Accept → Check in → Check out</p>`,
 'hook-5':`<h1>Magkano ba talaga ang <span class="terra">kita</span> ko?</h1><p>75% sa'yo · weekly payout</p>`,
 'hook-6':`<h1>Kumita kahit <span class="terra">off-duty</span>?</h1><p>Referral at Alaga Bonus</p>${dis}`,
};
for(const [n,body] of Object.entries(cards)){
 const f=path.join(root,'_html',n+'.html');
 fs.writeFileSync(f,`<!doctype html><meta charset=utf-8><style>${css}</style>${n==='end-card'?'':`<img class="logo" src="${logo}">`}${body}`);
 execFileSync(CHROME,['--headless','--disable-gpu','--hide-scrollbars','--window-size=1080,1920',`--screenshot=${path.join(root,'graphics',n+'.png')}`,pathToFileURL(f).href],{stdio:'ignore'});
 console.log('made',n);
}
