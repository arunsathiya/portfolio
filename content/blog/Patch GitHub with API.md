---
external: false
notion: 4431d21a-8a22-4ab4-8227-7e8d6ca7d864
title: Patching hundreds of GitHub repositories in seconds
slug: patch-github-with-api
description: Using GitHub API to commit patches and generate pull requests.
date: 2024-01-27
---

The traditional approach for submitting a patch upstream is to fork (if you don't have write access to that upstream repository), clone the fork, make changes, commit and submit a pull request upstream.

This can take a lot of time depending on how big the repository is.

I recently came across [this GitHub changelog](https://github.blog/changelog/2022-10-11-github-actions-deprecating-save-state-and-set-output-commands/) about `set-output` command being deprecated, so I looked at the number of repositories that are still using this command, and [over 220,000 workflow files are still using it](https://github.com/search?q=set-output%20language%3AYAML%20path%3A%2F%5E.github%5C%2Fworkflows%5C%2F%2F&type=code). Cloning hundreds of thousands of these repositories, opening the workflow files in an IDE, making changes and creating pull requests obviously takes a lot of time.

I wanted to simplify the whole approach with these guidelines:
- Clone only the files that need to be patched.
- Make changes programmatically, instead of manually on an IDE.
- Generate patch files for the changes made.
- Create commit on the fork.
- Prepare pull request from the fork to the upstream repository.
I was pleasantly surprised to learn that the last three points are possible with [patch2pr](https://github.com/bluekeyes/patch2pr?tab=readme-ov-file), and GitHub API endpoints to [create commits](https://docs.github.com/en/graphql/reference/mutations#createcommitonbranch) and [pull requests](https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#create-a-pull-request).

I tied all of this together into a Go program [set-output-janitor](https://github.com/arunsathiya/set-output-janitor):
- It looks for a list of repositories (owner/repo format) in a `repos.txt` file,
- Creates folders for individual workflow files,
- Makes changes, generates patch files,
- Commits and submits a pull request.
All automatically, in seconds, thanks to Go's concurrency capabilities.

![patch-github-with-api.webp](/images/patch-github-with-api.webp)

This was a really fun exercise, but also got a bit of hate because I was spamming organizations with the same content across different repositories. A few people unfollowed me on GitHub because whenever my PR was merged, it appeared on their newsfeed, one person reached out with a comment that I was flooding their inbox, and a few even looked me up on LinkedIn to figure out what was happening.

Next steps:
- I have stopped running this program because submitting many pull requests puts my GitHub account at the risk of suspension.
- I want to [use a bot token](https://github.com/arunsathiya/set-output-janitor/issues/17) to run this workflow.
On the bot token front, I am currently blocked by GitHub's [fine-grained tokens not having access to public-but-unowned data](https://github.com/orgs/community/discussions/36441#discussioncomment-7635050) (which means, I can create commits on my forks, but not submit pull requests upstream just yet). In talking to support, it looks like fine-grained tokens won't have the ability to submit pull requests, but I am going to hold out hope and see what happens in the future. Of course, without needing the [GitHub app to be installed on the organization](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation), like in the case of [dependabot](https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/configuring-dependabot-security-updates).

I think this kind of consistent change can be a GitHub product feature in itself, with disclaimers that the maintainers will need to verify and test before deploying.
