/**
 * Printable A4 theme coordinates (relative fractions of the finished sheet).
 * Every illustrated theme has its own independently measured writable regions.
 * IMPORTANT: section coordinates are page-based, not relative to the art border.
 * Keeping them in one map makes artwork changes auditable and testable.
 */
export const THEME_REGIONS = Object.freeze({
  classic: {
    header: {x:.18,y:.055,w:.64,h:.09},
    meta: {x:.225,y:.19,w:.55,h:.055},
    content: {x:.225,y:.273,w:.55,h:.515},
    memo: {x:.21,y:.845,w:.58,h:.075},
    footer: {x:.43,y:.968,w:.14,h:.015},
    sections: {one:{x:.235,w:.53},consecutive:{x:.235,w:.53},zero:{x:.245,w:.51},normal:{x:.235,w:.53},multi:{x:.245,w:.51}}
  },
  cute: {
    header: {x:.185,y:.06,w:.63,h:.10},
    meta: {x:.225,y:.192,w:.55,h:.055},
    content: {x:.23,y:.278,w:.54,h:.50},
    memo: {x:.235,y:.836,w:.53,h:.082},
    footer: {x:.43,y:.971,w:.14,h:.013},
    sections: {one:{x:.245,w:.51},consecutive:{x:.245,w:.51},zero:{x:.245,w:.51},normal:{x:.245,w:.51},multi:{x:.255,w:.49}}
  },
  space: {
    header: {x:.19,y:.047,w:.62,h:.10},
    meta: {x:.22,y:.19,w:.56,h:.055},
    content: {x:.235,y:.28,w:.53,h:.48},
    memo: {x:.265,y:.855,w:.47,h:.078},
    footer: null, // The illustrated lunar note owns the entire bottom band.
    sections: {
      one:{x:.245,w:.51},
      consecutive:{x:.25,w:.50},
      zero:{x:.315,w:.415}, // Keep outside the astronaut visor & rocket flame.
      normal:{x:.25,w:.50},
      multi:{x:.315,w:.415}
    }
  },
  garden: {
    header: {x:.215,y:.064,w:.57,h:.10},
    meta: {x:.25,y:.203,w:.50,h:.055},
    content: {x:.255,y:.288,w:.49,h:.47},
    memo: {x:.25,y:.83,w:.50,h:.085},
    footer: {x:.43,y:.973,w:.14,h:.012},
    sections: {one:{x:.27,w:.46},consecutive:{x:.27,w:.46},zero:{x:.28,w:.44},normal:{x:.27,w:.46},multi:{x:.28,w:.44}}
  }
});

const pct = number => `${Number((number*100).toFixed(3))}%`;
const isValidBox = r => r && [r.x,r.y,r.w,r.h].every(Number.isFinite)
 && r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0
 && r.x + r.w <= 1.001 && r.y + r.h <= 1.001;

/** Assign independently configured title, identity, exercise, memo and footer regions. */
export function applyThemeRegions(page, theme, groups) {
  const map=THEME_REGIONS[theme];
  if(!map) throw new Error('Unknown A4 theme '+theme);
  for(const key of ['header','meta','content','memo']) {
    const box=map[key];
    if(!isValidBox(box)) throw new Error('Invalid theme region '+theme+'.'+key);
    for(const [axis,val] of Object.entries(box)) page.style.setProperty(`--theme-${key}-${axis}`,pct(val));
  }
  page.classList.toggle('theme-footer-hidden',!map.footer);
  if(map.footer) {
    if(!isValidBox(map.footer)) throw new Error('Invalid footer');
    for(const [axis,val] of Object.entries(map.footer)) page.style.setProperty(`--theme-footer-${axis}`,pct(val));
  }
  const nodes=[...page.querySelectorAll('.sheet-content > .sheet-section')];
  if(nodes.length!==groups.length) throw new Error('Mismatched worksheet sections');
  nodes.forEach((section,index) => {
    const name=groups[index].type;
    const limits=map.sections[name] || map.sections.normal || {x:map.content.x,w:map.content.w};
    const start=(limits.x-map.content.x)/map.content.w;
    const end=(map.content.x+map.content.w-limits.x-limits.w)/map.content.w;
    if(start<-.001 || end<-.001 || start+end>.9) throw new Error('Invalid section bounds '+theme+'.'+name);
    section.style.setProperty('--section-inset-left',pct(Math.max(0,start)));
    section.style.setProperty('--section-inset-right',pct(Math.max(0,end)));
    section.dataset.layoutRegion=name;
  });
}
