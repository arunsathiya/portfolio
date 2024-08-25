---
title: 'jq magic to create contacts for SimpleLogin aliases'
seoTitle: 'jq magic to create contacts for SimpleLogin aliases'
slug: 'jq-magic-to-create-contacts-for-simplelogin-aliases'
description: "If you are using SimpleLogin to create unique email aliases, here's a hacky workaround using jq to create contact reverse alias from your terminal application."
pubDate: 'Oct 10 2021'
updatedDate: 'Aug 24 2024'
tags: ['Automation']
coverImage: './image.webp'
---

One thing that I found lacking in the [SimpleLogin API](https://github.com/simple-login/app/blob/master/docs/api.md) is that, it doesn't expose an API endpoint to create a contact based on the alias' email address. Rather, the `POST /api/aliases/:alias_id/contacts` endpoint requires the alias ID. So, I ended up downloading all aliases as multiple batches (each query returns upto 20 results) and saved them as json files in a folder.

With them in a folder, I could use jq to parse all of these json files for an alias email address, get its ID and further use it to create a new contact. All of this works like a charm now. My entire process works independent of the dashboard now: create a new alias, get its ID, create a contact, copy the reverse contact address, paste it on my email client.

The first part for getting the alias ID involves this command:

```text
cat ~/Documents/SimpleLoginFiles/* | jq '.aliases[] | select(.email=="aliasAddress")' | jq '.id' | tr -d '\n' | pbcopy .
```

It was a pleasant surprise when I learned that I could pipe in all files in a folder to jq, instead of having to implement some sort of a loop logic. I don't know if it's bash's magic or something that jq handles elegantly.

The second part for creating the contact involves this command:

```text
curl --location --request POST 'https://app.simplelogin.io/api/aliases/aliasID/contacts' --header 'Authentication: token' --header 'Content-Type: application/json' --data-raw '{"contact": "contactAddress"}' | jq '.reverse_alias' | tr -d "\\"" | pbcopy .
```

If you are wondering what the `tr -d "\\""` part is, it's to remove the unwanted escape characters that appears as a part of the SimpleLogin API output. I imagine it's possible to remove that using jq, but for now, the current workaround is sufficient.

The contact's reverse address is finally in my clipboard, which I can paste on Apple Mail:

![image.png](https://prod-files-secure.s3.us-west-2.amazonaws.com/cf01b7e0-f679-450a-bd3e-1da011ac3be5/be463ddd-b458-41b3-a63a-d151ddf8c2f2/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45HZZMZUHI%2F20240825%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20240825T062148Z&X-Amz-Expires=3600&X-Amz-Signature=c980e0acd32ed4bdfde1b76faba79ff3d91214c97a53071381741c7f560361d9&X-Amz-SignedHeaders=host&x-id=GetObject)

SimpleLogin recently announced an update to their Firefox extension too, to create reverse aliases (contact reverse address) on the go, but I like this API-based process better. The extension takes a while to populate all aliases.
