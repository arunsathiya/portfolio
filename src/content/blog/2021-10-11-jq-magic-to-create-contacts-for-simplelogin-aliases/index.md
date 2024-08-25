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

![image.png](https://portfolio.75d17a47b6c80ac40b0e7e44a4a8517d.r2.cloudflarestorage.com/blog/assets/jq-magic-to-create-contacts-for-simplelogin-aliases-3976fae0-0b0f-42c5-8361-c78f3f890db0.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=8367778c331a87824282df96c3af94ca%2F20240825%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20240825T060504Z&X-Amz-Expires=3600&X-Amz-Signature=137923c548cc84d756db6c6bd7e9ee547cb3c1ccc651ae207992388e42d3122c&X-Amz-SignedHeaders=host&x-id=GetObject)

SimpleLogin recently announced an update to their Firefox extension too, to create reverse aliases (contact reverse address) on the go, but I like this API-based process better. The extension takes a while to populate all aliases.