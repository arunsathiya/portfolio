---
external: false
notion: f1a19543-cbf0-45cc-8a85-7b00e6ac4795
title: Whisper API implementations
slug: whisper-api-implementations
description: This is how I consume the Whisper speech model from the ChatGPT iOS app onto my MacBook.
date: 2024-03-11
---

A lot of people know OpenAI only in the form of ChatGPT offering but they build a ton of products in the adjacent spaces as well. [Whisper](https://openai.com/research/whisper) stands out as a prime example, an advanced speech recognition model. It’s available as a downloadable model for local use or through API for integration into online services

Ever since I discovered this about three months ago, I had been hooked about the idea of creating content using voice input rather than having to type it. 

Thanks to the power of open source, there are already various implementations in place that you can use—in [the form of a CLI program](https://github.com/Vaibhavs10/insanely-fast-whisper), or with [a third-party API which acts as a caching or gating mechanism](https://developers.cloudflare.com/workers-ai/models/whisper/). 

But having tried various implementations, I think I'm just going to come back to the version that's available on the ChatGPT iOS and Android apps because this is the most elegant version so far, especially:
- in the context of making sure that the word corrections happen automatically,
- words like “hmm”, “um” or captured appropriately,
- and punctuations, that's perfect as well.
I think the most simple setup that I'm going to use is [universal clipboard on Apple ecosystem](https://support.apple.com/en-us/102430). I'm right now using the ChatGPT iOS app to speak all of this and I can select all the text and copy it, which in turn makes it available on the macOS clipboard as well. 

In a previous version I had been exploring the option of sending this input to [a webhook endpoint](https://webhook.site/) using a [custom GPT](https://openai.com/blog/introducing-gpts), and then copy the text manually, but universal clipboard is the most elegant setup that I can think of at this time.
