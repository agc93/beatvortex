---
title: "Alpha 3.2 Release"
linkTitle: "Release 0.3.2"
date: 2020-06-16
aliases:
  - /updates/germanium
  - /updates/v0.3.2
description: >
  Alpha release of BeatVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/96?tab=files).
{{% /pageinfo %}}

This release adds some new features and fixes to the [previous alpha release](/updates/v0.3.1) including:

- Optional custom attributes for the Mods list: enable them from the cog in the top right.
  - The Mods list can now display map difficulties, map modes and artist names for BeatSaver maps, right in the table.
  - Since this depends on new changes (below), these will only appear on maps installed after this update, or you can reinstall the map to get them now.
- New custom icons for difficulties and modes: please report any issues you see with these, especially with custom themes.
- Extended installation metadata: installing mods/maps from BeatMods and BeatSaver will now preserve more metadata under the hood.
- OneClick links will now auto-install custom maps: you only need to Enable new maps to add them to your install.
- Improvements to playlist support: installing playlists and maps should be more reliable now.
- Major code cleanup and refactoring: it might not be a sexy new feature, but this release cleared up a lot of convoluted and obsoleted code, so fixes and features should be a little easier now.

As with [v0.3.1](/updates/v0.3.1), this release requires the features and fixes from recent Vortex updates and we **strongly** recommend only using this version of the extension with Vortex 1.2.13 *or higher*.

### A note to Mod Assistant users

In the pre-alpha release, Mod Assistant and BeatVortex had no real overlap so there was no compatibility concerns. With the new OneClick support<sup>preview</sup>, we finally have our first real compatibility point: who gets launched when you open a OneClick link. Ideally, BeatVortex should not pick up OneClick links until you specifically turn it on in your settings and restart Vortex. Likewise, once you've turned it on, Vortex **should** *replace* Mod Assistant to handle these links. 

If you're encountering problems with OneClick installs, I'd recommend turning off the OneClick support from whichever application you don't want handling your installs. This is still in preview so if you encounter problems, please open an issue on GitHub with as much detail as you can.

