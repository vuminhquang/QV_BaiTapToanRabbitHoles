import { balancedPageTargets, applyPageLayout, fitPage } from '../layout/page-layout.js';

const pageTitle = {
  '-': 'Phép trừ có nhớ', '+': 'Phép cộng', '×': 'Phép nhân', '÷': 'Phép chia'
};
const headings = {
  one: 'A. Dạng cơ bản (có nhớ)',
  consecutive: 'B. Dạng mượn liên tiếp',
  zero: 'C. Dạng mượn qua số 0',
  multi: 'D. Thử thách nhiều hàng',
  normal: 'A. Luyện tập phép tính'
};
const sectionsOrder = { one:'star', consecutive:'rocket', zero:'leaf', multi:'cloud', normal:'star' };
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const src = (assets, path) => assets + path;

function gridDigits(value, places, problem, showHints) {
  const padded=String(value).padStart(places, ' ');
  const touched=new Set(problem?.borrow?.touchedColumns ?? []);
  const notes=problem?.borrow?.workingDigits ?? [];
  return [...padded].map((digit, index) => {
    const place=places-1-index;
    const borrowed=showHints && touched.has(place) && digit!==' ';
    const content=digit===' ' ? '&nbsp;' : borrowed
      ? `<span class="borrow-digit has-note">${digit}<small>${notes[place] ?? ''}</small></span>`
      : digit;
    return `<span class="arith-cell">${content}</span>`;
  }).join('');
}

function exerciseMarkup(p, showHints) {
  const canHint=showHints && p.op==='-' && p.borrow?.hasBorrowing;
  const bottom=p.op==='-'?'−':p.op;
  const places=Math.max(String(p.a).length,String(p.b).length);
  const vertical=p.op==='÷'
    ? `<div class="division-operator"><span class="dividend">${p.a}</span><span class="divisor">${p.b}</span><span class="working"></span><span></span></div>`
    : `<div class="arithmetic" style="--places:${places}">
        <div class="arith-row arith-top"><span class="arith-operator"></span>${gridDigits(p.a,places,p,canHint)}</div>
        <div class="arith-row arith-bottom"><span class="arith-operator">${bottom}</span>${gridDigits(p.b,places,null,false)}</div>
        <div class="arith-rule"></div>
        <div class="arith-row arith-answer" aria-label="Ô viết kết quả"><span class="arith-operator"></span>${Array.from({length:places},()=>'<span class="arith-cell answer-cell">&nbsp;</span>').join('')}</div>
      </div>`;
  return `<div class="problem ${canHint?'has-hint':''}" aria-label="Câu ${p.number}: ${p.a} ${bottom} ${p.b}"><span class="problem-id">${p.number})</span>${vertical}</div>`;
}

function themeHeading(settings) {
  const names = {'-':'Phép trừ','+':'Phép cộng','×':'Phép nhân','÷':'Phép chia'};
  if (settings.operation === '-' && ['2','3','4'].includes(settings.digits)) {
    const limit = {'2':'100','3':'1 000','4':'10 000'}[settings.digits];
    return `Phép trừ trong phạm vi ${limit}`;
  }
  return 'Luyện tập ' + (names[settings.operation] || 'phép tính').toLowerCase();
}

function headerMarkup(settings, assets) {
  const showIdentity=settings.showIdentity;
  return `<div class="p-meta">${showIdentity?`<div class="meta-left"><span>Họ tên: .....................................</span><span>Lớp: ...............................</span></div><span>Ngày: ....../....../............</span>`:'<span></span>'}</div>
    <div class="p-header">
      <img class="mascot" src="${src(assets,'illustrations/mascot-cat.png')}" alt="" draggable="false">
      <div class="heading">${settings.showTitle?'<h2 class="heading-title">'+esc(settings.theme==='classic'?'BÀI TẬP TOÁN':themeHeading(settings))+'</h2>':''}<div class="heading-subtitle">${esc(pageTitle[settings.operation])}</div></div>
      <div class="speech-bubble">Hãy đặt tính<br>rồi thực hiện<br>phép tính nhé!</div>
      <img class="pencil" src="${src(assets,'decorations/pencil.svg')}" alt="">
    </div>`;
}

function themeGuideMarkup(settings) {
  const message = settings.operation === '-'
    ? 'Trừ từ hàng đơn vị; khi không đủ, mượn 1 ở hàng bên trái.'
    : 'Đặt các chữ số thẳng cột, tính từ phải sang trái.';
  return `<aside class="memory-tip theme-tip"><div class="tip-content"><h3>Mẹo nhớ:</h3><p class="theme-tip-text">${esc(message)}</p></div></aside>`;
}

function guideMarkup(settings, assets) {
  if (!settings.showGuide) return '';
  return themeGuideMarkup(settings);
  const subtraction=settings.operation==='-';
  const lines = subtraction
    ? ['Đặt tính: Viết các số thẳng cột theo hàng.', 'Bắt đầu trừ từ hàng đơn vị.', 'Nếu số bị trừ nhỏ hơn số trừ thì mượn 1 ở hàng liền trước.', 'Thực hiện phép trừ và viết kết quả.']
    : ['Đặt các chữ số thẳng cột theo hàng.','Tính lần lượt và kiểm tra kết quả.','Viết đáp số ngay dưới vạch ngang.'];
  return `<div class="memory-tip"><img class="bulb" src="${src(assets,'icons/lightbulb.svg')}" alt=""><div class="tip-content"><h3>Nhắc lại cách ${subtraction?'trừ có nhớ':'đặt tính'}:</h3><ol>${lines.map(x=>`<li>${x}</li>`).join('')}</ol></div><img class="small-star" src="${src(assets,'decorations/star.svg')}" alt=""><img class="kid" src="${src(assets,'illustrations/kid-pencil.png')}" alt=""></div>`;
}

function makeSection(group, settings, assets) {
  const count=group.items.length;
  const rows=Math.ceil(count/settings.columns);
  let image=sectionsOrder[group.type]||'star';
  const decoration={star:'decorations/star.svg',rocket:'decorations/rocket.png',cloud:'decorations/cloud.svg',leaf:'decorations/leaf.png'}[image];
  const extra=group.type==='consecutive'?`<img class="section-decor cloud" src="${src(assets,'decorations/cloud.svg')}" alt="">`:'';
  return `<section class="sheet-section" data-rows="${rows}" aria-label="${esc(headings[group.type]||'Bài tập')}">
    <div class="section-pill">${esc(headings[group.type]||'Luyện tập')}</div>
    <img class="section-decor ${image}" src="${src(assets,decoration)}" alt="">${extra}
    <div class="problem-grid" style="--columns:${settings.columns}">${group.items.map(p=>exerciseMarkup(p,settings.showHints)).join('')}</div>
  </section>`;
}

function splitGroups(groups, capacity) {
  const total=groups.reduce((sum,g)=>sum+g.items.length,0);
  const targets=balancedPageTargets(total,capacity);
  const pages=[];
  const waiting=groups.map(g=>({...g,items:[...g.items]}));
  let currentGroup=0;
  for(const target of targets) {
    const page=[]; let remaining=target;
    while(remaining>0 && currentGroup<waiting.length) {
      const group=waiting[currentGroup];
      const taken=group.items.splice(0,remaining);
      if(taken.length) page.push({...group,items:taken});
      remaining-=taken.length;
      if(!group.items.length)currentGroup++;
    }
    pages.push(page);
  }
  return pages;
}

export function renderWorksheet({ groups, settings, root, assets }) {
  const capacity=settings.columns*(settings.size==='large'?3:4);
  const pages=splitGroups(groups,capacity);
  root.replaceChildren();
  pages.forEach((pageGroups,index) => {
    const page=document.createElement('article');
    page.className=`sheet theme-${settings.theme} problem-${settings.size} cols-${settings.columns}`;
    page.setAttribute('aria-label',`Phiếu bài tập trang ${index+1}`);
    page.innerHTML=`${headerMarkup(settings,assets)}<div class="sheet-content">${pageGroups.map(g=>makeSection(g,settings,assets)).join('')}</div>${guideMarkup(settings,assets)}<div class="sheet-footer">Phiếu ${index+1}/${pages.length}</div>`;
    root.append(page);
    applyPageLayout(page,pageGroups,settings.columns,settings.size);
  });
  // Font metrics can change after initial paint. Re-fit when fonts become ready.
  root.querySelectorAll('.sheet.smart-page').forEach(fitPage);
  document.fonts?.ready?.then(()=>root.querySelectorAll('.sheet.smart-page').forEach(fitPage));
  if(settings.showAnswer){
    const answers=document.createElement('article');
    answers.className='sheet answer-sheet';
    answers.setAttribute('aria-label','Trang đáp án');
    answers.innerHTML=`<h2>ĐÁP ÁN BÀI TẬP</h2><p class="answer-hint">Phần dành cho giáo viên hoặc phụ huynh đối chiếu</p>`
      +groups.map(group=>`<section class="answers-group"><h3>${esc(headings[group.type]||'Luyện tập')}</h3><div class="answer-grid">${group.items.map(p=>`<div class="answer-cell"><strong>${p.number}.</strong> ${p.a} ${p.op} ${p.b} = <b>${p.result}</b></div>`).join('')}</div></section>`).join('');
    root.append(answers);
  }
  return { problemPages:pages.length, totalPages:pages.length+(settings.showAnswer?1:0) };
}
