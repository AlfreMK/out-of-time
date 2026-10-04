/**
 * Neo-Tokyo map, 2087: a canal off the Sumida River, a plaza with Hachikō's
 * statue and a small Shinto shrine, neon streets, a maglev depot and the
 * Chronos Corp tower (48x40 tiles). Uppercase letters and digits are markers;
 * see FUTURE_MARKER_BASE.
 *
 * Legend:  . street   : sidewalk   = plaza   # neon building   g glass tower   _ lobby/depot floor
 *          - lab floor   d doorway   ~ canal   + bridge   p puddle (noisy)   , planter (hides you)
 *          x dark alley (hides you)   h billboard   v vending machine   k ramen stall (yatai)   c tech crate
 *          s server rack   u lab bench   m station entrance   o statue/shrine base   b bench
 *          l street lamp   t tree   r railing   j railway viaduct (Yamanote Line)   z shrine fence
 *          e stone lantern (tōrō)   a ema rack
 */
export const FUTURE_MAP = [
  '################################################',
  '###########################gggggggggggggggggggg#',
  '##________c____c__cK#######g__________s-------g#',
  '##_____p_____pI_c___#######g_h________s--u-u--g#',
  '##_c_2___c__c_______#######g__________s---1---g#',
  '##_c___c_c_____cc___#######g___U______s-------g#',
  '##cp________________#######g__________ss-----sg#',
  '##_________c________#######g__________s---P---g#',
  '##__c_____c_p____p__#######g__________ssss4sssg#',
  '##_G______________H_#######g_A________________g#',
  '##______c__c________##xx###g_____v____________g#',
  '##_______________c__##Ox###g,,,,________,,,__Bg#',
  'x#____c_______J_c6_p##xx###g__________________g#',
  'x#________________p_#xxx###g_C______________D_g#',
  'x##########9#########xxx###g__________________g#',
  'xx#########::#######xxxxxx#g__________________g#',
  'xx#########:X#######xxxxxx#ggggggggg3gggggggggg#',
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
  '#========,==pkkkV========l===========zzzzzzzzzz#',
  '#=t===t=l=====================t======z==ooooo==#',
  '#=,=============b================m===zt=ooooo5=#',
  '#============p=t=====================z====:====#',
  '#===p=M======b=====p====7======p=====z==e=:=e==#',
  '#====================================z====:==N=#',
  '#==,==S====t==========t=====Y=====l==zzzz=0=zzz#',
  '#=========================vvvvvv==============t#',
  '#jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj#',
  '#jjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjjj#',
  '################################################',
];

export const FUTURE_MARKER_BASE: Record<string, string> = {
  '0': '=',
  '1': '-',
  '2': '_',
  '3': '_',
  '4': '-',
  '5': 'a',
  '6': '_',
  '7': 'o',
  '8': '.',
  '9': 'd',
  A: '_',
  B: '_',
  C: '_',
  D: '_',
  E: '.',
  F: '.',
  G: '_',
  H: '_',
  I: '_',
  J: '_',
  K: '_',
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
