# White-Label / Packaged Product Concept

## The Idea
Package DoppelPod (or a derivative product) as a sellable template — full working product including codebase, infrastructure, and automated setup flow.

## Target Buyer
- Agencies wanting a branded video avatar tool for their clients
- Solo creators/entrepreneurs who want the product without building it
- Anyone who sees the value but can't build it themselves

## How It Would Work
A Claude Agent SDK-powered CLI that:
1. Clones the repo as a template
2. Walks the buyer through setup interactively
3. Swaps credentials (API keys, Supabase, Vercel, Resend, etc.)
4. Renames branding (domain, product name, colors)
5. Runs DB migrations on their Supabase project
6. Deploys their instance to Vercel

## Technical Feasibility
- High — Claude Code / Agent SDK handles file modification, shell commands, and interactive setup naturally
- Closest model: `create-next-app` / `create-t3-app` but for a full working product
- Main challenges:
  - Supabase and Vercel account linking requires buyer auth
  - Systematic find/replace of hardcoded strings across codebase
  - Keeping the template in sync as the product evolves (ongoing maintenance cost)

## Prerequisites
- DoppelPod needs to prove product-market fit first
- Codebase should be reasonably clean and well-documented before templating
- Pricing model TBD (one-time license? SaaS cut? setup fee?)

## Status
Thought experiment as of 2026-04-05. Revisit after launch.
