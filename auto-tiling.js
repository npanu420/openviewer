// OpenViewer automatic 16:9 tiling, adapted from src/ui/components/autoTiling.ts (MIT).
(() => {
/**
 * Automatic multiview tiling. Every tile has exactly the video aspect (no black bars) and the
 * arrangement covers as much of the area as possible.
 *
 * Two families are tried: a main tile with a block of tiles to its right (as tall as the main one,
 * possibly several columns wide for ultrawide areas) and a row of tiles below, or a plain
 * rows x columns grid. Sizes are linear in the main tile width, so each candidate has a closed
 * form. Best coverage wins, unless an arrangement with a clearly bigger main tile covers almost as
 * much; remaining ties go to the preferred tile count.
 */

                            
            
            
                
                 
 

                               
                                                                                                           
                 
                                                                                             
                      
                   
 

                                
                
                 
                   
                   
                  
                                                                                   
                          
                                                                     
                        
                                                                                                      
                 
                                                                                           
                    
     
                                                                                                  
                                                                                      
     
                             
                         
 

const MAX_COLUMN = 4;
const MAX_ROW = 5;
const MAX_SIDE_COLUMNS = 3;
// Allow longer single columns in the narrow, responsive preview.
const MAX_GRID = 8;
const COVERAGE_TIE = 0.03;
/** A dominant main tile may cost this much coverage and still win. */
const MAIN_FOCUS_TOLERANCE = 0.06;
/** With a minimum count, a smaller count within this coverage of the best one is kept. */
const MIN_COUNT_TOLERANCE = 0.05;
/** With a minimum count, at most this many extra tiles are added. */
const MIN_COUNT_EXTRA = 3;
/** The main tile is dominant at this many times the area of any other tile. */
const MAIN_FOCUS_AREA_RATIO = 1.8;

function hasDominantMain(r              )          {
  if (r.frames.length < 2) return false;
  const [main, ...rest] = r.frames;
  const largest = Math.max(...rest.map((f) => f.width * f.height));
  return main.width * main.height >= MAIN_FOCUS_AREA_RATIO * largest;
}

/** Tile 0 holds the main feed, so no other tile may be larger. */
function mainIsLargest(r              )          {
  const [main, ...rest] = r.frames;
  const mainArea = main.width * main.height;
  return rest.every((f) => f.width * f.height <= mainArea * 1.001);
}

function finish(family        , frames             , usedW        , usedH        , W        , H        )               {
  const dx = Math.max(0, (W - usedW) / 2);
  const dy = Math.max(0, (H - usedH) / 2);
  let area = 0;
  for (const f of frames) area += f.width * f.height;
  return {
    family,
    frames: frames.map((f) => ({ x: f.x + dx, y: f.y + dy, width: f.width, height: f.height })),
    coverage: Math.min(1, area / (W * H)),
  };
}

function mainColumnRow(W        , H        , s        , a        , k        , c        , m        )                      {
  const layout = (x        ) => {
    const mainH = x / a;
    const frames              = [{ x: 0, y: 0, width: x, height: mainH }];
    let totalW = x;
    if (k > 0) {
      const sideH = (mainH - (k - 1) * s) / k;
      const sideW = sideH * a;
      for (let col = 0; col < c; col++) {
        for (let i = 0; i < k; i++) frames.push({ x: x + s + col * (sideW + s), y: i * (sideH + s), width: sideW, height: sideH });
      }
      totalW = x + c * (s + sideW);
    }
    let totalH = mainH;
    if (m > 0) {
      const tileW = (totalW - (m - 1) * s) / m;
      const tileH = tileW / a;
      for (let i = 0; i < m; i++) frames.push({ x: i * (tileW + s), y: mainH + s, width: tileW, height: tileH });
      totalH = mainH + s + tileH;
    }
    return { w: totalW, h: totalH, frames };
  };
  // Total width and height are linear in the main width, so solve for it directly.
  const at0 = layout(0);
  const at1 = layout(1);
  const aw = at1.w - at0.w;
  const ah = at1.h - at0.h;
  if (aw <= 0 || ah <= 0) return null;
  const x = Math.min((W - at0.w) / aw, (H - at0.h) / ah);
  if (x <= 0) return null;
  const r = layout(x);
  if (!r.frames.every((f) => f.width > 0 && f.height > 0)) return null;
  return finish(c > 1 ? `m${k}x${c}-${m}` : `m${k}-${m}`, r.frames, r.w, r.h, W, H);
}

function uniformGrid(W        , H        , s        , a        , rows        , cols        )                      {
  const tileW = Math.min((W - (cols - 1) * s) / cols, ((H - (rows - 1) * s) / rows) * a);
  if (tileW <= 0) return null;
  const tileH = tileW / a;
  const frames              = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) frames.push({ x: c * (tileW + s), y: r * (tileH + s), width: tileW, height: tileH });
  }
  return finish(`g${rows}x${cols}`, frames, cols * tileW + (cols - 1) * s, rows * tileH + (rows - 1) * s, W, H);
}

function solveTiling(options               )                      {
  const best = pickTiling(options);
  const { keepFamily, keepTolerance = 0 } = options;
  if (!best || !keepFamily || best.family === keepFamily || keepTolerance <= 0) return best;
  const kept = pickTiling({ ...options, keepFamily: null, only: keepFamily });
  return kept && kept.frames.length === best.frames.length && kept.coverage >= best.coverage - keepTolerance ? kept : best;
}

function pickTiling(options                                   )                      {
  const { width: W, height: H, maxTiles, spacing = 8, aspect = 16 / 9, preferredCount = 3, minTileWidth = 220, count, minCount, only } = options;
  if (!(W > 0) || !(H > 0) || !(maxTiles > 0) || !(aspect > 0)) return null;
  const limit = count != null ? Math.max(1, count) : maxTiles;
  const wideEnough = (r              ) =>
    count != null || r.frames.length === 1 || r.frames.every((f) => f.width >= minTileWidth);

  const candidates                 = [];
  for (let k = 0; k <= MAX_COLUMN; k++) {
    // A single side row with several columns is just a grid row.
    for (let c = 1; c <= (k >= 2 ? MAX_SIDE_COLUMNS : 1); c++) {
      for (let m = 0; m <= MAX_ROW; m++) {
        if (1 + k * c + m > limit) continue;
        const r = mainColumnRow(W, H, spacing, aspect, k, c, m);
        if (r && mainIsLargest(r) && wideEnough(r)) candidates.push(r);
      }
    }
  }
  for (let rows = 1; rows <= MAX_GRID; rows++) {
    for (let cols = 1; cols <= MAX_GRID; cols++) {
      const n = rows * cols;
      if (n < 2 || n > limit) continue;
      const r = uniformGrid(W, H, spacing, aspect, rows, cols);
      if (r && wideEnough(r)) candidates.push(r);
    }
  }
  if (only != null) return candidates.find((c) => c.family === only) ?? null;
  if (candidates.length === 0) return null;

  let pool = candidates;
  let target = preferredCount;
  if (count == null && minCount != null) {
    const atLeast = candidates.filter((c) => c.frames.length >= minCount);
    const close = atLeast.filter((c) => c.frames.length <= minCount + MIN_COUNT_EXTRA);
    const enough = close.length > 0 ? close : atLeast;
    if (enough.length > 0) {
      // The fewest tiles that fill the area about as well as any larger count win.
      const top = Math.max(...enough.map((c) => c.coverage));
      return enough
        .filter((c) => c.coverage >= top - MIN_COUNT_TOLERANCE)
        .reduce((a, b) => {
          if (a.frames.length !== b.frames.length) return a.frames.length < b.frames.length ? a : b;
          const fa = hasDominantMain(a);
          if (fa !== hasDominantMain(b) && Math.abs(a.coverage - b.coverage) <= COVERAGE_TIE) return fa ? a : b;
          return a.coverage >= b.coverage ? a : b;
        });
    }
  }
  if (count != null) {
    // Exact count: only the largest reachable count competes.
    target = Math.max(...candidates.map((c) => c.frames.length));
    pool = candidates.filter((c) => c.frames.length === target);
  }
  const best = Math.max(...pool.map((c) => c.coverage));
  // Prefer a big main tile when it costs little area: on a 16:9 window main + 5 beats four equal tiles.
  const focused = pool.filter((c) => hasDominantMain(c) && c.coverage >= best - MAIN_FOCUS_TOLERANCE);
  const near = focused.length > 0 ? focused : pool.filter((c) => c.coverage >= best - COVERAGE_TIE);
  // Closest to the preferred count, then best coverage, then the larger main tile.
  return near.reduce((a, b) => {
    const da = Math.abs(a.frames.length - target);
    const db = Math.abs(b.frames.length - target);
    if (da !== db) return da < db ? a : b;
    if (a.coverage !== b.coverage) return a.coverage > b.coverage ? a : b;
    return a.frames[0].width >= b.frames[0].width ? a : b;
  });
}

window.OpenViewerTiling = { solveTiling };
})();
