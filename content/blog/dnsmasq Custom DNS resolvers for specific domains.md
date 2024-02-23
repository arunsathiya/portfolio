---
external: false
notion: b86aaac5-f487-4d84-8ec1-d3cc4eaa7fda
title: dnsmasq - Custom DNS resolvers for specific domains
slug: dnsmasq-custom-dns-resolvers-for-specific-domains
description: It's possible to setup custom DNS resolvers for certain domains using a dnsmasq config file. Requests still pass through pihole, for ad-blocking capabilities.
date: 2021-10-30
---

Learned a neat thing today — [it's possible to set custom DNS resolvers for certain domains](https://news.ycombinator.com/item?id=29026068). I can create a custom config file for dnsmasq and specify the DNS resolvers to use for those domains. I don't have a need for it today, but may be handy in cases like archive.is not loading on Cloudflare DNS.

These requests still go through pihole, so ad-blocking capabilities are available. It's just the upstream that changes. My test below confirms so: I have set `dnsleaktest.com` to be queried using Google DNS but requests still pass through pihole.

```text
/etc/dnsmasq.d/02-test.conf
server=/dnsleaktest.com/8.8.8.8
server=/dnsleaktest.com/8.8.4.4
```

![44287-image-5.png](https://blogarunsathiya.files.wordpress.com/2022/07/44287-image-5.png?w=1024&h=357)

I use two Raspberry Pi devices at home, both running pihole with Unbound as a recursive DNS resolver. These devices are connected to my [Tailscale network, so all of my devices (and my friends) can enjoy Unbound and pihole's ad-blocking capabilities](https://blogarunsathiya.wordpress.com/2021/03/30/pi-hole-on-tailscale/).
