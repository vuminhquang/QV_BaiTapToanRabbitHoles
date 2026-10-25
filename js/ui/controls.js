import { generateWorksheet } from '../core/generator.js';
import { renderWorksheet } from './preview.js';
const $ = id => document.getElementById(id);
const radio = name => document.querySelector(`input[name="${name}"]:checked`)?.value;
const checked = id => $(id).checked;
const summary = $('status');
let lastGroups=[];

function settings() {
  return {
    operation:radio('operation'), digits:radio('digits'),
    count:Math.max(8,Math.min(40,Number.parseInt($('count').value,10)||16)),
    mode:$('borrowMode').value, columns:Number(radio('columns')),
    size:radio('size'), theme:radio('theme'),
    showTitle:checked('showTitle'), showIdentity:checked('showIdentity'),
    showGuide:checked('showGuide'), showAnswer:checked('showAnswer'),
    showHints:checked('showHints'), onlyBorrow:checked('onlyBorrow')
  };
}
function requiredColumns() {
  return [checked('borrowUnit')&&0,checked('borrowTen')&&1,checked('borrowHundred')&&2]
    .filter(x=>Number.isInteger(x));
}
function regenerate() {
  try {
    const s=settings();
    const required = s.operation==='-'&&s.onlyBorrow?requiredColumns():[];
    if(s.operation==='-' && s.onlyBorrow && required.length>1 && s.mode==='one'){
      throw new Error('“Mượn một hàng” không thể đồng thời bắt buộc mượn nhiều hàng. Hãy đổi dạng bài.');
    }
    const groupMode= (s.operation==='-' && !s.onlyBorrow) ? 'normal' : s.mode;
    const groups=generateWorksheet({operation:s.operation,digits:s.digits,count:s.count,mode:groupMode,
      requiredColumns: required});
    lastGroups=groups;
    const assets=document.body.dataset.assetsBase;
    const pages=renderWorksheet({groups,settings:s,root:$('pages'),assets});
    summary.classList.remove('error');
    summary.textContent=`Đã tạo ${s.count} bài · ${pages.totalPages} trang A4 (gồm ${s.showAnswer?'1 trang đáp án':'không đáp án'}).`;
  }catch(error){summary.classList.add('error');summary.textContent=error.message;}
}

function syncSettings() {
  const op=radio('operation'), digits=radio('digits');
  const isSubtract=op==='-';
  $('borrowControls').hidden=!isSubtract;
  $('borrowRules').hidden=!isSubtract;
  $('modeRow').hidden=!isSubtract;
  const hasHundreds=digits==='4'||digits==='mixed';
  $('borrowHundred').disabled=!hasHundreds;
  if(!hasHundreds)$('borrowHundred').checked=false;
  const twoDigits=digits==='2';
  const typeSelect=$('borrowMode');
  for(const option of typeSelect.options) option.disabled=twoDigits && ['zero','consecutive'].includes(option.value);
  if(twoDigits && ['zero','consecutive'].includes(typeSelect.value))typeSelect.value='one';
  if(twoDigits && checked('borrowTen')) $('borrowTen').checked=false;
  $('borrowTen').disabled=twoDigits;
  if(!checked('variety') && typeSelect.value==='mixed')typeSelect.value='one';
  if(op!== '-' && checked('showGuide')){
    // Guide adapts copy to the selected operation; preserve user's checkbox.
  }
}
function synchronizeCount(source) {
  const input=$('count'), slider=$('countSlider');
  const value=Math.max(8,Math.min(40,Number.parseInt(source.value,10)||16));
  input.value=value;slider.value=value;
}
export function bindControls() {
  $('worksheet-form').addEventListener('submit',event=>{event.preventDefault();regenerate();});
  $('countSlider').addEventListener('input',event=>{synchronizeCount(event.target);regenerate();});
  $('count').addEventListener('change',event=>{synchronizeCount(event.target);regenerate();});
  const allInputs=$('worksheet-form').querySelectorAll('input:not(#count):not(#countSlider),select');
  allInputs.forEach(input=>input.addEventListener('change',()=>{syncSettings();regenerate();}));
  $('printPage').addEventListener('click',()=>window.print());
  $('printPdf').addEventListener('click',()=>window.print());
  syncSettings();regenerate();
}
