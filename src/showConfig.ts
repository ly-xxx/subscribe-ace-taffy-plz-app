export const cameraPresets = [
  {
    id: 'full',
    label: '全',
    cameraOrbit: '180deg 79deg 2.5m',
  },
  {
    id: 'mid',
    label: '半',
    cameraOrbit: '188deg 76deg 2.15m',
  },
  {
    id: 'close',
    label: '近',
    cameraOrbit: '196deg 72deg 1.84m',
  },
] as const;

export type CameraPresetId = (typeof cameraPresets)[number]['id'];
