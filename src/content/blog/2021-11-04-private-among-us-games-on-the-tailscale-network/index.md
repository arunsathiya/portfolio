---
title: 'Private Among Us games on the Tailscale network'
seoTitle: 'Private Among Us games on the Tailscale network'
slug: 'private-among-us-games-on-the-tailscale-network'
description: 'Learn how to setup private Among Us games using Impostor and Tailscale. This enables you to host custom games without depending on the official servers.'
pubDate: 'Nov 03 2021'
updatedDate: 'Aug 24 2024'
tags: ['Tools', 'Automation']
coverImage: './image.webp'
---

Among Us can be hosted on the public servers. Games can be private or public, but the problem with public server-hosted games is that, games disconnect sometimes. That's because these public servers are popular that it doesn't handle surge in active sessions. A solution is to host the games locally on a private network.

That's where Impostor and Tailscale come in.

[Tailscale](https://blogarunsathiya.wordpress.com/tag/tailscale/) is a mesh VPN software that makes it incredibly easy to connect all of your devices and services running on those devices. [Impostor](https://github.com/Impostor/Impostor/) is an open source re-implementation of the [Among Us](https://www.innersloth.com/games/among-us/) server that can be self-hosted on any device. In my case, I am hosting Impostor on my Raspberry Pi, which is linked to my Tailscale tailnet. This unlocks all of my devices on the tailnet to access Impostor too.

## Setting up Private Among Us Games

[The first step is to install Tailscale on all of your devices](https://tailscale.com/kb/1017/install/) and connect them to the same Google, GitHub, or supported auth provider account. This ensures all of the devices are in the same tailnet. Use the same Tailscale account for your Tailscale installation on the Raspberry Pi too.

Install Impostor on the Raspberry Pi. The process involves installing Dotnet runtime (in my case, I installed the full SDK), installing the server build, modifying the configuration file to set the Raspberry Pi's Tailscale node address as the public server and running the server itself. To elaborate a bit,

- Install Dotnet SDK/runtime on the Raspberry Pi using instructions here: [Deploy .NET apps to Raspberry Pi](https://docs.microsoft.com/en-us/dotnet/iot/deployment).
- Download the server build from here: [Impostor Releases](https://github.com/Impostor/Impostor/releases). [You can use wget to download](https://www.gnu.org/software/wget/manual/wget.html), [tar to extract](https://linuxize.com/post/how-to-extract-unzip-tar-gz-file/) and [nano to edit](https://www.nano-editor.org/dist/v2.2/nano.html) the `config.json` file.
- In the `config.json` file, modify `PublicIp` and `ListenIp` to your Raspberry Pi's Tailscale node address. In my case, it's `100.127.71.62`.
- Finally, run `./Imposter.Server` to start this custom Among Us Server.
  Other devices can join this custom Among Us server by following the instructions on [this page](https://impostor.github.io/Impostor/).

Finally, anyone can start the game, mark it as `Public` and then other devices can join this public room. Make sure that the "World" in your "Online" mode is set to "Impostor", not "Asia", "Europe" or "Americas".

![image.png](https://portfolio.75d17a47b6c80ac40b0e7e44a4a8517d.r2.cloudflarestorage.com/blog/assets/private-among-us-games-on-the-tailscale-network-039db48d-d183-45f4-b9e7-a52ca42cdbd0.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=8367778c331a87824282df96c3af94ca%2F20240825%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20240825T060504Z&X-Amz-Expires=3600&X-Amz-Signature=67a94c4af797dbfbec4f81c2bd5b9d111055d344990738146359b01cb0cf14a7&X-Amz-SignedHeaders=host&x-id=GetObject)

![image.png](https://portfolio.75d17a47b6c80ac40b0e7e44a4a8517d.r2.cloudflarestorage.com/blog/assets/private-among-us-games-on-the-tailscale-network-954b6a83-28b1-4707-9dda-d263dd8a5dd8.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=8367778c331a87824282df96c3af94ca%2F20240825%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20240825T060505Z&X-Amz-Expires=3600&X-Amz-Signature=c958f7d821d28e7abc2a24e252c40628c5b299143408fd5b0e6c05bf58ecb0c0&X-Amz-SignedHeaders=host&x-id=GetObject)

![image.png](https://portfolio.75d17a47b6c80ac40b0e7e44a4a8517d.r2.cloudflarestorage.com/blog/assets/private-among-us-games-on-the-tailscale-network-43079733-26cb-4f4a-b37f-b2ce47640f60.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=8367778c331a87824282df96c3af94ca%2F20240825%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20240825T060505Z&X-Amz-Expires=3600&X-Amz-Signature=b54d0965ad3214ef0cdc6665ed5718548efbc25860905b0f361693433b64a956&X-Amz-SignedHeaders=host&x-id=GetObject)

![image.png](https://portfolio.75d17a47b6c80ac40b0e7e44a4a8517d.r2.cloudflarestorage.com/blog/assets/private-among-us-games-on-the-tailscale-network-ad192dfe-ca42-414e-958c-c99ceaf84bdf.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=8367778c331a87824282df96c3af94ca%2F20240825%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20240825T060506Z&X-Amz-Expires=3600&X-Amz-Signature=c1c2046dddf0ec77684746df6af823a3b4a00cf7b17b841decf7389dfd8c3544&X-Amz-SignedHeaders=host&x-id=GetObject)

## Other notes

It's okay to disclose the Raspberry Pi Tailscale node address to the public as it's of no one for anyone else. It can be accessed only if the device is connected to my Tailnet, which requires authenticating using my GitHub account. I have also locked down that node's port 22023 to be accessible only by certain devices using Tailscale Access Control Rules. And, ACLs also help make sure other devices can access only this port on my Pi. They wouldn't be able to access services that I run on other ports.

Right now, it's just my family that can access this port on my Raspberry Pi (called `mewtwo`):

```text
{ "Action": "accept", "Users": ["group:arun-family"], "Ports": ["mewtwo:22023"] }
```

With this setup, anyone from any part of the world can join your custom Among Us games without depending on the official Among Us servers. I also learned that switching from WiFi to mobile data doesn't disconnect the game. I imagine that's possible due to Tailscale's graceful handling of network changes.