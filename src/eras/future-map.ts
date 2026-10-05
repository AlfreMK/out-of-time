/**
 * Neo-Tokyo map, 2087: the Shibuya River in its concrete channel, a plaza with Hachikō's
 * statue and a small Shinto shrine, neon streets, a maglev depot and the
 * Chronos Corp tower (48x40 tiles). Uppercase letters and digits are markers;
 * see FUTURE_MARKER_BASE.
 *
 * Legend:  . street   : sidewalk   = plaza   # neon building   g glass tower   _ lobby/depot floor
 *          - lab floor   d doorway   ~ canal   + bridge   p puddle (noisy)   , planter (hides you)
 *          x dark alley (hides you)   h billboard   v vending machine   k ramen stall (yatai)   c tech crate
 *          s server rack   u lab bench   m Yamanote Line station   o statue/shrine base   b bench
 *          l street lamp   t tree   r railing   j railway viaduct (Yamanote Line)   z shrine fence
 *          e stone lantern (tōrō)   a ema rack   y yakitori stall   q takoyaki stall   i hydrangea bed
 *          " tactile paving (tenji blocks) from the station   w depot wall (corrugated steel)   f depot floor   n parked maglev car
 */
export const FUTURE_MAP = [
  '################################################',
  '#wwwwwwwwwwwwwwwwwwww######gggggggggggggggggggg#',
  '#wnnnnnnnfcffffcffcKw######g__________s-------g#',
  '#wfffffpfffffpIfcfffw######g_h________s--u-u--g#',
  '#wfcf2fffcffcfffffffw######g__________s---1---g#',
  '#wfcfffcfcfffffccfffw######g___U______s-------g#',
  '#wcpffffffffffffffffw######g__________ss-----sg#',
  '#wfffffffffcffffffffw######g__________s---P---g#',
  '#wffcfffffcfpffffpffw######g__________ssss4sssg#',
  '#wfGffffffffffffffHfw######g_A________________g#',
  '#wffffffcffcffffffffw#xx###g_____v____________g#',
  '#wfffffffffffffffcffw#Ox###g,,,,________,,,__Bg#',
  'xwffffcfffffffJfc6fpw#xx###g__________________g#',
  'xwffffffffffffffffpfwxxx###g_C______________D_g#',
  'xwwwwwwwwww9wwwwwwwwwxxx###g__________________g#',
  'xx#########pp#######xxxxxx#g__________________g#',
  'xx#########pX#######xxxxxx#ggggggggg3gggggggggg#',
  '::::::::v::::::::::h:::::T::::::::::::::::::v:::',
  '.........................p......p...Z...........',
  '............................E...........pp..F...',
  '..l,,,,,l.....l,,,,,l.......l,,l8.....l,,,,,l...',
  '..L.....p............Q..........................',
  '........p...pp..........R....p..................',
  '::::::W:::::::::::::::::::::::::::::::::::::::::',
  'rrrrrrrrrr++rrrrrrrrrrrrrrrrrrrrrr++rrrrrrrrrrrr',
  '~~~~~~~~~~++~~~~~~~~~~~~~~~~~~~~~~++~~~~~~~~~~~~',
  '~~~~~~~~~~++~~~~~~~~~~~~~~~~~~~~~~++~~~~~~~~~~~~',
  'rrrrrrrrrr++rrrrrrrrrrrrrrrrrrrrrr++rrrrrrrrrrrr',
  '#::::::::::::::::::::::::::::::::::::::::::::::#',
  '#========i="pkkkV=yyy=qq=l===========zzzzzzzzzz#',
  '#=t===t=l=="""""""============t======z==ooooo==#',
  '#=i=============b"===================zt=ooooo5=#',
  '#============p=t="===================z====:====#',
  '#===p=M======b==="=p==i=7=i====p====iz==e=:=e==#',
  '#================"===================z====:==N=#',
  '#==i==S====t====="====t=====Y=====l==zzzz=0=zzz#',
  '#================mm=======vvvvvv==============t#',
  '#jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj#',
  '#jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj#',
  '################################################',
];

export const FUTURE_MARKER_BASE: Record<string, string> = {
  '0': '=',
  '1': '-',
  '2': 'f',
  '3': '_',
  '4': '-',
  '5': 'a',
  '6': 'f',
  '7': 'o',
  '8': '.',
  '9': 'd',
  A: '_',
  B: '_',
  C: '_',
  D: '_',
  E: '.',
  F: '.',
  G: 'f',
  H: 'f',
  I: 'f',
  J: 'f',
  K: 'f',
  L: '.',
  M: '=',
  N: '=',
  O: 'x',
  P: '-',
  Q: 'p',
  R: '.',
  S: '=',
  T: 'c',
  U: 'c',
  V: '=',
  W: ':',
  X: ':',
  Y: '=',
  Z: '.',
};
