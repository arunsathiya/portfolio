---
external: false
notion: b5694860-8304-468b-a473-d387dc742eef
title: SSH setup of the future
slug: ssh-setup-of-the-future
description: My SSH setup with 1Password and Tailscale
date: 2022-07-08
---

About four years ago, I had no clue what SSH keys meant. I learned to understand what SSH keys meant when I joined Automattic in 2018. Fast forward four years later, after a lot of trial and error, all of my homelab setup is gated with SSH keys. Password-based authentication is completely disabled.

## 1Password as my SSH agent

About a month ago at work, my interest for SSH keys grew further when one of my colleagues introduced me to the concept of using [1Password as my SSH agent](https://blog.1password.com/1password-ssh-agent/). This is a fairly new feature, which allows one to generate and store SSH keypair on the 1Password vault, and once that’s done, one can export just the public key and upload it to the servers, or other platforms that use SSH to authorize access like GitHub and GitLab.

1Password will act as the authorization tool, which on Mac would mean that one can authorize by tapping on the TouchID when prompted. This completely eliminates the need for copying the private key to several laptops, but also opens up an attack vector that the private key lives on [1Password.com](http://1password.com/) cloud.

I am not concerned about the attack vector because 1Password is a leader in business, has an unique concept of "[secret key](https://support.1password.com/secret-key-security/)" and [supports 2FA as well](https://support.1password.com/two-factor-authentication/).

I am very pleased with this experience, that I ended up replacing the key on all of my devices.

I am also very much looking forward to [GitHub’s support for signing commits using SSH keys, which is likely to land on or before July 20](https://github.com/orgs/github-community/discussions/7744#discussioncomment-3095118)!

## Tailscale SSH

About two weeks, Tailscale announced a fantastic SSH experience as well: Tailscale SSH that allows one to establish SSH connections with devices on my tailnet without having to generate and distribute keys. This is a bit technical, and is best read on [their own blog post](https://tailscale.com/blog/tailscale-ssh/).

Today, all of my devices are on the tailnet and connections to my Raspberry Pi nodes happen via Tailscale SSH, while connections to other nodes like my work, happen with 1Password as the SSH agent. If you haven’t tried either experience so far, you should stop reading and try right now.
