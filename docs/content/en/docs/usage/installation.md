---
title: "Installing BeatVortex"
linkTitle: "Installation"
weight: 20
description: >
  Installing the BeatVortex extension into Vortex
---

## Installing BeatVortex

There's a couple of different ways to install BeatVortex! Unless you've got a pretty specific use case, you'll probably want one of the two automatic methods, but manual installation is available as well.

{{% pageinfo %}}
Most of the steps shown below will require Advanced Mode to be enabled in Vortex! 

Enable it in the Settings window, under Interface > Advanced > Enable Advanced Mode.
{{% /pageinfo %}}

### Automatic Installation

> This is the easiest way to install!

1. Open up Vortex, and open the Extensions panel from the left sidebar.
1. Click **Find more** to open the list of Extensions
1. Find **Beat Saber Support** and click *Install*
1. Wait for the extension to install and **restart Vortex** when prompted.

![installation process][install_1]

Once Vortex has restarted, just click the Manage button on Beat Saber in your Games screen and you're ready to [install some mods](/docs/usage/mods)!

[install_1]: /install_1.png

### Semi-Automatic Installation

If you can't install directly from the Extensions screen, you can instead install from the archive.

1. Download the archive from [Nexus Mods](https://www.nexusmods.com/site/mods/96?tab=files) or [GitHub](https://https://github.com/agc93/beatvortex/actions)
1. Open the Extensions panel in Vortex
1. Click on the *Drop File(s)* box in the corner and locate the archive you downloaded.
1. Wait for the extension to install and **restart Vortex** when prompted.

Once Vortex has restarted, just click the Manage button on Beat Saber in your Games screen and you're ready to [install some mods](/docs/usage/mods)!

### Manual Installation

> Only attempt this if you *absolutely* have to. It becomes much harder to debug and much harder to upgrade.

If you don’t want to enable Advanced Mode for Vortex or want to install the extension yourself, you will have to install the extension files manually. Make sure you close Vortex before proceeding.

First, download the archive from [Nexus Mods](https://www.nexusmods.com/site/mods/96?tab=files) or [GitHub](https://https://github.com/agc93/beatvortex/actions).

Next, unpack the archive to somewhere convenient. You should have a directory named `game-beatsaber` with three files inside:

- info.json
- index.js
- gameart.png

Now, copy the whole directory to your Vortex folder. You can easily open your Vortex folder by opening a new File Explorer window and entering the following in to the location bar: `%APPDATA%/Vortex` and then opening the `plugins` directory (create it if it doesn’t exist).

Once you’re done, you should have three files at the following locations:

```text
C:\Users\<your-user-name-here>\AppData\Roaming\Vortex\plugins\game-beatsaber\info.json
C:\Users\<your-user-name-here>\AppData\Roaming\Vortex\plugins\game-beatsaber\index.js
C:\Users\<your-user-name-here>\AppData\Roaming\Vortex\plugins\game-beatsaber\gameart.png
```

With those files in place, you're clear to start Vortex and you should see the Beat Saber icon in the Games screen light up.