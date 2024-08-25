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

![image.png](https://portfolio.75d17a47b6c80ac40b0e7e44a4a8517d.r2.cloudflarestorage.com/blog/assets/dnsmasq-custom-dns-resolvers-for-specific-domains-42362915-5cb1-4239-b9c9-2284826ef946.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=8367778c331a87824282df96c3af94ca%2F20240825%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20240825T060504Z&X-Amz-Expires=3600&X-Amz-Signature=b89b99f8f8da548817523fe92ad86eaec160cf389ee02a37deba946b99d3733e&X-Amz-SignedHeaders=host&x-id=GetObject)

I use two Raspberry Pi devices at home, both running pihole with Unbound as a recursive DNS resolver. These devices are connected to my [Tailscale network, so all of my devices (and my friends) can enjoy Unbound and pihole's ad-blocking capabilities](https://blogarunsathiya.wordpress.com/2021/03/30/pi-hole-on-tailscale/).
