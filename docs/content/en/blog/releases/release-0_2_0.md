---
title: "Alpha 2 Release"
linkTitle: "Release 0.2.0"
date: 2020-04-16
aliases:
  - /updates/calcium
  - /updates/v0.2.0
description: >
  Alpha release of BeatVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/96?tab=files).
{{% /pageinfo %}}

This release marks the next full alpha of the BeatVortex extension. If you can install and test this extension, all feedback (on Nexus Mods or GitHub) is very appreciated!

This release adds some big new features and fixes to the previous alpha release including:

- New BeatMods browser. Open the BeatMods page in the sidebar to quickly browse and install the available mods from BeatMods.
- Improved profile settings and configuration to reduce duplicate notifications and errors.
- Significantly better handling of mod metadata
- Adds more support for ModelSaber mods (some caveats apply, check the docs)

### A note to Mod Assistant users

In the pre-alpha release, Mod Assistant and BeatVortex had no real overlap so there was no compatibility concerns. With the new OneClick support<sup>preview</sup>, we finally have our first real compatibility point: who gets launched when you open a OneClick link. Ideally, BeatVortex should not pick up OneClick links until you specifically turn it on in your profile and restart Vortex. Likewise, once you've turned it on, Vortex **should** *replace* Mod Assistant to handle these links. 

If you're encountering problems with OneClick installs, I'd recommend turning off the OneClick support from whichever application you don't want handling your installs. This is still in preview so if you encounter problems, please open an issue on GitHub with as much detail as you can.

