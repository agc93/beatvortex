---
title: "Alpha 3 Release"
linkTitle: "Release 0.3.0"
date: 2020-12-12
description: >
  Alpha release of BeatVortex
---

{{% pageinfo %}}
This release is still in development, and available for testing using the [GitHub CI Builds](https://github.com/agc93/beatvortex/actions/)
{{% /pageinfo %}}

This release marks the next full alpha of the BeatVortex extension. If you can install and test this extension, all feedback (on Nexus Mods or GitHub) is very appreciated!

This release adds some big new features and fixes to the previous alpha release including:

- Dependency tracking! Vortex will now warn you about missing dependencies when you install BeatMods mods.
- Integrated OneClick Settings: settings to enable/disable OneClick link handling has been moved into the Settings page, on the Download tab.
- Automatic BSIPA **un**patching: Vortex will now prompt you to revert BSIPA when you purge mods to restore things to default properly.
- New reworked installation logic to cut down on errors and improve metadata.

### On Dependencies

As covered in the [developer docs](/docs/developer/dependencies), dependencies is a trickier problem than you'd think. As of 0.3.0, Vortex will warn you about missing dependencies and let you check dependencies for individual packages. It will *not* automatically install them for you! We're hoping to add this to a future release, but this also requires some changes on the Vortex side of things.

### A note to Mod Assistant users

In the pre-alpha release, Mod Assistant and BeatVortex had no real overlap so there was no compatibility concerns. With the new OneClick support<sup>preview</sup>, we finally have our first real compatibility point: who gets launched when you open a OneClick link. Ideally, BeatVortex should not pick up OneClick links until you specifically turn it on in your settings and restart Vortex. Likewise, once you've turned it on, Vortex **should** *replace* Mod Assistant to handle these links. 

If you're encountering problems with OneClick installs, I'd recommend turning off the OneClick support from whichever application you don't want handling your installs. This is still in preview so if you encounter problems, please open an issue on GitHub with as much detail as you can.

