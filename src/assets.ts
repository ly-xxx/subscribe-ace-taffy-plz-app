import { Asset } from 'expo-asset';

export type CreditBlock = {
  title: string;
  lines: readonly string[];
};

export type MotionTheme = {
  wash: string;
  glow: string;
  orb: string;
  stroke: string;
  badge: string;
  icon: 'ribbon' | 'burst';
};

export type MotionAssetEntry = {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  signature: string;
  glbModule: number;
  audioModule: number | null;
  expressionPreset?: 'default' | 'grin';
  cameraAzimuthOffsetDeg: number;
  cameraTargetM?: string;
  cameraTargetOffsetXM?: number;
  theme: MotionTheme;
  credits: readonly CreditBlock[];
};

export const motionCatalog = [
  {
    id: 'follow-taffy',
    title: '关注塔菲',
    subtitle: '谢谢喵',
    accent: '主舞台',
    signature: '唐氏本天成',
    glbModule: require('../assets/exports/taffy-laugh.glb'),
    audioModule: require('../assets/mmd/taffy_motion/关注塔菲谢谢喵MMD动作/关注塔菲谢谢喵.mp3'),
    expressionPreset: 'default',
    cameraAzimuthOffsetDeg: 0,
    cameraTargetM: '0m 0.88m 0m',
    cameraTargetOffsetXM: 0,
    theme: {
      wash: 'rgba(255, 238, 244, 0.96)',
      glow: 'rgba(255, 225, 236, 0.88)',
      orb: 'rgba(246, 239, 255, 0.86)',
      stroke: 'rgba(224, 190, 205, 0.42)',
      badge: 'rgba(255, 252, 254, 0.82)',
      icon: 'ribbon',
    },
    credits: [
      {
        title: 'Model',
        lines: [
          '模型所属：永雏塔菲',
          '建模：Francesca / Lucky FaFa / トミタケ',
          '绑定 / 表情：客官IIIII',
        ],
      },
      {
        title: 'Motion',
        lines: ['动作来源：永雏塔菲', '动作转换：ARonisc', '编舞：超可爱的奈奈奈'],
      },
      {
        title: 'Camera',
        lines: ['Weisheng_5'],
      },
      {
        title: 'Stage / MME',
        lines: ['AttieMmd', 'Rui_cg / そぼろ / ikeno / P.I.P / RedialC / 三金络合物 / 針金p / Azolt / tktk'],
      },
    ],
  },
  {
    id: 'nailong-laugh',
    title: '捧腹大笑',
    subtitle: '逆天唐笑',
    accent: '新动作',
    signature: '妙手偶得之',
    glbModule: require('../assets/exports/taffy-nailong-laugh.glb'),
    audioModule: require('../assets/mmd/taffy_motion/奶龙捧腹大笑/1_永雏塔菲逆天唐笑_(Vocals).wav'),
    expressionPreset: 'grin',
    cameraAzimuthOffsetDeg: 15,
    cameraTargetM: undefined,
    cameraTargetOffsetXM: 0,
    theme: {
      wash: 'rgba(255, 244, 236, 0.96)',
      glow: 'rgba(255, 231, 227, 0.9)',
      orb: 'rgba(236, 244, 255, 0.84)',
      stroke: 'rgba(228, 194, 184, 0.42)',
      badge: 'rgba(255, 251, 252, 0.82)',
      icon: 'burst',
    },
    credits: [
      {
        title: 'Model',
        lines: [
          '模型所属：永雏塔菲',
          '建模：Francesca / Lucky FaFa / トミタケ',
          '绑定 / 表情：客官IIIII',
        ],
      },
      {
        title: 'Motion',
        lines: ['动作：狐娘', '动作包：奶龙捧腹大笑 by 白羽九', '音频：1_永雏塔菲逆天唐笑_(Vocals)'],
      },
    ],
  },
] as const satisfies readonly MotionAssetEntry[];

export type MotionAssetId = (typeof motionCatalog)[number]['id'];

export async function resolveAssetUri(moduleId: number) {
  const [asset] = await Asset.loadAsync(moduleId);
  return asset.localUri ?? asset.uri;
}
