---
title: "Installing Mods"
linkTitle: "Installing Mods"
weight: 20
description: >
  How to install, view and manage your mods in Vortex.
---



{{% pageinfo %}}
BeatVortex 0.2.1 (and later) includes beta support for prompting when an IPA patch is needed and automatically running it.

If you haven't already run IPA for your current install, you should be prompted to run it after your first deploy.
{{% /pageinfo %}}

At it's core, installing mods is roughly the same as any Vortex-enabled game, just without the convenience of installing from Nexus Mods. Make sure you've added Beat Saber as a managed game in Vortex.

If you haven't already, open the Games screen and click the **Manage** button on the Beat Saber icon under *Unmanaged*

---

There's a few main ways to install mods:

- OneClick installs<sup>*preview*</sup> 
- BeatMods Browser
- Download in Vortex
- Install from archives

## OneClick Installation<sup>*preview*</sup>

One-click installation of custom songs from BeastSaber, BeatSaver or ModelSaber requires first enabling it in your Vortex settings.

> Enabling one-click installs in Vortex will most likely prevent Mod Assistant from handling one-click installs!

From the Settings screen, open the Download tab and scroll down to the "Enable OneClick Installations" section. Check the boxes to enable OneClick installations for maps or custom models (or both!). You can also toggle these back off to "unregister" Vortex for handling these links.

![installation process][enableOCI]

[enableOCI]: /enableOCI.gif
[beatModsInstall]: /installBeatMods.gif

> You *should* see this change immediately, but if you're having problems, try restarting Vortex

Open up BeatSaver/BeastSaber/ModelSaber and click any of the OneClick install links: Vortex should pick up the link in the background, fetch the song details and download the map (or mod) directly into your mod list. Install and Enable as per usual to deploy into your game.

#### A note on ModelSaber installs

Since ModelSaber models are not distributed as archives but just raw files, Vortex will warn you and will create a mod archive with just that one file. All of Vortex's install and deployments logic really works best with archives.

## BeatMods Browser

If you're looking to install any of the mods listed on BeatMods, you can easily do so from the BeatMods page in the sidebar (available from v0.2.0 onwards). This will list all approved mods for your current game version and you can quickly install them using the *Ready to Install* button on the right.

Note that since Vortex can't tell which Beat Saber versions are mod-compatible (i.e. 1.8.0 mods work in 1.9.0), you may have to manually choose a version using the switcher at the top of the page to see all available mods.

> BeatVortex *should* automatically prompt you to install dependencies when you install BeatMods mods from the browser. You can also check the Dependencies column of the Mods list to see what your mods need.

![beatmods installation][beatModsInstall]

## Download in Vortex

Once you've added Beat Saber, you can jump over to the usual Mods screen using the menu on the left. You might not have any mods here, but if you click on the *But don't worry, I know a place...* dropdown, you'll get the choice of installing from BeatMods, BeatSaver or BeastSaber.

> This option will move to the *Get more mods* drop-down after you have installed your first mod.

You can browse mods using the built-in browser that appears and if you download the ZIP archive of any song (from BeatSaver/BeastSaber), mod (from BeatMods), or model (from ModelSaber), Vortex will attempt to install it in the background for you. Close the browser to go back to your mod list then Install and Enable your mods as usual to use them in-game.

## Install from archives

You can also download mod/map archives directly from BeastSaber, BeatSaver, BeatMods or anywhere else you like and install them with Vortex. Simply use the *Install From File* button in the toolbar or drop them onto the drop zone at the bottom of the Vortex window.

> Be aware that installing from archives will often not include the full metadata so mods may be confusingly named. Double-click the mod in the mod list to change its name.

Please note that "raw" mods that aren't packaged in an archive (for example, the dll files provided by some GitHub projects) will probably not work properly. Only archives are fully supported at this time.

## Updating Mods

At current, BeatVortex doesn't provide any update capability for Beat Saber mods. That being said, BSIPA *should* automatically keep your mods updated on launch. Pending some changes to Vortex (and potential future reworks of BeatMods), we aim to add some improved updates support in future releases.

> If BSIPA installs an update for a mod, the version you see in-game and the version you see in Vortex might not be the same anymore. Reinstall the updated mod from Vortex if you want the numbers to match.
