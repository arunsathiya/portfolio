---
title: 'Free, private pi-hole hosting with Fly.io and Tailscale'
seoTitle: 'Free, private pi-hole hosting with Fly.io and Tailscale'
slug: 'private-pi-hole-hosting-fly-tailscale'
description: 'Fly.io'
pubDate: 'Nov 21 2021'
updatedDate: 'Aug 24 2024'
tags: ['Tools', 'Automation']
coverImage: './image.webp'
---

Hosting a network-wide pi-hole for ad-blocking is easy. It comes with a one-step installation guide that you can run on most environments. [I run two pi-holes at my house](https://blogarunsathiya.wordpress.com/2021/09/27/tailscale-tls-certificates-for-my-home-lab/), but the problem with my setup is, if my internet drops, both pi-holes stop working too. Ideally, I'd need to have a pi-hole outside my house, preferably where internet doesn't go down at the same time as my provider.

That's where a cloud-hosted pi-hole proves helpful.

I learned about Fly.io recently. It's an app hosting platform that makes it incredibly easy to deploy apps to multiple regions and scales as needed. [Their free tier offers a generous 2,340 hours per month of uptime](https://fly.io/docs/about/pricing/), which translates to about 3 shared-cpu-1x VMs with 256MB RAM full time. My pi-hole consumes about 200MB RAM consistently, so this means I could host upto 3 apps each with pi-hole on it. But I have only one as I have two others at my house.

![image.png](https://portfolio.75d17a47b6c80ac40b0e7e44a4a8517d.r2.cloudflarestorage.com/blog/assets/private-pi-hole-hosting-fly-tailscale-1724563683153.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=8367778c331a87824282df96c3af94ca%2F20240825%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20240825T052803Z&X-Amz-Expires=3600&X-Amz-Signature=395be3a07b6a69c89c955e872e823a55b3c49acede04c7543e8fe06dbd4ffd80&X-Amz-SignedHeaders=host&x-id=GetObject)

## Setting up the pi-hole

[This Fly blog post](https://fly.io/blog/stuff-your-pi-hole-from-anywhere/) already documents how you can run a pi-hole in a few steps, but there is a problem with this setup: the pi-hole will be publicly query-able by anyone on the internet. We don't want that because [a public, open DNS resolver is not a good idea](https://serverfault.com/a/634794). We'll need to lock this down using a secure tunnel that's accessible only to you.

## Locking down pi-hole access with Tailscale

If you are following my blog, you'd know by now that I am a [Tailscale](https://blogarunsathiya.wordpress.com/tag/tailscale/) fan. It's an easy, useful mesh VPN software that you can add to most devices that you have. For the pi-hole on Fly.io setup, I followed the same guide as Fly documented, but in the Dockerfile configuration, I replaced `eth0` with `tailscale0` so that my pi-hole listens for queries only on the Tailscale network.

With that image deployed, I SSH'd into the Fly instance and installed Tailscale using the Debian installation guide here: [Install Tailscale on Linux](https://tailscale.com/kb/1031/install-linux/). That's not quite easy though. [I had to use legacy iptables](https://github.com/hassio-addons/addon-tailscale/issues/20#issuecomment-929104783) and then run `./tailscaled &` under `usr/sbin` folder. From there, I could run `sudo tailscale up`.

Stopping `./tailscaled` stops Tailscale, so as a workaround for now, I just close the tab where `./tailscaled` is running. I am pretty sure that's not how I must be doing it, but it works for now.

I further locked down this Fly instance's DNS port access to my Tailscale nodes as I don't want anyone else on my Tailnet (I share it with my friends and family) to make other calls to the Fly node. A handy [Tailscale ACL](https://tailscale.com/kb/1018/) like the one below works:

```text
{ "Action": "accept", "Users": ["group:not-arun-family"], "Ports": ["fly:53"] },
```
