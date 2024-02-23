---
external: false
notion: 4ab7be92-8f77-4af2-b84b-65d6a4fbc708
title: Storing 2FA codes on my 1Password
slug: storing-2fa-codes-on-my-1password
description: Storing 2FA codes on a password manager doesn't equal placing all eggs in the same basket. That's because password managers come with unique security features.
date: 2021-10-09
---

I definitely agree with [what James writes here](https://blog.james.cridland.net/should-you-store-your-2fa-totp-tokens-in-your-password-manager-9798199b728):

> Storing them in your password manager is probably as safe, or even safer, than using your phone

	Many people, like Google or the government, text a code to your mobile phone when logging in. That might be visible on my mobile phone’s lockscreen, or my SIM card could be cloned and used elsewhere. It’s much better than having nothing at all, of course: but it’s not quite as secure.

	If you’re storing your 2FA code using Google Authenticator or Authy on your phone, and your password is saved on your phone, then you’ve no two-factor authentication anyway. Both are being stored on the same device, just like your password manager would.

	Lose your phone with Google Authenticator installed, and you lose your codes. If you change phones, you can manually transfer those codes these days, assuming that you still have access to your old phone, but it’s a monumental hassle to switch otherwise.

Most people feel that storing 2FA codes would equal putting all eggs in the same basket, but password managers these days are locked down with themselves supporting 2 step authentication. In my case, 1Password goes one step beyond by offering [an unique Secret Key method](https://support.1password.com/secret-key/).

My 1Password's 2FA code is stored on Authy today, but I guess it's time to replace that with a physical key.
