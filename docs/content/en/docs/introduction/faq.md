---
title: "Frequently Asked Questions"
linkTitle: "FAQ"
weight: 20
---

Below is a collection of frequent questions and the best answers I can give.

### Why do I need Vortex for this?

You don't! If you prefer using any of the other community-provided mod tools (like Mod Assistant), I recommend using them! In fact, Mod Assistant provides a few features that BeatVortex/Vortex (or Nexus Mods) simply doesn't support, and the two tools work in fundamentally different ways.

BeatVortex is just an alternate method of installing mods for those who are more familiar with Vortex already.

### Why not just use Mod Assistant?

See above ⬆. Use what you prefer! Prefer the familiarity of Vortex? Use BeatVortex. Prefer the extra features of Mod Assistant? Use that. Got your own set of tools? Use those.

In fact, generally speaking, you should be able to use BeatVortex alongside those other tools without any major problems.

### I’m a mod/pack author, how do I make mods compatible with Vortex?

They probably already are! If you want to maximise support and avoid some issues, pack your mod archive in such a way that the root of the archive should end up at the root of the install directory (for mods, not maps), and that’s basically it. There's a little more detail in [the developer docs](/docs/developer/authoring) as well.

> A special note for BeatSaver maps: if users download a map from BeatSaver and install it with BeatVortex, it will actually hit BeatSaver's API to get the proper name to keep those mod lists neat. The directory in the install folder will have a terrible name, though.

### Why can’t I download mods from the Nexus?

Nexus Mods doesn’t support Beat Saber mods (and most likely never will), so you will not be able to download mods from the Nexus website. You can, however, download from BeatMods or BeatSaver and install in Vortex.

### What's the deal with game versions? Why do I have to choose my version?

Now that's a saga of a question. There's two reasons we have to do this: compatibility and BeatMods being BeatMods.

The first (and major) point is that BeatVortex can't tell which versions are forward compatible. That is, *we* know that mods for 1.8.0 work in 1.9.0, but BeatVortex doesn't have any easy way to tell that. So if there's not an exact match to your installed version, we ask you to choose.

The other (unfixable from our end) problem is that the BeatMods API has a very [weird bug/behaviour](https://github.com/bsmg/BeatMods-Website/issues/41) that means we somehow have to know what game version the mod uses in order to find out what game version the mod uses. This is also why we don't display what game version an installed mod uses: the BeatMods API tells us the completely wrong version.

### I installed a `dll` file I downloaded and it's not working!?

Vortex's whole design is built around mods being part of an archive file. As such, when you try and install a `dll` file on its own, Vortex won't know what to do and will usually try and *extract* the DLL looking for the mod inside.

To install `dll` files you get from GitHub, Discord, or anywhere else, add them to a ZIP file first (right-click -> *Send to* -> *Compressed (zipped) folder* on Windows), then install the ZIP file. Vortex will take care of the rest, including placing the plugin file in the correct place when you deploy.

### None of my mods are installed suddenly? Where did they go?

This can happen for a few reasons, most commonly an update for Beat Saber or if you verify/reinstall/move the game in Steam. First, *run Beat Saber at least once*. After any update, you need to run Beat Saber at least once to update a few important files.

Next, purge your mods using the Purge button in the Mods list. Once that's complete, make sure the right mods are installed, enabled and up-to-date, and click Deploy Mods. Vortex will redeploy your enabled mods into your game's install directory.

### Are mod dependencies supported/installed?

Dependencies is a tricky area for a few reasons, and driven by two different problems: Vortex support and the BeatMods API.

> If you want the full technical breakdown, check out the full [developer docs on dependencies](/docs/developer/dependencies/).

As of v0.3.1, dependencies support is available and enabled by default: dependencies are shown in the Mods list and BeatMods browser, and we will attempt to automatically download and install them when you install any mod from BeatMods. However, this hasn't been fully tested and might still have some quirks or errors.

### Are mod updates supported?

Mod updates are an in-progress feature! As of v0.3.3, we have preview support for installing updates for BeatMods mods using Vortex. Check the [usage docs](/usage/mods) for more information.

This is still a preview feature as non-Nexus updates is pretty new ground for Vortex, and I haven't been able to test it that thoroughly. Also, BeatMods is a wild mess of inconsistent logic which makes things a bit less simple.