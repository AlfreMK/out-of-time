import type { Messages } from '../messages.ts';

/** Spanish for the text built from values (see `messages.ts`). */
export const ES_MESSAGES: Messages = {
  // Items
  gotItem: ({ item }) => `Obtenido: ${item}`,
  takeItem: ({ item }) => `Tomar: ${item}`,
  stillMissing: ({ items }) => `Aún te falta conseguir: ${items}.`,
  toDo: ({ steps }) => `Pendiente: ${steps.join('; ')}.`,

  // Hell Creek
  findParts: ({ items }) => `Busca: ${items}.`,
  findPartsAndFern: ({ items }) =>
    `Busca: ${items}. La herida de Pip necesita el helecho de olor intenso junto al nido del Anzu, al extremo sur de la pradera.`,
  findPartsAndPip: ({ items }) => `Busca: ${items}. Algo gemía en el valle, pasando el corredor del este.`,

  // Araucanía
  partsFromFort: ({ items, tips }) =>
    `Consigue ${items.join(' y ')} en el fuerte Tucapel. Toca la pifilka cerca de los exploradores para distraer a los soldados. ${tips.join(' ')}`.trim(),

  // Neo-Tokyo (both doors that get hacked are feminine: "Entrada de la torre", "Puerta del laboratorio")
  hacked: ({ door }) => `${door} desbloqueada · Cámaras y bots fuera de línea por 20 s`,

  // Madrid
  notQuartz: ({ reveal }) => `${reveal} No es cuarzo... y ahora todo lo que hay aquí sabe dónde estoy.`,

  // The time machine
  newWindow: ({ code }) => `${code}  ·  NUEVA VENTANA`,
  originMismatch: ({ year }) => `AÑO DE ORIGEN ${year}: NO COINCIDE CON LA FIRMA DE PARTIDA.`,
  originMatch: ({ year }) => `AÑO DE ORIGEN ${year}: FIRMA COINCIDENTE.`,
  stability: ({ percent, warning }) => `ESTABILIDAD ${percent}%${warning ? '  ·  ADVERTENCIA' : ''}`,

  // Cinematics
  skip: ({ key }) => `${key}: omitir`,
  yearReadout: ({ value }) => `AÑO: ${value}`,
  coordinatesReadout: ({ value }) => `COORDENADAS: ${value}`,
  statusReadout: ({ value }) => `ESTADO: ${value}`,
  pressKey: ({ key }) => `Presiona ${key}`,
  pressKeyForTitle: ({ key }) => `Presiona ${key} para volver al título`,

  // Title screen and pause menu
  padHints: ({ stick, interact, sneak, use, cycle, pause }) =>
    `${stick} mover · ${interact} interactuar · ${sneak} sigilo · ${use} usar · ${cycle} cambiar · ${pause} pausa`,
  controlMove: ({ how }) => `Moverse ..... ${how}`,
  controlInteract: ({ key, keyboard }) => `Interactuar . ${key}${keyboard ? ' / Espacio' : ''}`,
  controlSneak: ({ key, pad }) => `Sigilo ...... Mantén ${key}${pad ? ' / inclina suave' : ''}`,
  controlUse: ({ key }) => `Usar objeto . ${key} (mantén: lanzar lejos)`,
  controlSwitch: ({ key, device }) => `Cambiar ..... ${key}${device === 'touch' ? ' / tócalo' : device === 'keyboard' ? ' / Q / rueda' : ''}`,
  controlPause: ({ key }) => `Pausa ....... ${key}`,
  journalHelp: ({ key }) => `Arriba/Abajo desplazar · Izq./Der. página · ${key} cerrar`,
};
