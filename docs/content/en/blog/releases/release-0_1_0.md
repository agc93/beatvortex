---
title: "Alpha Release"
linkTitle: "Release 0.1.0"
date: 2020-04-08
aliases:
  - /updates/neon
  - /updates/v0.1.0
description: >
  Alpha release of BeatVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/96?tab=files).
{{% /pageinfo %}}

This release is the first full alpha of the BeatVortex extension. If you can install and test this extension, all feedback (on Nexus Mods or GitHub) is very appreciated!

This release adds a ton of missing features from the initial pre-alpha including:

- Preview support for OneClick installs from BeatSaver and BeastSaber
- Improved handling of game mods to improve deployments
- Supports pulling mod metadata from BeatSaver and BeatMods
- Improved download support that should improve installs from BeatMods/BeatSaver
- Configurable profile features<sup>preview</sup>
- Improved metadata handling including covers for maps, where available
- Major under-the-hood refactorings that should improve performance and cut down on errors

### A note to Mod Assistant users

In the pre-alpha release, Mod Assistant and BeatVortex had no real overlap so there was no compatibility concerns. With the new OneClick support<sup>preview</sup>, we finally have our first real compatibility point: who gets launched when you open a OneClick link. Ideally, BeatVortex should not pick up OneClick links until you specifically turn it on in your profile and restart Vortex. Likewise, once you've turned it on, Vortex **should** *replace* Mod Assistant to handle these links. 

If you're encountering problems with OneClick installs, I'd recommend turning off the OneClick support from whichever application you don't want handling your installs. This is still in preview so if you encounter problems, please open an issue on GitHub with as much detail as you can.

