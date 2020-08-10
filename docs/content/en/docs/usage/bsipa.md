---
title: "Beat Saber IPA (BSIPA)"
linkTitle: "Beat Saber IPA (BSIPA)"
weight: 35
description: >
  How to manage, configure and work with BSIPA.
---

[BeatSaber IPA (BSIPA)](https://github.com/bsmg/BeatSaber-IPA-Reloaded) is the mod loader used by Beat Saber mods. It's responsible for actually loading all the mods you install with Vortex and needs to be installed for other mods to work correctly.

Some of the features that BSIPA provides overlap a bit with Vortex and BeatVortex's feature sets, so it's worth knowing a few things first.

## Game Upgrade Detection aka Mod Yeeting

Plugin Yeeting refers to a feature in BSIPA intended to simplify game ugprades. When BSIPA detects that the game itself has been updated since BSIPA last ran, it will **move** all your installed plugins into a special folder in your install directory to ensure that incompatible mods aren't loaded after an upgrade. This process is called "yeeting".

While this isn't a problem if you're manually installing mods (or presumably using Mod Assistant), when BSIPA does this Vortex will lose track of the files it deployed to the install directory and think you deleted them. If BSIPA does "yeet" your mods, you'll see a dialog in Vortex asking you whether you really want to delete all the files in your mod folders (no, you don't).

BeatVortex will now also detect when Beat Saber has been upgraded and offer to disable all your currently installed mods (except for BSIPA) until you can run your game (thus updating BSIPA) and you can then re-enable your mods once you've verified they are compatible with the latest game version.

> You can also disable BSIPA's handling completely using the toggle in the Workarounds tab of your Settings, but we don't recommend it.

## Plugin/mod Updates

Also, by default, BSIPA will auto-update your mods when you launch the game. While this won't bother Mod Assistant, this means that the mods in your install directory won't be the same ones Vortex put there. This means a) your in-game mods might not be the same versions you have installed with Vortex and b) Vortex might ask you to save/revert changes made by BSIPA when you next deploy.

Like with OneClick installs, things will go a lot smoother if you have only one app handling updates, so we recommend disabling updates in BSIPA or in BeatVortex depending on which one you want handling updates.

When you launch Beat Saber from Vortex, we automatically disable BeatMods's automatic updates, but this will only apply when launching from Vortex by default (see below).

## Configuration Tweaks

> This feature is available in [v0.4.0](/updates/v0.4.0) or later

Since these overlapping areas can sometimes cause problems, BeatVortex includes the ability to apply overrides/tweaks to the BSIPA configuration file when you deploy your mods. Check the Workarounds tab of the Settings page to find them. Enabling these tweaks will change how BSIPA works when you launch the game.

Disabling plugin yeeting is the equivalent of setting `YeetMods` value of the configuration file to `false`, disabling BSIPA's plugin yeeting entirely. We don't recommend using this unless you are running into problems as BeatVortex's own game update detection should help you through the upgrade process without getting in BSIPA's way.

Disabling plugin auto-updates will set the `Updates.AutoCheckUpdates` and `Updates.AutoUpdate` values of the configuration file to `false`, disabling BSIPA's automatic plugin updates entirely. We recommend turning this on **if** you're using Vortex to handle your BeatMods plugin updates as it will mean that your installed version is the version you see in-game, and BSIPA won't update mods that you haven't updated in Vortex.

### Configuration File

By default, enabling the tweaks above will **only** affect Beat Saber when launched from Vortex, not from Steam or anywhere else. If you want the same behaviour when launching from Steam or your Start menu as you get when launching from Vortex, Vortex can also apply these tweaks to your `Beat Saber IPA.json`. If you enable the *Apply these settings to the BSIPA configuration file* tweak in your Workarounds tab, Vortex will automatically apply any of your chosen BSIPA changes to your configuration file next time you deploy, ensuring the behaviour is the same, whether you launch from Vortex or not.


