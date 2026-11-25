export function randomInt(max, cryptoApi = globalThis.crypto) {
 if (!Number.isInteger(max) || max < 1 || max > 4294967296) throw new RangeError('Invalid bound');
 const limit = Math.floor(4294967296 / max) * max; let n;
 do { n = cryptoApi.getRandomValues(new Uint32Array(1))[0]; } while(n >= limit);
 return n % max;
}
export function shuffle(cards) { const a = cards.map(c=>({...c,reversed:randomInt(2)===1})); for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];} return a; }
export function localDay(d=new Date()) {return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function restoreDaily(raw,cards,day=localDay()) {try {const s=JSON.parse(raw);const c=cards.find(c=>c.id===s?.id);return c&&s.day===day&&typeof s.reversed==='boolean'?{...c,reversed:s.reversed}:null;}catch{return null}}
export const meaning = c => c.meanings[c.reversed?'reversed':'upright'];
const has=(c,...tags)=>tags.some(t=>meaning(c).tags.includes(t));
const label=c=>`${c.name}${c.reversed?' (перевёрнутая)':''}`;
const challenge=(c,topic)=>meaning(c)[topic==='love'?'loveChallenge':'challenge'];
const firstSentence=s=>s.match(/[^.!?]+[.!?]/)?.[0]?.trim()||s;
const isLove=s=>['feelings','thinking','together','relationship'].includes(s.id);
const topicFor=(s,topic)=>isLove(s)?'love':['general','love','work'].includes(topic)?topic:'general';
export function adviceFor(c,topic='general') {
 const m=meaning(c);
 return (topic==='love'?m.loveAdvice:topic==='work'?m.workAdvice:m.advice)||m.advice;
}
export function interpret(c,context='general') {
 const m=meaning(c);
 if(context==='advice')return adviceFor(c);
 if(context==='resource')return `На что можно опереться: ${m.advice}`;
 if(context==='challenge')return m.challenge;
 if(context==='past')return `Что могло привести к нынешней ситуации: ${m.general}`;
 if(context==='future')return `Возможное продолжение, если ничего не менять: ${m.general}`;
 return m[context]||m.general;
}
function positionReading(c,s,i,topic) {
 const role=s.roles[i],m=meaning(c),base=m[topic];
 const intros={past:'Возможно, этот опыт до сих пор влияет на вас.',future:'Если всё останется как сейчас, история может продолжиться так.',partner:'Посмотрите, насколько это похоже на поступки другого человека.',self:'Здесь стоит присмотреться к своей роли в отношениях.',action:'Сверьте эту подсказку с реальными поступками.',outcome:'Такой поворот возможен при нынешнем подходе.'};
 if(role==='challenge') return challenge(c,topic);
 if(role==='advice')return adviceFor(c,topic);
 if(role==='resource')return `${firstSentence(base)} Попробуйте опереться на такой подход: ${adviceFor(c,topic)}`;
 if(role==='criterion')return `Сравните оба варианта с помощью этой подсказки. ${adviceFor(c,topic)}`;
 if(role==='phase')return base;
 if(role==='thoughts')return `${base} ${has(c,'past')?'Здесь может быть важна общая история: что из прошлого вы оба ещё помните?':has(c,'interest')?'Если интерес к общению есть, его всё равно стоит отличать от готовности к отношениям.':has(c,'clear')?'Какой прямой вопрос поможет вам прояснить общение и меньше додумывать за другого человека?':has(c,'distance','pause')?'По одной паузе трудно понять чужие намерения — поможет спокойный разговор.':'Какая часть этого описания подтверждается вашим общением?'}`;
 return `${intros[role]||''} ${base}`.trim();
}
export function priority(c) { return meaning(c).priority; }
// Pair rules are semantic, orientation-aware, and restricted to the roles they can support.
export function interactions(cards,s,topic) {
 const out=[]; const active=cards.map((c,i)=>({c,i})).filter(x=>!['advice','criterion','challenge'].includes(s.roles[x.i]));
 const push=(a,b,text)=>out.push({ids:[a.c.id,b.c.id],positions:[a.i,b.i],text:`${label(a.c)} («${s.positions[a.i]}») и ${label(b.c)} («${s.positions[b.i]}»): ${text}`});
 for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
  const a=active[i],b=active[j],ids=[a.c.id,b.c.id],bothUp=!a.c.reversed&&!b.c.reversed;
  if(bothUp&&ids.includes('lovers')&&ids.includes('devil'))push(a,b,'притяжение выражено сильно, и именно поэтому легко закрыть глаза на неудобные условия. Спросите себя: можете ли вы свободно сказать «нет» и остаться собой в этой связи?');
  else if(bothUp&&ids.includes('sun')&&ids.includes('moon'))push(a,b,'открытые проявления соседствуют с неясностью. Что-то уже радует, а в чём-то вы пока вынуждены гадать. Уточните недостающие детали, прежде чем делать большой вывод.');
  else if(bothUp&&ids.includes('queen-cups')&&ids.includes('king-pentacles'))push(a,b,'чуткость соединяется с практической ответственностью: выслушать, поддержать и сделать обещанное. Хороший ориентир — забота, которую видно в обычных делах.');
  else if(bothUp&&ids.includes('tower')&&ids.includes('star'))push(a,b,'резкая перемена соседствует с возможностью восстановления. Сначала разберитесь с тем, что требует внимания прямо сейчас; к большим планам можно вернуться, когда появится опора.');
  else if((has(a.c,'ending')&&has(b.c,'recovery'))||(has(b.c,'ending')&&has(a.c,'recovery')))push(a,b,'завершение старой истории связано с восстановлением. Отпустить прежнее бывает трудно, но это оставляет место для более подходящих условий и привычек.');
  else if(topic==='love'&&((has(a.c,'warmth','interest')&&has(b.c,'distance','block'))||(has(b.c,'warmth','interest')&&has(a.c,'distance','block'))))push(a,b,'тепло сталкивается с дистанцией. Человек может быть вам дорог, а общение всё равно оставаться редким или неудобным. Посмотрите, устраивает ли вас то участие, которое есть сейчас.');
  else if((has(a.c,'motion','initiative')&&has(b.c,'pause'))||(has(b.c,'motion','initiative')&&has(a.c,'pause')))push(a,b,'одна карта торопит, другая предлагает остановиться. Найдите причину задержки: иногда нужен разговор или подготовка, а иногда — просто время.');
  else if(has(a.c,'steady')&&has(b.c,'steady'))push(a,b,'обе карты поддерживают спокойную последовательность. Небольшое действие, которое вы сможете повторить, принесёт больше пользы, чем один красивый рывок.');
  else if((has(a.c,'unclear')&&has(b.c,'clear'))||(has(b.c,'unclear')&&has(a.c,'clear')))push(a,b,'желание всё прояснить встречается с нехваткой информации. Назовите один вопрос, ответ на который действительно изменит ваше решение, и начните с него.');
 }
 // Obstacle is never counted as an extra positive vote, even when it is the Sun or Two of Cups.
 const barrier=s.roles.indexOf('challenge');
 if(barrier>=0&&cards.length>1){const a=cards[0],b=cards[barrier];out.unshift({ids:[a.id,b.id],positions:[0,barrier],text:`${label(a)} описывает начало истории. ${label(b)} в позиции «${s.positions[barrier]}» показывает, где можно споткнуться. ${challenge(b,topic)}`});}
 return out.filter((v,i,a)=>a.findIndex(x=>x.text.split(': ').slice(1).join(': ')===v.text.split(': ').slice(1).join(': '))===i).slice(0,2);
}
function yesNo(cards,topic) {
 const [a,b,c]=cards,ma=meaning(a);let verdict;
 const severe=has(b,'block','ending')||meaning(b).direction==='no';
 const difficultAction=meaning(c).direction==='no'&&!has(c,'recovery');
 if(ma.direction==='yes'&&!severe&&!difficultAction)verdict='Скорее да';
 else if(ma.direction==='no'&&!has(c,'recovery'))verdict='Скорее нет';
 else verdict='Однозначного ответа нет';
 const tone=verdict==='Скорее да'?'В раскладе есть поддержка вашей идеи.':verdict==='Скорее нет'?'В нынешних условиях будет трудно получить желаемое. Стоит пересмотреть подход.':'Карты показывают разные стороны вопроса: спешить с окончательным решением пока не стоит.';
 return {verdict,answer:`${verdict}. ${tone} Что особенно важно учесть: ${challenge(b,topic)}`};
}
function connectionAnswer(cards,s) {
 const primary=cards[s.id==='relationship'?2:0],lastOutcome=cards[s.id==='together'?3:s.id==='thinking'?2:0];
 const p=meaning(primary);const barrier=cards[s.roles.indexOf('challenge')];
 const blocked=barrier&&(has(barrier,'block','ending')||meaning(barrier).direction==='no');
 let lead;
 if(s.id==='thinking')lead=has(primary,'past')?'Этот расклад связан прежде всего с воспоминаниями: общей историей и тем, что осталось недосказанным.':has(primary,'interest')?'Карта допускает интерес к общению, но нельзя приравнять его к романтическому намерению.':has(primary,'clear')?'Карта предлагает прояснить общение: чего вы ждёте друг от друга и о чём ещё не поговорили.':'Карты предлагают присмотреться к качеству общения. По этому раскладу нельзя уверенно судить, как часто человек думает о вас.';
 else if(s.id==='together')lead=has(lastOutcome,'control')&&has(lastOutcome,'interest')?'Связь может держаться на сильном влечении, даже когда её условия утомляют. Подумайте, что нужно изменить, чтобы обоим было свободнее.':has(lastOutcome,'ending','block','distance')?'Прежний подход скорее увеличивает дистанцию. Для сближения понадобятся изменения с обеих сторон.':has(lastOutcome,'steady','warmth','commitment')&&!blocked?'В раскладе есть основа для сближения. Она станет надёжнее, если оба готовы участвовать в отношениях.':'Общая перспектива ещё складывается. Желание быть вместе стоит подкрепить простыми договорённостями и поступками.';
 else lead=has(primary,'control')&&has(primary,'interest')?'В этой истории влечение заметно, но вместе с ним могут появляться зависимость или неравные условия.':has(primary,'ending','distance','block')?'Сейчас в раскладе больше дистанции, чем готовности сближаться. Прежде чем делать шаг навстречу, разберитесь, что именно вас разделяет.':has(primary,'unclear')?'Чувства и намерения остаются неоднозначными. Похоже, ясности в этой истории хочется больше, чем есть сейчас.':has(primary,'warmth')?'В раскладе есть эмоциональное тепло. Присмотритесь, как оно проявляется: в разговорах, заботе, желании находить время друг для друга.':has(primary,'interest')?'Карта говорит об интересе, который ещё не стал устойчивой близостью. Дайте себе время увидеть, как это проявляется в общении.':'В этой истории особенно важны условия общения: насколько вам удобно, спокойно и понятно рядом друг с другом.';
 if(blocked&&!lead.includes('дистанц'))lead+=' При этом препятствие в раскладе заслуживает отдельного внимания — одного интереса может оказаться мало.';
 return `${lead} ${label(primary)}: ${firstSentence(p.love)}`;
}
export function readSpread(cards,s,requestedTopic='general') {
 if(cards.length!==s.positions.length||!cards.every(c=>c.meanings))throw new Error('Incomplete reading');
 const topic=topicFor(s,requestedTopic),notes=cards.map((c,i)=>({id:c.id,name:label(c),position:s.positions[i],text:positionReading(c,s,i,topic)}));
 const pairs=interactions(cards,s,topic);const barrier=s.roles.indexOf('challenge');const adviceIndex=s.roles.lastIndexOf('advice');
 let answer,verdict=null,details=[],attention=barrier>=0?challenge(cards[barrier],topic):challenge(cards[0],topic);
 let advice=adviceFor(cards[adviceIndex>=0?adviceIndex:cards.length-1],topic);
 // A real obstacle takes precedence over the shadow side of the advice card.
 if(barrier<0&&cards.length>1&&adviceIndex>=0)attention=challenge(cards[adviceIndex],topic);
 if(cards.length===1){const m=meaning(cards[0]);return {answer:s.id==='advice'?advice:m.general,details:[],notes:[],attention:challenge(cards[0],topic),advice,day:s.id==='day'?{love:m.love,work:m.work,mood:m.mood}:null,topic,verdict,pairs:[]};}
 if(s.id==='yes-no'){
  ({answer,verdict}=yesNo(cards,topic));
  const [a,b,c]=cards;
  const lead=meaning(a).direction==='yes'?(verdict==='Скорее да'?'Хорошее начало стоит поддержать конкретным действием.':'Хорошее начало ещё не снимает трудностей, которые показали остальные карты.'):meaning(a).direction==='no'?'Просто стараться сильнее может быть недостаточно: сначала проверьте сами условия.':'Ситуация ещё может повернуться по-разному. Важнее всего понять, что вы можете прояснить сейчас.';
  details=[`${label(a)}: ${meaning(a)[topic]} ${lead}`,`${label(c)} подсказывает следующий шаг. ${adviceFor(c,topic)}`];
 }else if(isLove(s)){
  answer=connectionAnswer(cards,s);
  details=pairs.map(x=>x.text);
  if(s.id==='thinking')details.push(`Как это проявляется в общении? В этой позиции — ${label(cards[2])}. ${meaning(cards[2]).love}`);
  if(s.id==='together')details.push(`Что поможет стать ближе (${label(cards[2])}): ${adviceFor(cards[2],'love')} Возможное продолжение (${label(cards[3])}): ${meaning(cards[3]).love}`);
  if(s.id==='relationship')details.push(`С вашей стороны (${label(cards[0])}): ${firstSentence(meaning(cards[0]).love)} Со стороны партнёра (${label(cards[1])}): ${firstSentence(meaning(cards[1]).love)} Найдите, где ваши ожидания совпадают, а где о них стоит поговорить.`);
 }else if(['week','month'].includes(s.id)){
  const n=cards.length-1,anchor=cards.at(-1);
  answer=`Тему ${s.id==='week'?'недели':'месяца'} задаёт ${label(anchor)}. ${firstSentence(meaning(anchor)[topic])} Начало периода: ${firstSentence(meaning(cards[0])[topic])} Ближе к завершению: ${firstSentence(meaning(cards[n-1])[topic])}`;
  details=pairs.filter(p=>p.positions.every(i=>i<n)).slice(0,2).map(x=>x.text);
  if(!details.length)details=[`Начало и завершение периода стоит связать одним посильным действием. ${adviceFor(cards[0],topic)} Ближе к концу снова оцените свои планы: ${adviceFor(cards[n-1],topic)}`];
  attention=challenge(cards.slice(0,n).find(c=>has(c,'block','overload','unclear'))||cards[n-1],topic);
 }else if(s.id==='choice'){
  const [a,ac,b,bc,criterion]=cards;
  answer=[['А',a],['Б',b]].map(([name,c])=>`Вариант ${name}: ${firstSentence(meaning(c)[topic])}`).join(' ')+` Решая, какой путь вам подходит, учитывайте и его цену — она показана отдельной картой.`;
  details=[`Путь А — ${label(a)} и ${label(ac)}. Возможность: ${meaning(a)[topic]} Что может помешать: ${challenge(ac,topic)}`,`Путь Б — ${label(b)} и ${label(bc)}. Возможность: ${meaning(b)[topic]} Что может помешать: ${challenge(bc,topic)}`];
  attention=`У пути А есть такое ограничение: ${firstSentence(challenge(ac,topic))} У пути Б — своё: ${firstSentence(challenge(bc,topic))}`;advice=adviceFor(criterion,topic);
 }else if(s.id==='past-present-future'){
  answer=`Из прошлого: ${firstSentence(meaning(cards[0])[topic])} Сейчас: ${firstSentence(meaning(cards[1])[topic])} Возможное продолжение при нынешнем подходе: ${firstSentence(meaning(cards[2])[topic])}`;
  details=pairs.map(x=>x.text);attention=challenge(cards[1],topic);advice=adviceFor(cards[1],topic);
 }else if(s.id==='reasons'){
  answer=`Внутри самой ситуации может мешать вот что: ${firstSentence(challenge(cards[1],topic))} Есть и внешняя сторона: ${firstSentence(challenge(cards[2],topic))} Начать распутывать этот узел поможет ${label(cards[3])}. ${firstSentence(adviceFor(cards[3],topic))}`;
  details=[`Как выглядит проблема (${label(cards[0])}): ${meaning(cards[0])[topic]}`,`На что опереться (${label(cards[3])}): ${adviceFor(cards[3],topic)} Первый шаг (${label(cards[4])}): ${advice}`];
  attention=challenge(cards[2],topic);
 }else if(s.id==='hidden'){
  answer=`Возможно, из поля зрения выпало вот что: ${challenge(cards[1],topic)} Эта подсказка не доказывает, что кто-то что-то скрывает. Вспомните, какой факт поможет её проверить.`;
  details=[`Что видно сейчас (${label(cards[0])}): ${meaning(cards[0])[topic]}`,`Как разобраться (${label(cards[2])}): ${advice}`];
 }
 if(!details.length)details=pairs.map(x=>x.text);
 if(!details.length)details=notes.map(n=>`${n.position} — ${n.name}. ${n.text}`);
 return {answer,details,notes,attention,advice,day:null,topic,verdict,pairs};
}
export function synthesize(cards,spread,topic='general'){return readSpread(cards,spread,topic).answer;}
