# BeatVortex: Beat Saber support for Vortex

This extension adds support for Beat Saber mods to the Vortex mod manager.

> This project doesn't replace Mod Assistant! It can be used alongside it, and lacks many of Assistant's unique features.

## What is it?

BeatVortex is a simple Vortex extension that adds support for Beat Saber mods so that you can install game mods and custom songs using the Vortex mod manager.

Using BeatVortex, you can install, manage, track and uninstall mods for Beat Saber just like you install mod archives for any of the other Vortex-supported games. Note that this comes with a few limitations:

- No one-click Nexus installs (Nexus Mods doesn't host Beat Saber content)
- No dependency resolution (Vortex doesn't do this)

## What isn't it?

First and foremost, this isn't a replacement for any of the other amazing modding tools available for Beat Saber on PC (in particular, Mod Assistant). This project exists only as a simpler way of installing and managing mods for players who are already familiar with Vortex usage.

## How to use it?

There's a heap of documentation, including detailed guides on getting started with BeatVortex, in our [online docs](https://beatvortex.dev/docs/). Essentially, you'll just need to install an extension for Vortex, then you're ready to start installing and managing your mods.

## FAQ

#### Why do I need Vortex for this?

You don't! If you prefer using any of the other community-provided mod tools (like Mod Assistant), I recommend using them! In fact, Mod Assistant provides a few features that BeatVortex/Vortex (or Nexus Mods) simply doesn't support, including dependency resolution.

BeatVortex is just an alternate method of installing mods for those who are more familiar with Vortex already.

#### Why not just use Mod Assistant?

See above ⬆. Use what you prefer! Prefer the familiarity of Vortex? Use BeatVortex. Prefer the extra features of Mod Assistant? Use that. Got your own set of tools? Use those.

In fact, generally speaking, you should be able to use BeatVortex alongside those other tools without any major problems.

#### I’m a mod/pack author, how do I make mods compatible with Vortex?

They probably already are! If you want to maximise support and avoid some issues, pack your mod archive in such a way that the root of the archive should end up at the root of the install directory, and that’s basically it.

> A special note for BeatSaver maps: if users download a map from BeatSaver and install it with BeatVortex, it will actually hit BeatSaver's API to get the proper name to keep those mod lists neat.

#### Why can’t I download mods from the Nexus?

Nexus Mods doesn’t support Beat Saber mods (and most likely never will), so you will not be able to download mods from the Nexus website. You can, however, download from BeatMods or BeatSaver and install in Vortex.

---

**Disclaimer**: This project is not associated with any of the authors of Mod Assistant (or other modding tools/mods), nor with Nexus Mods.

**Credit**: This application contains the terms of use from the BSMG Wiki, and is reproduced under the terms of the CC BY-NC-SA license. The text contained in the terms of use is © 2019 Beat Saber Modding Group.