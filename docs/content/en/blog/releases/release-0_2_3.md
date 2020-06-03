---
title: "Alpha 2.3 Release"
linkTitle: "Release 0.2.3"
date: 2020-04-20
aliases:
  - /updates/vanadium
  - /updates/v0.2.3
description: >
  Alpha release of BeatVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/96?tab=files).
{{% /pageinfo %}}

This release adds some new features and fixes to the previous alpha release including:

- Fixes bug when installing "combined" mods (see below)
- Adds search filtering to the BeatMods browser.

### "Combined" mods

There was a bug in versions prior to 0.2.2 that would cause some mods (SongCore, for example) to fail during installation. For those interested, this bug was caused by BeatVortex detecting the song files included in a mod and assuming that the archive was a map to be deployed to `CustomLevels`. This meant that any mod that included *both* plugin files and map files would fail since the installer would try and deploy them to the wrong location.

Mods that contain map files packaged for the installation root (i.e. `Beat Saber_Data/CustomLevels/`) will now be picked up as mods, rather than song maps, and be deployed correctly. Make sure you don't change the mod type for these mods as this will almost certainly break deployment.

### A note to Mod Assistant users

In the pre-alpha release, Mod Assistant and BeatVortex had no real overlap so there was no compatibility concerns. With the new OneClick support<sup>preview</sup>, we finally have our first real compatibility point: who gets launched when you open a OneClick link. Ideally, BeatVortex should not pick up OneClick links until you specifically turn it on in your profile and restart Vortex. Likewise, once you've turned it on, Vortex **should** *replace* Mod Assistant to handle these links. 

If you're encountering problems with OneClick installs, I'd recommend turning off the OneClick support from whichever application you don't want handling your installs. This is still in preview so if you encounter problems, please open an issue on GitHub with as much detail as you can.

