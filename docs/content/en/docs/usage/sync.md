---
title: "Bookmark Sync"
linkTitle: "Sync"
weight: 41
description: >
  How to sync your bookmarked maps with Vortex.
---

{{% pageinfo %}}
BeatVortex 0.4.0 or later is required to use the Sync view..

If you're currently using BeatSyncConsole for syncing, see below for extra information.
{{% /pageinfo %}}

The BeatVortex Sync view allows you to easily sync bookmarked maps from BeastSaber to your local library, directly from within Vortex.

This feature is *very new* and there's certain to be some bugs. If you do enable the feature and encounter any bugs, please report them [on GitHub](https://github.com/agc93/beatvortex/issues).

## Setting up

> This feature is available in v0.4.0 or later

The Sync view is new and hasn't been fully tested, so it has been included as a preview feature in 0.4.x releases. To enable it, head over to the Interface tab of the Settings page and look for "BeatVortex Preview Features". Check "Enable Bookmark Sync" on to enable the new interface, and you should see the new page appear in the sidebar (switch back to your Mods list if it doesn't immediately appear).

Also make sure to set your BeastSaber username in the Interface tab of your Settings!

## Syncing Bookmarks

You can now switch to the Sync view and wait for your bookmarked maps to be retrieved from BeastSaber. 

You can then use the Sync button to update your local *Bookmarks* playlist with your latest bookmarked maps (the playlist will be automatically created if this is your first run). The Install button will update your BeastSaber bookmarks and immediately download and install any unsynced maps.

> BeatVortex will not redownload maps that BeatSyncConsole has previously downloaded!

## BeatVortex or BeatSyncConsole?

If you're already using BeatSyncConsole, I *would not* recommend switching to BeatVortex unless you have a solid reason to. BeatSyncConsole is much more configurable, includes support for a multitude of different sources, and is widely used by the community. At this time, there are no plans to extend BeatVortex Sync with more sources or configuration as BeatSyncConsole is perfectly capable of handling that use case.

If you're not currently using BeatSyncConsole, or are looking for a simpler way of syncing bookmarks without needing an external tool, give BeatVortex's Sync a try. BeatVortex Sync gives you a simpler option, integrated with the rest of your mod management, available through a graphical interface, but without any of the advanced features or configuration of BeatSyncConsole.

In short, pick the best tool for your use case! That being said, **do not** use both at the same time. BeatSyncConsole won't know which maps BeatVortex Sync has already downloaded and will most likely download duplicates or run into conflicts.