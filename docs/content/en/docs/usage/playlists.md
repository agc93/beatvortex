---
title: "Installing Playlists"
linkTitle: "Playlists"
weight: 40
description: >
  How to install and view map playlists in Vortex.
---

{{% pageinfo %}}
BeatVortex 0.3.1 or later is required to install playlists using Vortex.

If you're currently using Beatlist for playlists, see below for extra information.
{{% /pageinfo %}}

Playlist support in BeatVortex is very new and very experimental! The notion of playlists isn't something that easily maps into the Vortex way of handling things so there might be some rough patches.

## Enabling Playlist Installation

To enable installing playlists with Vortex, check the "Enable OneClick links for playlists" option in the Download tab of the Settings page. When you click a OneClick link for a playlist, it should be automatically downloaded and installed into Vortex and will give you the option of immediately installing all the maps from that playlist. 

> This can take a while for large playlists! Check the Downloads page to see your progress.

Playlists will have their own entry in your Mods list so you can edit or remove the playlist without affecting all the songs in the playlist.

### Preview Feature: Playlists view

We have also included a *very* early release of a basic Playlists management interface as a preview feature in the latest extension versions.

To enable it, head over to the Interface tab of the Settings page and look for "BeatVortex Preview Features". Check "Enable Playlists Management" on to enable the new interface, and you should see the new page appear in the sidebar.

> Sometimes you'll need to open your Mods list again to have it show up!

This will allow you to quickly list and inspect the playlists you have installed and deployed locally, as well as check the details of any songs included in the playlist. You can also use the button at the top right to immediately install the whole playlist (or just the maps you don't already have).

This feature is *very new* and there's certain to be some bugs. If you do enable the feature and encounter any bugs, please report them [on GitHub](https://github.com/agc93/beatvortex/issues).

## Beatlist Users

If you're currently using Beatlist for managing your playlists, I *strongly* recommend sticking with it! BeatVortex will likely never support the same features as Beatlist, nor have the same level of polish or user-friendliness.

If you do want to use Vortex to manage your playlists, just be aware that enabling playlist handling in your Vortex settings will stop Beatlist from automatically handling playlist install links (it will also prevent Mod Assistant from handling them). You **should** be able to continue using Beatlist to view and manage your playlist library, but this has not been tested (at all!) and might lead to some weirdness.

## Mod Assistant Users

If you're currently using Mod Assistant to install your playlists, you should also be aware of a few things:

- Enabling playlist link handling in your Vortex settings will likely prevent Mod Assistant from handling those links.
- Installing a playlist with Vortex will separately install each song in the playlist as a manageable mod in Vortex. Your mod list could get very long, very fast.
