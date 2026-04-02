export const cameraPresets = [
  {
    id: 'full',
    label: '全景',
    cameraOrbit: '180deg 68deg 4.65m',
  },
  {
    id: 'mid',
    label: '半身',
    cameraOrbit: '188deg 66deg 3.78m',
  },
  {
    id: 'close',
    label: '近景',
    cameraOrbit: '195deg 63deg 3.24m',
  },
] as const;

export type CameraPresetId = (typeof cameraPresets)[number]['id'];
