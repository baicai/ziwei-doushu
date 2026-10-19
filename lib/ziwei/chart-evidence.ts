import type { Palace, Star, ZiweiChart } from './types';

/**
 * Deterministic, chart-specific evidence references.
 * The identifiers are stable for a given chart and rule version but should
 * not be treated as a global lookup ID or a scientific validation.
 */
export interface ChartEvidence {
  id: string;
  scope: 'natal';
  palaceBranch: number;
  palaceName: string;
  starName?: string;
  fact: string;
  borrowed: boolean;
}

function starDescription(star: Star): string {
  const details = [star.name];
  if (star.brightnessRaw) details.push('亮度' + star.brightnessRaw);
  if (star.siHua) details.push('生年化' + star.siHua);
  return details.join(' · ');
}
function starsText(palace: Palace): string {
  const main = palace.stars.filter(s => s.type === 'major');
  return main.length ? main.map(starDescription).join('、') : '本宫没有直接主星';
}

export function chartEvidence(chart: ZiweiChart): ChartEvidence[] {
  return [...chart.palaces].sort((a,b)=>a.branch-b.branch).flatMap(palace => {
    const opposite = chart.palaces.find(p => p.branch === (palace.branch + 6) % 12);
    const borrowed = !palace.stars.some(s=>s.type==='major');
    const summary = borrowed
      ? starsText(palace) + '；传统空宫参考对宫' +
        (opposite ? '「'+opposite.name+'」的主星：'+starsText(opposite) : '，对宫资料缺失')
      : starsText(palace);
    const id='P'+palace.branch;
    const items: ChartEvidence[] = [{
      id, scope:'natal', palaceBranch:palace.branch,
      palaceName:palace.name, borrowed,
      fact:palace.name+'：'+summary,
    }];
    palace.stars.forEach((star,index)=>{
      // A detailed ID is assigned only to the stars most likely to be cited.
      if (star.type!=='major' && !star.siHua) return;
      items.push({
        id:id+':S'+index, scope:'natal', palaceBranch:palace.branch,
        palaceName:palace.name, starName:star.name, borrowed:false,
        fact:palace.name+'实际落星：'+starDescription(star),
      });
    });
    return items;
  });
}

export function evidenceAudit(text: string, catalog: ChartEvidence[]) {
  const byId = new Map(catalog.map(item=>[item.id,item]));
  const cited = new Set<string>();
  const invalid = new Set<string>();
  const markers = Array.from(text.matchAll(/\[依据:([^\]]{1,120})\]/g));
  for(const match of markers) {
    for(const ref of match[1].split(/[,，、;；\s]+/).filter(Boolean)) {
      if (byId.has(ref)) cited.add(ref);
      else invalid.add(ref);
    }
  }
  const verified = [...cited].map(id=>byId.get(id)!);
  return {
    cited:verified,
    invalidIds:[...invalid],
    citationCount:markers.length,
    hasCitations:markers.length>0,
    // Existence of a valid ID confirms a referenced chart fact is present,
    // NOT that the generated interpretation is correct.
    scope:'reference-existence-only' as const,
  };
}
