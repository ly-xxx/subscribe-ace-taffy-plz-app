export const cameraPresets = [
  {
    id: 'stage',
    label: '舞台全景',
    hint: '看完整套动作，适合第一次开播。',
    cameraOrbit: '0deg 78deg 3.35m',
  },
  {
    id: 'idol',
    label: '偶像机位',
    hint: '半身更贴脸，适合做循环整活。',
    cameraOrbit: '18deg 74deg 2.45m',
  },
  {
    id: 'chaos',
    label: '抽象怼脸',
    hint: '镜头更近，魔性会更明显。',
    cameraOrbit: '-22deg 68deg 1.95m',
  },
] as const;

export const speedPresets = [
  {
    id: 'steady',
    label: '标准笑场',
    hint: '原速播放，适合先确认动作节奏。',
    rate: 1,
  },
  {
    id: 'push',
    label: '加压推进',
    hint: '轻微提速，让节奏更像短视频梗。',
    rate: 1.08,
  },
  {
    id: 'overdrive',
    label: '失控模式',
    hint: '更疯一点，适合抽象感拉满。',
    rate: 1.18,
  },
] as const;

export const laughLines = [
  '关注塔菲谢谢喵，先笑了再说。',
  '不是我想点，是这个按钮看起来就很欠按。',
  '一旦开播，整个屏幕都会进入抽象状态。',
  '塔菲已经笑起来了，剩下的交给你的传播欲。',
  '今天的任务很简单，先把这段魔性循环起来。',
] as const;

export type CameraPresetId = (typeof cameraPresets)[number]['id'];
export type SpeedPresetId = (typeof speedPresets)[number]['id'];
