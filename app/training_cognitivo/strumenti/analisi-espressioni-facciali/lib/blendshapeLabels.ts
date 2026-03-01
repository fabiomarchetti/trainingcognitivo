// Traduzioni italiane dei blendshape ARKit/MediaPipe
export const BLENDSHAPE_LABELS: Record<string, string> = {
  // Occhi - Ammiccamento
  eyeBlinkLeft: "Ammiccamento sx",
  eyeBlinkRight: "Ammiccamento dx",

  // Occhi - Direzione sguardo
  eyeLookDownLeft: "Sguardo basso sx",
  eyeLookDownRight: "Sguardo basso dx",
  eyeLookUpLeft: "Sguardo alto sx",
  eyeLookUpRight: "Sguardo alto dx",
  eyeLookInLeft: "Sguardo interno sx",
  eyeLookInRight: "Sguardo interno dx",
  eyeLookOutLeft: "Sguardo esterno sx",
  eyeLookOutRight: "Sguardo esterno dx",

  // Occhi - Espressioni
  eyeSquintLeft: "Occhio socchiuso sx",
  eyeSquintRight: "Occhio socchiuso dx",
  eyeWideLeft: "Occhio spalancato sx",
  eyeWideRight: "Occhio spalancato dx",

  // Sopracciglia
  browDownLeft: "Sopracciglio abbassato sx",
  browDownRight: "Sopracciglio abbassato dx",
  browInnerUp: "Sopracciglia interne alzate",
  browOuterUpLeft: "Sopracciglio esterno alzato sx",
  browOuterUpRight: "Sopracciglio esterno alzato dx",

  // Guance
  cheekPuff: "Guance gonfiate",
  cheekSquintLeft: "Guancia strizzata sx",
  cheekSquintRight: "Guancia strizzata dx",

  // Mandibola
  jawOpen: "Bocca aperta",
  jawForward: "Mandibola in avanti",
  jawLeft: "Mandibola a sinistra",
  jawRight: "Mandibola a destra",

  // Bocca - Forme base
  mouthClose: "Bocca chiusa",
  mouthFunnel: "Bocca a O",
  mouthPucker: "Labbra a bacio",
  mouthLeft: "Bocca a sinistra",
  mouthRight: "Bocca a destra",

  // Bocca - Sorriso e tristezza
  mouthSmileLeft: "Sorriso sx",
  mouthSmileRight: "Sorriso dx",
  mouthFrownLeft: "Bocca triste sx",
  mouthFrownRight: "Bocca triste dx",

  // Bocca - Altre espressioni
  mouthDimpleLeft: "Fossetta sx",
  mouthDimpleRight: "Fossetta dx",
  mouthStretchLeft: "Bocca stirata sx",
  mouthStretchRight: "Bocca stirata dx",
  mouthRollLower: "Labbro inf. arrotolato",
  mouthRollUpper: "Labbro sup. arrotolato",
  mouthShrugLower: "Labbro inf. stretto",
  mouthShrugUpper: "Labbro sup. stretto",
  mouthPressLeft: "Labbra premute sx",
  mouthPressRight: "Labbra premute dx",
  mouthLowerDownLeft: "Labbro inf. abbassato sx",
  mouthLowerDownRight: "Labbro inf. abbassato dx",
  mouthUpperUpLeft: "Labbro sup. alzato sx",
  mouthUpperUpRight: "Labbro sup. alzato dx",

  // Naso
  noseSneerLeft: "Naso arricciato sx",
  noseSneerRight: "Naso arricciato dx",

  // Lingua
  tongueOut: "Lingua fuori",

  // Testa (se presenti)
  headYaw: "Rotazione testa orizz.",
  headPitch: "Rotazione testa vert.",
  headRoll: "Inclinazione testa",
};

// Funzione per ottenere la traduzione di un blendshape
export function getBlendshapeLabel(name: string): string {
  // Rimuovi underscore iniziale se presente (es. _neutral)
  const cleanName = name.startsWith("_") ? name.slice(1) : name;

  // Cerca traduzione
  if (BLENDSHAPE_LABELS[cleanName]) {
    return BLENDSHAPE_LABELS[cleanName];
  }

  // Fallback: formatta il nome originale
  return cleanName
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// Categorizza i blendshape per area del viso
export const BLENDSHAPE_CATEGORIES: Record<string, string[]> = {
  "Occhi": [
    "eyeBlinkLeft", "eyeBlinkRight",
    "eyeSquintLeft", "eyeSquintRight",
    "eyeWideLeft", "eyeWideRight",
  ],
  "Sguardo": [
    "eyeLookDownLeft", "eyeLookDownRight",
    "eyeLookUpLeft", "eyeLookUpRight",
    "eyeLookInLeft", "eyeLookInRight",
    "eyeLookOutLeft", "eyeLookOutRight",
  ],
  "Sopracciglia": [
    "browDownLeft", "browDownRight",
    "browInnerUp",
    "browOuterUpLeft", "browOuterUpRight",
  ],
  "Bocca": [
    "jawOpen", "mouthSmileLeft", "mouthSmileRight",
    "mouthFrownLeft", "mouthFrownRight",
    "mouthPucker", "mouthFunnel",
  ],
  "Guance e Naso": [
    "cheekPuff", "cheekSquintLeft", "cheekSquintRight",
    "noseSneerLeft", "noseSneerRight",
  ],
};
