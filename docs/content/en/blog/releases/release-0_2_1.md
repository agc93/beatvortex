---
title: "Alpha 2.1 Release"
linkTitle: "Release 0.2.1"
date: 2020-04-17
description: >
  Alpha release of BeatVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/96?tab=files).
{{% /pageinfo %}}

This release adds some new features and fixes to the previous alpha release including:

- Automatic BSIPA patching: Vortex will now prompt you to run BSIPA when first deploying mods.
- Improves stability and view layout for the BeatMods browser page
- Adds compatibility filtering to the BeatMods browser for different Beat Saber versions

### A note to Mod Assistant users

In the pre-alpha release, Mod Assistant and BeatVortex had no real overlap so there was no compatibility concerns. With the new OneClick support<sup>preview</sup>, we finally have our first real compatibility point: who gets launched when you open a OneClick link. Ideally, BeatVortex should not pick up OneClick links until you specifically turn it on in your profile and restart Vortex. Likewise, once you've turned it on, Vortex **should** *replace* Mod Assistant to handle these links. 

If you're encountering problems with OneClick installs, I'd recommend turning off the OneClick support from whichever application you don't want handling your installs. This is still in preview so if you encounter problems, please open an issue on GitHub with as much detail as you can.

