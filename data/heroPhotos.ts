import type { ImageProps } from 'expo-image';

/** Bundled opening-screen photos, keyed by place id. */
export const HERO_PHOTOS: Record<string, ImageProps['source']> = {
  'ama-dablam': require('../assets/hero/ama-dablam.jpg'),
  'half-dome': require('../assets/hero/half-dome.jpg'),
  'angels-landing': require('../assets/hero/angels-landing.jpg'),
  'kalalau-trail': require('../assets/hero/kalalau-trail.jpg'),
  'mount-whitney': require('../assets/hero/mount-whitney.jpg'),
  'denali': require('../assets/hero/denali.jpg'),
  'dawn-wall': require('../assets/hero/dawn-wall.jpg'),
  'longs-peak': require('../assets/hero/longs-peak.jpg'),
  'mount-rainier': require('../assets/hero/mount-rainier.jpg'),
  'k2': require('../assets/hero/k2.jpg'),
  'mount-everest': require('../assets/hero/mount-everest.jpg'),
  'eiger-north-face': require('../assets/hero/eiger-north-face.jpg'),
  'matterhorn': require('../assets/hero/matterhorn.jpg'),
  'huayna-picchu': require('../assets/hero/huayna-picchu.jpg'),
  'annapurna-circuit': require('../assets/hero/annapurna-circuit.jpg'),
  'torres-del-paine': require('../assets/hero/torres-del-paine.jpg'),
  'cerro-torre': require('../assets/hero/cerro-torre.jpg'),
  'fitz-roy': require('../assets/hero/fitz-roy.jpg'),
  'tour-du-mont-blanc': require('../assets/hero/tour-du-mont-blanc.jpg'),
  'trolltunga': require('../assets/hero/trolltunga.jpg'),
  'mount-hua': require('../assets/hero/mount-hua.jpg'),
  'kilimanjaro': require('../assets/hero/kilimanjaro.jpg'),
  'aconcagua': require('../assets/hero/aconcagua.jpg'),
};
