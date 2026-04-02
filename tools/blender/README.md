# Blender Workflow Notes

这个目录用于把 MMD 资产转换成适合 Expo 使用的 `GLB`。

## 当前思路

项目运行时不直接执行 PMX/VMD，而是：

1. 用 Blender 导入 PMX
2. 自动修正 `センター` 骨位置
3. 导入 VMD 动作
4. 导出单文件 `GLB`
5. 让 Expo 直接加载导出的资源

## 目录说明

- `addons/mmd_tools/`
  仓库内随附的 Blender addon 副本，供脚本直接启用
- `convert_mmd_to_glb.py`
  真正执行导入 PMX、修正骨骼、导入 VMD、导出 GLB 的 Blender 脚本
- `inspect_mmd_model.py`
  用来检查关键骨骼位置的辅助脚本
- `convert-taffy.ps1`
  Windows 下一键执行转换的入口脚本

`inspect-output.json` 是辅助检查时生成的产物，已加入 git ignore。

## MMD Tools 来源

当前 vendored addon 来源于：

- repo: `https://github.com/MMD-Blender/blender_mmd_tools`
- revision: `325d7d4`

仓库里只保留了 Blender 运行真正需要的 addon 副本，不再把完整源码克隆纳入版本控制。

该 addon 使用 GPL-3.0-or-later 分发，许可证副本见 `addons/mmd_tools/LICENSE`。

## 一键转换命令

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\blender\convert-taffy.ps1
```

默认会使用：

- `assets/mmd/taffy_base/永雏塔菲MMD_2.0/永雏塔菲MMD_2.0.pmx`
- `assets/mmd/taffy_motion/关注塔菲谢谢喵MMD动作/关注塔菲谢谢喵.vmd`

输出：

- `assets/exports/taffy-laugh.glb`

## 可调方向

如果后面效果还不够像原始 MMD，优先调这里：

- `convert_mmd_to_glb.py` 里的 `センター` 骨修正逻辑
- 导出时选择哪些对象进入 `GLB`
- 动画帧范围和 Bake 方式
