---
title: "BeatVortex for Mod Assistant Users"
linkTitle: "Switching from Mod Assistant"
weight: 90
description: >
  A guide on using BeatVortex (and Vortex) for regular Mod Assistant users.
---

First and foremost, the best advice for Mod Assistant users is this: if you don't want to change, **you don't have to!**

BeatVortex is a completely unofficial project and is **not** intended as a replacement to Mod Assistant, which is also a very good way of handling Beat Saber mods. If you're happy with Mod Assistant and don't have any preference for using Vortex, don't feel like you need to make the switch!

{{% pageinfo %}}
This document assumes a basic understanding of Vortex and its concepts.

For help with Vortex, check out the [Vortex Support page](https://www.nexusmods.com/about/vortex/) or use the Knowledge Base page inside Vortex.
{{% /pageinfo %}}

## Basic Differences

One of the biggest differences when modding Beat Saber with Vortex is a consequence of how Vortex works: *everything is a mod*.

That means that when using BeatVortex, every map is a mod, every custom saber is a mod, every playlist is a mod, and every plugin is a mod. While that sounds daunting, it also means you can easily manage every part of your installation from the one place.

In particular, even songs installed using OneClick links will install as a fully manageable mod in Vortex that can be enabled, disabled and deployed to your install directory like any other mod.

### State and Deployments

The other thing worth remembering if you're coming from Mod Assistant is that everything you do in Vortex happens in a staging folder first. Your mods and maps are all installed and enabled from your staging folder. It's not until you *Deploy* your mods that the changes happen in your installation directory.

For example, when Mod Assistant starts up it loads your current mods directly from the installation directory each time. In Vortex, your Mods list is the state of your staging folder and your changes are made to the installation directory when you deploy your mods.

### OneClick Installation

We have added *preview* support for OneClick installation links for maps, custom models and playlists, but this is a quite new feature! They are also not enabled by default: you can enable OneClick links for any specific mod type (or all of them) from the Download tab of your Vortex settings.

Unlike Mod Assistant, which doesn't "track" maps or playlists installed with OneClick links, Vortex will handle OneClick links like any other installation: the map/model/mod is installed as a complete mod, manageable from your Mods list and then deployed to your install directory.

### BSIPA

Mod Assistant installs mods into a special `IPA/Pending` folder and BSIPA then "installs" them into the main game directory. Vortex installs its files into the mod staging folder, then deploys them directly into the game install folder. This means that while you can install new mods or updates into your Vortex while Beat Saber is running you shouldn't deploy them.

> In fact, if you launched Beat Saber with Vortex, it will pause deployments until you close the game.


## Compatibility

While I don't recommend it, it should be possible to use BeatVortex *alongside* Mod Assistant, BeatList or any other modding tools. This is not something I actively test and Vortex will likely react in funny ways to changes made by the other tools, but it shouldn't break anything major.

> If you do end up using BeatVortex side-by-side with Mod Assistant or other tools, please report any issues you see.

Of particular note: only enable OneClick links in **one** tool. If you want to use Mod Assistant to install maps with OneClick, enable it in Mod Assistant's settings and **do not** enable it in Vortex's settings.

## Support

As covered in the [FAQ](/docs/introduction/faq), BeatVortex is not supported by any of Nexus Mods, the Vortex team, or the Beat Saber Modding Group. BeatVortex is exclusively a community project, currently run by one not-a-real-developer, so please don't complain to anyone from Nexus or BSMG if things don't work quite right.