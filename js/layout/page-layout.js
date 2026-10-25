// Pure A4 pagination and density planning; content remains editable DOM, not a screenshot.
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

/** Balance the tail of a worksheet so the last sheet is not mostly empty. */
export function balancedPageTargets(total, capacity) {
  if (!Number.isInteger(total) || total < 0 || !Number.isInteger(capacity) || capacity < 1)
    throw new RangeError('Invalid worksheet page capacity');
  if (total === 0) return [];
  const pages = Math.ceil(total / capacity);
  const base = Math.floor(total / pages), remainder = total % pages;
  return Array.from({length:pages}, (_,i) => base + (i < remainder ? 1 : 0));
}

/** Plan a page with preference for more writing space, never extra decorative filler. */
export function pagePlan(groups, columns, size) {
  const counts = groups.map(g => g.items.length);
  const exercises = counts.reduce((a,b) => a+b, 0);
  const rows = counts.map(count => Math.ceil(count / columns));
  const density = exercises / Math.max(1, columns * 4);
  const columnLimit = columns >= 5 ? 1.02 : columns === 4 ? 1.13 : 1.22;
  const scale = clamp(1.21 - .22*density, 1, columnLimit);
  const weights = rows.map(row => Math.max(.9, row + .26));
  return { exercises, rows, weights, scale: size === 'large' ? Math.min(1.06, scale) : scale };
}

/** Apply CSS custom properties to measured live worksheets, not hand-authored fixed boxes. */
export function applyPageLayout(page, groups, columns, size) {
  const plan=pagePlan(groups,columns,size);
  page.classList.add('smart-page');
  page.style.setProperty('--smart-font-scale',plan.scale.toFixed(3));
  page.querySelectorAll('.sheet-content .sheet-section').forEach((section,i) => {
    section.style.setProperty('--section-weight',plan.weights[i]);
    section.style.setProperty('--group-rows',plan.rows[i]);
  });
  return plan;
}

/** Final fit guard: re-evaluate after web fonts load or browser page size changes. */
export function fitPage(page) {
  if(!page.classList.contains('smart-page')) return;
  const original=Number.parseFloat(page.style.getPropertyValue('--smart-font-scale')) || 1;
  for(const factor of [original,Math.min(original,1.07),1]) {
    page.style.setProperty('--smart-font-scale',factor.toFixed(3));
    if(page.scrollHeight <= page.clientHeight + 3) return factor;
  }
  page.classList.add('smart-compact');
  return 1;
}
