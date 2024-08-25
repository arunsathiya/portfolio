---
title: 'dnsmasq - Custom DNS resolvers for specific domains'
seoTitle: 'dnsmasq - Custom DNS resolvers for specific domains'
slug: 'dnsmasq-custom-dns-resolvers-for-specific-domains'
description: "It's possible to setup custom DNS resolvers for certain domains using a dnsmasq config file. Requests still pass through pihole, for ad-blocking capabilities."
pubDate: 'Oct 29 2021'
updatedDate: 'Aug 24 2024'
tags: ['Automation']
coverImage: './image.webp'
---

Learned a neat thing today — [it's possible to set custom DNS resolvers for certain domains](https://news.ycombinator.com/item?id=29026068). I can create a custom config file for dnsmasq and specify the DNS resolvers to use for those domains. I don't have a need for it today, but may be handy in cases like archive.is not loading on Cloudflare DNS.

These requests still go through pihole, so ad-blocking capabilities are available. It's just the upstream that changes. My test below confirms so: I have set `dnsleaktest.com` to be queried using Google DNS but requests still pass through pihole.

```text
/etc/dnsmasq.d/02-test.conf
server=/dnsleaktest.com/8.8.8.8
server=/dnsleaktest.com/8.8.4.4
```

![image.png](https://prod-files-secure.s3.us-west-2.amazonaws.com/cf01b7e0-f679-450a-bd3e-1da011ac3be5/8e87097b-abe2-4015-8e4b-27a383843c30/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45HZZMZUHI%2F20240825%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20240825T062148Z&X-Amz-Expires=3600&X-Amz-Signature=ab30b46e089d03e647c6c6f72945ce8bea16572cc5f23d68c23860747387cf0c&X-Amz-SignedHeaders=host&x-id=GetObject)

I use two Raspberry Pi devices at home, both running pihole with Unbound as a recursive DNS resolver. These devices are connected to my [Tailscale network, so all of my devices (and my friends) can enjoy Unbound and pihole's ad-blocking capabilities](https://blogarunsathiya.wordpress.com/2021/03/30/pi-hole-on-tailscale/).
