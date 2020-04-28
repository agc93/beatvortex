---
title: "Frequently Asked Questions"
linkTitle: "FAQ"
weight: 20
---

Below is a collection of frequent questions and the best answers I can give.

### Why do I need Vortex for this?

You don't! If you prefer using any of the other community-provided mod tools (like Mod Assistant), I recommend using them! In fact, Mod Assistant provides a few features that BeatVortex/Vortex (or Nexus Mods) simply doesn't support, including dependency resolution.

BeatVortex is just an alternate method of installing mods for those who are more familiar with Vortex already.

### Why not just use Mod Assistant?

See above ⬆. Use what you prefer! Prefer the familiarity of Vortex? Use BeatVortex. Prefer the extra features of Mod Assistant? Use that. Got your own set of tools? Use those.

In fact, generally speaking, you should be able to use BeatVortex alongside those other tools without any major problems.

### I’m a mod/pack author, how do I make mods compatible with Vortex?

They probably already are! If you want to maximise support and avoid some issues, pack your mod archive in such a way that the root of the archive should end up at the root of the install directory (for mods, not maps), and that’s basically it.

> A special note for BeatSaver maps: if users download a map from BeatSaver and install it with BeatVortex, it will actually hit BeatSaver's API to get the proper name to keep those mod lists neat. The directory in the install folder will have a terrible name, though.

### Why can’t I download mods from the Nexus?

Nexus Mods doesn’t support Beat Saber mods (and most likely never will), so you will not be able to download mods from the Nexus website. You can, however, download from BeatMods or BeatSaver and install in Vortex.

### Why aren't dependencies supported?

This answer is a little technical, and driven by two different problems: Vortex support and the BeatMods API.

In short, Vortex doesn't really *natively* support dependency resolution for mods. Vortex's dependency management pretty much **only** works with Nexus Mods, meaning BeatVortex would have to do a *lot* of dependency logic during install, which leads to the other problem.

The BeatMods API, for reasons likely lost to time, returns dependencies from the API in a super-weird way: top-level dependencies are fine, but *their* dependencies are only returned as document IDs, meaning we can't easily go from a single API call to a full dependency tree.

> Dependencies are *shown* in the BeatMods browser, but we don't automatically install them.

### Why aren't updates supported?

This has the same two problems as dependencies: Vortex and BeatMods

Vortex does natively support updates, but at current the only update implementation available (that I know of) is using Nexus Mods, which we obviously don't have. That means having to reverse engineer how Nexus handles triggering mod updates which is a) an absolute shitton of work and b) difficult with BeatMods.

> The Nexus integration for Vortex is over 4000 lines of code. If anyone wants to volunteer to work out how the fuck that works, I'd be happy to accept PRs!