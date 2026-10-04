/**
 * Everyone who speaks in the game. Dialogue lines take these values instead of
 * raw strings, so each name is spelled (and can be renamed) in one place.
 */
export const Speaker = {
  // The lab and the time travelers
  Andrew: 'Andrew',
  Nora: 'Nora',
  NoraRadio: 'Nora (radio)',
  Pike: 'Pike',
  Pip: 'Pip',
  // Cologne, 1248
  Agnes: 'Agnes',
  Jakob: 'Jakob',
  MeisterUlrich: 'Meister Ulrich',
  OldGertrud: 'Old Gertrud',
  BrotherAlbert: 'Brother Albert',
  BrotherThomas: 'Brother Thomas',
  GateGuard: 'Gate Guard',
  Guard: 'Guard',
  Brutus: 'Brutus',
  Forester: 'Forester',
  Hound: 'Hound',
  // Araucanía, 1553
  Lautaro: 'Lautaro',
  Machi: 'Machi',
  Rayen: 'Rayen',
  Ayelen: 'Ayelén',
  AyelensBrother: "Ayelén's brother",
  Kid: 'Kid',
  Weichafe: 'Weichafe',
  Scout: 'Scout',
  Soldier: 'Soldier',
  Rider: 'Rider',
  // Neo-Tokyo, 2087
  Hacker: 'Hacker',
  Yuki: 'Yuki',
  Priest: 'Priest',
  Vendor: 'Vendor',
  Commuter: 'Commuter',
  Courier: 'Courier',
  SecurityBot: 'Security Bot',
  Camera: 'Camera',
  Drone: 'Drone',
  // Madrid, 2240
  Nomad: 'Nomad',
  OldDrone: 'Old drone',
  MuseumBot: 'Museum bot',
} as const;

export type SpeakerName = (typeof Speaker)[keyof typeof Speaker];
