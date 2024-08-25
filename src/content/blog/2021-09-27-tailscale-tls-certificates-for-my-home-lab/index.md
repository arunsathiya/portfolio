---
title: 'Growing my home lab - Tailscale TLS certificates for each Docker with Caddy'
seoTitle: 'Growing my home lab - Tailscale TLS certificates for each Docker with Caddy'
slug: 'tailscale-tls-certificates-for-my-home-lab'
description: 'I am starting to grow my home lab with Raspberry Pi, Docker, Caddy and Tailscale. Right now, I have Whoogle, libreddit, pihole and Caddy running on my nodes.'
pubDate: 'Sep 26 2021'
updatedDate: 'Aug 24 2024'
tags: ['Tools', 'DevOps']
coverImage: './image.webp'
---

I have grown up reading Raspberry Pi users build amazing projects on this wonderful reddit: [r/homelab](https://old.reddit.com/r/homelab/). Until an year ago, I didn't have a clue where to start, mostly because the idea of setting up Wireguard to access these self-hosted services was a bit intimidating. Tailscale changed everything.

Tailscale is a mesh VPN software that makes it incredibly easy to connect your devices together. This includes your laptops, mobile devices, servers, and even printers. The idea is that, Tailscale acts as an interface for all devices to talk to each other, without having to create, manage and install Wireguard certificates manually.

## Self-hosted services with Docker and Tailscale

Thanks to Docker, [I have been running a Whoogle instance](https://blogarunsathiya.wordpress.com/2021/09/08/whoogle-on-the-tailscale-network/) and [a libreddit instance](https://blogarunsathiya.wordpress.com/2021/09/08/libreddit-on-tailscale/) for a while. Each on a different port, while Tailscale and pihole are installed on the Raspberry Pi directly. It has worked well so far, but one thing that bugged me is the lack of HTTPS support.

That changed a while ago because Tailscale TLS certificates are now available for each node address: [Provision TLS certificates for your internal Tailscale services](https://tailscale.com/blog/tls-certs/). Obtaining the certificate and its key was very easy. Setting up my services ([pihole](https://blogarunsathiya.wordpress.com/2021/03/30/pi-hole-on-tailscale/), libreddit and Whoogle) to use the TLS certificate was a different challenge though.

## Caddy to the rescue

That's when I discovered Caddy, which turns out to be a web server that can provision TLS certificates as well.

But my use-case was to run Caddy as a reverse proxy, to serve each Docker container on the Tailscale node address, each on a subfolder. After a lot of trial and error, reading documentation, reading GitHub issues, I have the following running with TLS:

- Libreddit on the root domain `mew.tailnet-b593.ts.net`.
- Whoogle on `mew.tailnet-b593.ts.net/google`
  ![image.png](https://portfolio.75d17a47b6c80ac40b0e7e44a4a8517d.r2.cloudflarestorage.com/blog/assets/tailscale-tls-certificates-for-my-home-lab-5e11ac3a-ce18-4dbb-8ff9-05c0afe3f875.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=8367778c331a87824282df96c3af94ca%2F20240825%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20240825T060504Z&X-Amz-Expires=3600&X-Amz-Signature=c0ee323ac7f9c070350f5314487f7c4b113ce17faa6ef441cbc755cc4169aaf2&X-Amz-SignedHeaders=host&x-id=GetObject)

I wanted to access my pihole admin on HTTPS too, but I couldn't get it working on a subfolder, like `mew.tailnet-b593.ts.net/pihole`. When I assigned the root domain to pihole, libreddit had to go to a subfolder like `mew.tailnet-b593.ts.net/reddit` and when I tried that, CSS on my libreddit instance broke.

Firefox reports that this is happening because of an incorrect MIME on the stylesheet:

```text
The stylesheet https://mew.tailnet-b593.ts.net/style.css was not loaded because its MIME type, “text/html”, is not “text/css”.
```

I bet this is fixable. It's an incorrect `replace` rule on my Caddyfile. I plan on looking at this sometime next week.

## Caddyfile to route and use Tailscale TLS certificates

For now, my Caddyfile looks like this:

```text
{
	order replace after encode
}
:80 {
	reverse_proxy localhost:1080
}
mew.tailnet-b593.ts.net {
	tls /etc/caddy/mew.tailnet-b593.ts.net.pem /etc/caddy/mew.tailnet-b593.ts.net.key
	reverse_proxy localhost:8080
	route /google {
		redir /google /google/
	}
	route /google/* {
		uri strip_prefix /google/
		header Location "mew.tailnet-b593.ts.net" "mew.tailnet-b593.ts.net/google/"
		replace {
			"mew.tailnet-b593.ts.net" "mew.tailnet-b593.ts.net/google/"
		}
		reverse_proxy localhost:5000
	}
}
```

`replace` directive in this configuration is a [Caddy module: replace-response](https://github.com/caddyserver/replace-response). It's not bundled with Caddy out of the box. Setting that up was an interesting challenge as well, because that involved [installing ](https://caddyserver.com/docs/build#xcaddy)[`xcaddy`](https://caddyserver.com/docs/build#xcaddy)[ and using that to build a custom binary for Caddy](https://caddyserver.com/docs/build#xcaddy).

In the above file, `mew.tailnet-b593.ts.net.pem` and `mew.tailnet-b593.ts.net.key` are the TLS certificate and key issued by Tailscale. The first file actually is named `mew.tailnet-b593.ts.net.crt` but I renamed that to ending with `.pem`. Gotta read up on how `.crt` and `.pem` files differ.

---

If you are looking for a web server or reverse proxy manager, I cannot recommend Caddy enough. Their documentation and support on the community forums are impeccable.

I tried learning in the public for the first time by posting my progress to Mastodon.

That helped me retain my lessons better and held me accountable, in the way that I wanted to see this completed. No wonder many successful people learn or build in the public. I plan on doing this more often.
