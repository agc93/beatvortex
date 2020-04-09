---
title: "Developer Guide"
linkTitle: "Development"
weight: 99
description: >
  An introduction to BeatVortex's design and how to contribute.
---

BeatVortex is fully **open-source**! You can see the full code for the extension (including these docs) [on GitHub](https://github.com/agc93/beatvortex). Community contributions, fixes and PRs are all welcome! That being said, please read the info below to make all of our lives a bit easier.

## Licensing

BeatVortex is made available under an [MIT License](https://opensource.org/licenses/MIT). That means all contributions will also be licensed under the MIT License and all the conditions and limitations that involves.

## Development Environment

To work with the BeatVortex code, you'll only need Node.js (including a recent version of `npm`) and TypeScript installed. Development so far has been done in Visual Studio Code, but any IDE that supports TypeScript should work just fine.

> Since version 0.1.1, the code base is almost completely documented with tsdoc annotations!

### Getting set up

Whether you are developing on the same machine that Beat Saber and Vortex are installed on or not, the easiest way I have found to work with this has been to [install BeatVortex manually](/docs/usage/installation/#manual-installation), then whenever I make a change simply drop my rebuilt `index.js` into the `game-beatsaber` folder and restart Vortex.

You can find Diagnostics Logs in the overflow menu at the top right of the Vortex window.

### Continuous Integration

Note that all commits to, and pull requests against, the `master` branch are automatically built as part of a GitHub Action. Please don't add unnecessary changes to the Actions workflow without prior discussion.

## Feature Requests

BeatVortex is a community project, currently built and maintained by a single non-developer. As such, feature requests will be accepted, but I can't provide any level of assurance that any requests will certainly be included. Also remember that we are limited to features that Vortex can reasonably support. Open [an issue on GitHub](https://github.com/agc93/beatvortex/issues/new) to discuss viability of any requests.

## A note on confusing code

For anyone who decides to wade into the BeatVortex code, there's a few things worth remembering:

1. **I'm not a developer**: This is just something I'm doing in my spare time, so don't expect super-high-quality code. I'll happily take fixes, though!
1. **Working with Vortex is weird**: There's quite a few quirks of the codebase that exist because of unfathomably mystifying behaviour in Vortex's extension API.
1. **There are definitely missing edge cases**: This started out as a basic prototype, so error handling and edge cases are definitely not at the standard we'd like.
