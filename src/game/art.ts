import { makeSprite, type Sprite } from '../engine/sprite.ts';
import type { EmoteKind } from './looks.ts';
import type { ItemId } from './state.ts';

/*
 * Pixel-art icons for the 2D UI layer (HUD, inventory, emotes), written as
 * ASCII rows. '.' is transparent; other characters map to palette colors.
 */

// ---------------------------------------------------------------------------
// Items (8x8).

export const ITEM_SPRITES: Record<ItemId, Sprite> = {
  amber: makeSprite(
    ['..oo....', '.oAAo...', 'oAyAAo..', 'oAyAAAo.', 'oAAAAAo.', '.oAAAo..', '..ooo...', '........'],
    { o: '#a8560c', A: '#f0a030', y: '#ffe08a' },
  ),
  obsidian: makeSprite(
    ['...k....', '..kpk...', '..kwpk..', '.kpwpk..', '.kkpppk.', 'kkpkkpk.', '.kkkkk..', '........'],
    { k: '#15111c', p: '#5b3f87', w: '#c9b8ff' },
  ),
  meteorite: makeSprite(
    ['..ggg...', '.glmgg..', 'gglggmg.', 'gmgglgg.', 'gglmggg.', '.ggggg..', '........', '........'],
    { g: '#5d5d66', l: '#8d8d99', m: '#e0e8f0' },
  ),
  fern: makeSprite(
    ['...l....', '..lgl...', '.l.g.l..', '..lgl...', '.l.g.l..', '..lgl...', '...g....', '...g....'],
    { g: '#2f7f2a', l: '#7bd36a' },
  ),
  recorder: makeSprite(
    ['........', '.kkkkkk.', '.kggggk.', '.kgrggk.', '.kggggk.', '.kkkkkk.', '..k..k..', '........'],
    { k: '#222222', g: '#8a8a8a', r: '#ff3b3b' },
  ),
  bread: makeSprite(
    ['........', '..bbbb..', '.blblbb.', 'bblblbbb', 'bbbbbbbd', '.dddddd.', '........', '........'],
    { b: '#c98b4a', l: '#e8b878', d: '#8a5a2a' },
  ),
  pebbles: makeSprite(
    ['........', '........', '..gg....', '.gdg.gg.', '..g.gdg.', '....gg..', '........', '........'],
    { g: '#a8a8a8', d: '#6d6d6d' },
  ),
  charcoal: makeSprite(
    ['........', '...kk...', '..kgkk..', '.kkkkgk.', 'kgkkkkkk', 'kkkkgkk.', '........', '........'],
    { k: '#1c1c1c', g: '#555555' },
  ),
  gear: makeSprite(
    ['...bb...', '.bbllbb.', '.bdbbdb.', 'blb..bbb', 'bbb..blb', '.bdbbdb.', '.bbllbb.', '...bb...'],
    { b: '#b8863b', d: '#7a5520', l: '#e6c07a' },
  ),
  quicksilver: makeSprite(
    ['...cc...', '...kk...', '..g..g..', '.g.ss.g.', '.gssssg.', '.gssssg.', '..gggg..', '........'],
    { g: '#9ad1d4', s: '#dfe6ee', k: '#555555', c: '#8b5a2b' },
  ),
  shield: makeSprite(
    ['ssssssss', 'sbbyybbs', 'sbbyybbs', 'syyyyyys', 'sbbyybbs', '.sbyybs.', '..sbbs..', '...ss...'],
    { b: '#f0ece0', s: '#7a5a3a', y: '#1a1a1a' },
  ),
  top: makeSprite(
    ['...kk...', '...bb...', '.bbbbbb.', 'brrrrrrb', '.bbbbbb.', '..bbbb..', '...bb...', '...k....'],
    { b: '#b8864a', r: '#b02a2a', k: '#4a3020' },
  ),
  firewood: makeSprite(
    ['........', '.bbbbbbo', 'bBBBBBBo', '.bbbbbbo', 'bBBBBBBo', '.bbbbbbo', '...rr...', '........'],
    { b: '#7a5230', B: '#9a6a40', o: '#c8a878', r: '#8a2a2a' },
  ),
  gold: makeSprite(
    ['........', '...yy...', '..yYyy..', '.yYYyyo.', '.yyyyoo.', '..yooo..', '........', '........'],
    { y: '#f1c232', Y: '#fff3a0', o: '#b8860b' },
  ),
  lodestone: makeSprite(
    ['........', '..kkk...', '.kgkkk..', 'kkkkgkk.', 'kgkkkkk.', '.kkkgk..', '..kk....', '........'],
    { k: '#2a2a30', g: '#8a8a9a' },
  ),
  pifilka: makeSprite(
    ['...ww...', '..wbbw..', '..wbbw..', '..wbbw..', '..wbbw..', '..wbbw..', '...ww...', '...kk...'],
    { w: '#8a5a2b', b: '#c48a4a', k: '#2a1a0a' },
  ),
  canelo: makeSprite(
    ['......g.', '....ggg.', '...gg...', '..bb....', '.bbB....', 'bbB.....', 'bB......', '........'],
    { g: '#3f8f3a', b: '#8a5a3a', B: '#c48a5a' },
  ),
  maqui: makeSprite(
    ['...g....', '..ggg...', '.g.g.g..', '..kpk...', '.kpkpk..', '..kpk...', '...k....', '........'],
    { g: '#3f8f3a', k: '#2a1438', p: '#5a2a6a' },
  ),
  pali: makeSprite(
    ['........', '..bbbb..', '.bBbbbb.', '.bbbbbb.', '.bbbbbb.', '.bbbbbd.', '..bddd..', '........'],
    { b: '#a8783a', B: '#d8a868', d: '#6a4a2a' },
  ),
  charqui: makeSprite(
    ['........', '.rrr....', 'rRrrr...', '.rrrrr..', '..rrRrr.', '...rrrr.', '....rr..', '........'],
    { r: '#7a2a1a', R: '#a84a2a' },
  ),
  clock: makeSprite(
    ['.cccccc.', 'cbbbbbbc', 'cbmbbmbc', 'cbbppbbc', 'cbbppbbc', 'cbmbbmbc', 'cbbbbbbc', '.cccccc.'],
    { c: '#9aa6bb', b: '#1a1d2a', p: '#ff6bd6', m: '#7fd8ff' },
  ),
  tape: makeSprite(
    ['..ssss..', '.s....s.', 's..cc..s', 's.cbbc.s', 's.cbbc.s', 's..cc..s', '.s....s.', '..ssss..'],
    { s: '#c87533', c: '#7fd8ff', b: '#1a1d2a' },
  ),
  powercell: makeSprite(
    ['...kk...', '.kkkkkk.', '.kgggck.', '.kgggck.', '.kggcck.', '.kgccck.', '.kcccck.', '.kkkkkk.'],
    { k: '#2a2a3a', g: '#3a4a5a', c: '#5aff8a' },
  ),
  deck: makeSprite(
    ['........', 'kkkkkkkk', 'kcccccck', 'kcpppcck', 'kcccccck', 'kkkkkkkk', '.kgkgkk.', '........'],
    { k: '#1a1a2a', c: '#2a3a5a', p: '#ff3fd0', g: '#3fe0ff' },
  ),
  notes: makeSprite(
    ['.wwwwww.', '.wkkkkw.', '.wwwwww.', '.wkkkww.', '.wwwwww.', '.wkkkkw.', '.wwwwww.', '........'],
    { w: '#e8e0cc', k: '#5a5a6a' },
  ),
  navmodule: makeSprite(
    ['........', '.gggggg.', '.gkkkkg.', '.gkGkkg.', '.gkkkGg.', '.gkGkkg.', '.gggggg.', '..y..y..'],
    { g: '#9aa6bb', k: '#1a2a3a', G: '#5aff8a', y: '#f1c232' },
  ),
  water: makeSprite(
    ['...kk...', '..kbbk..', '.kwwwwk.', '.kbbbbk.', '.kbBbbk.', '.kbbbbk.', '..kkkk..', '........'],
    { k: '#7a5a3a', b: '#3a7ab8', B: '#9ad8ff', w: '#c8b890' },
  ),
  quartz: makeSprite(
    ['...ww...', '..wppw..', '..wppw..', '.wppppw.', '.wpPppw.', '.wppppw.', '..wwww..', '.gggggg.'],
    { w: '#ffffff', p: '#e8e0ff', P: '#c8b8ff', g: '#7a7468' },
  ),
  emitter: makeSprite(
    ['........', '..oooo..', '.oCCCCo.', '.oCwwCo.', '.oCwwCo.', '.oCCCCo.', 'gggggggg', 'gggggggg'],
    { o: '#c87533', C: '#3a5a8a', w: '#7fd8ff', g: '#9aa6bb' },
  ),
  core: makeSprite(
    ['...cc...', '..cwwc..', '.cwppwc.', 'cwpPPpwc', 'cwpPPpwc', '.cwppwc.', '..cwwc..', '...cc...'],
    { c: '#3a5a8a', w: '#7fd8ff', p: '#c9a0ff', P: '#ffffff' },
  ),
};

// ---------------------------------------------------------------------------
// Emotes shown above characters.

export const EMOTES: Record<EmoteKind, Sprite> = {
  alert: makeSprite(['.rr.', '.rr.', '.rr.', '.rr.', '....', '.rr.'], { r: '#ff4040' }),
  question: makeSprite(['.yyy.', 'y...y', '...y.', '..y..', '.....', '..y..'], { y: '#ffd23f' }),
  heart: makeSprite(['.p.p.', 'ppppp', 'ppppp', '.ppp.', '..p..'], { p: '#ff6b9a' }),
  zzz: makeSprite(['wwwww...', '...w....', '..w..www', '.w.....w', 'wwwww.w.', '.....www'], { w: '#dfe6ee' }),
  note: makeSprite(['..ww', '..w.', '..w.', 'www.', 'ww..'], { w: '#dfe6ee' }),
};
