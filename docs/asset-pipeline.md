# MMD Asset Pipeline

## 当前素材

- `assets/mmd/taffy_base/永雏塔菲MMD_2.0/永雏塔菲MMD_2.0.pmx`
- `assets/mmd/taffy_base/永雏塔菲MMD_2.0/tex/*.png`
- `assets/mmd/taffy_motion/关注塔菲谢谢喵MMD动作/关注塔菲谢谢喵.vmd`
- `assets/mmd/taffy_motion/关注塔菲谢谢喵MMD动作/关注塔菲谢谢喵.mp3`

## 动作作者给出的约束

动作包里的 `使用说明.txt` 明确提到：

- 套动作前，需要把模型的 `センター` 骨移动到胯部附近
- 可参考同目录下的 `センター骨位置示例.png`

如果跳过这一步，模型重心会漂，动作也容易变形。

## 仓库内当前采用的做法

这个仓库没有在运行时直接播放 PMX/VMD，而是先在 Blender 里把动作烘焙成 `GLB`。

实际步骤是：

1. 通过仓库内 vendored 的 `mmd_tools` addon 导入 PMX。
2. 在脚本里自动把 `センター` 骨移动到更接近胯部的位置。
3. 导入 `VMD` 动作。
4. 导出一个包含模型、贴图、骨骼动画的 `GLB`。
5. Expo 直接打包并播放这个 `GLB`。

## 一键转换

Windows 下直接运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\blender\convert-taffy.ps1
```

脚本会自动：

- 设置 `BLENDER_USER_SCRIPTS` 到 `tools/blender`
- 启用仓库内的 `tools/blender/addons/mmd_tools`
- 读取默认 PMX 和 VMD
- 输出 `assets/exports/taffy-laugh.glb`

如果你后面换模型或换动作，也可以给脚本传自定义参数。

## 脚本里的关键修正

`tools/blender/convert_mmd_to_glb.py` 会优先取：

- `左足.head`
- `右足.head`

的平均值作为 `センター` 骨的新位置；如果缺失，则退回 `下半身.head`。

这一步是为了把动作包要求的“重心改到胯部附近”固化进自动流程里，避免每次手工调骨。

## 为什么选 GLB

`GLB` 对当前 Expo 原型最合适：

- 一个文件就能包含模型、贴图和动画
- Metro 可以直接把它当资源打包
- `WebView + model-viewer` 可以直接播
- 后面如果改成原生 3D 引擎，也能继续复用导出的资产

## 当前导出结果

仓库内已经包含：

- `assets/exports/taffy-laugh.glb`

这次导出成功了，但 Blender 日志里仍然有一些已知缺口：

- 动作文件里引用了不少当前模型没有的 `Skirt_*` 骨骼
- 动作文件里还有一批当前模型没有的表情 morph

结论是：

- 主体动作已经足够做移动端原型
- 裙摆细节和部分面部表情不会完全复现原始 MMD 效果
