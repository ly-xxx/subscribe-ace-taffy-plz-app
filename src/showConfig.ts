export const cameraPresets = [
  {
    id: 'full',
    label: '全景',
    cameraOrbit: '180deg 63.5deg 5.05m',
  },
  {
    id: 'mid',
    label: '半身',
    cameraOrbit: '188deg 60.8deg 4.08m',
  },
  {
    id: 'close',
    label: '近景',
    cameraOrbit: '194deg 57.8deg 3.44m',
  },
] as const;

export type CameraPresetId = (typeof cameraPresets)[number]['id'];
