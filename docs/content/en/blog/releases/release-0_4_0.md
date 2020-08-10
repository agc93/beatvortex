---
title: "Alpha 4 Release"
linkTitle: "Release 0.4.0"
date: 2020-08-10
aliases:
  - /updates/zirconium
  - /updates/v0.4.0
description: >
  Alpha release of BeatVortex
---

{{% pageinfo %}}
This release is now available [on Nexus Mods](https://www.nexusmods.com/site/mods/96?tab=files).
{{% /pageinfo %}}

This release marks the next full alpha of the BeatVortex extension. If you can install and test this extension, all feedback (on Nexus Mods or GitHub) is very appreciated!

This release adds some big new features and fixes to the previous alpha releases including:

- BeatMods updates and categories for everyone
  - We've promoted BeatMods update and categories support out of preview features and they're now enabled by default for all users
- BSIPA integration improvements
  - There's been more tweaks and improvements to the BSIPA integration
  - Thanks to improvements in Vortex, we now automatically disable BSIPA's auto-updates when you launch Beat Saber from Vortex
  - See below for more info on the BSIPA changes
- New Sync feature in preview
  - The new Sync view will let you easily sync your BeastSaber bookmarks to your local library without leaving Vortex
  - You can enable this from the Interface tab in Settings.
  - See below for more info on this
- New BSMG Services dialog
  - If you're having issues downloading mods or maps from any of the BSMG sites (BeatMods, BeatSaver, ModelSaber etc), there's a new dialog to let you know when those services are down or degraded.
  - Check the global menu (three dots in the top right of the Vortex window) to find it.
- Plenty of other improvements and fixes
  - We now limit concurrent downloads from BeatSaver to avoid hitting limits (and not overload it!)
  - Playlist manager<sup>preview</sup> should be much more stable now
  - We've cleaned up a lot of old features that weren't in use anymore
  - Some UI components (especially Playlists and Sync) should now be much faster and more intuitive

A lot of the changes introduced in this release require some new features and fixes only available in Vortex 1.3 and above. As such, this version is **only** supported in Vortex 1.3.x. If you're still using Vortex 1.2.x, you can continue using BeatVortex 0.3.9. Check [this post](/blog/2020/07/22/vortex-beatvortex-and-updates/) for more information on how we're handling supported updates.

### BSIPA integration

As covered in the [documentation](/docs/usage/bsipa/), BSIPA has a lot of extra features that overlap a bit with some of BeatVortex's features. In particular, BSIPA has its own game update handling and automatic mod updates that will conflict with Vortex and can lead to some odd stuff™.

To make this easier, we now disable BSIPA's plugin updates by default *when launching the game through Vortex*. You can control which BSIPA features are enabled using the toggles in the Workarounds tab of your Vortex settings. If you want these toggles to apply when launching the game directly (or through Steam), enable the *Apply these settings to the BSIPA configuration file* option in Workarounds.

> See the [BSIPA docs page](/docs/usage/bsipa) for more information on this feature

### Sync <sup>preview</sup>

The new Sync view is available as a preview feature that can be enabled in your *Interface* settings. You can use this new view to automatically download and install maps you bookmark on BeastSaber to your local mod library.

You will need to configure your BeastSaber username in Settings first, then you can use the **Sync** button to fetch your bookmarked maps and **Install** to immediately download and install any unsynced maps. Your bookmarks will also be automatically added to a *Bookmarks* playlist.

If you are already using BeatSyncConsole, *keep using it*! BeatSyncConsole is dramatically more full-featured, flexible and configurable than BeatVortex's Sync. The Sync view is an alternative for those who want a simpler way of downloading bookmarks without needing to set up or run an external tool.