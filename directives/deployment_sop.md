# Deployment SOP

## Overview
This document outlines the standard procedure for deploying updates to the `2026WEB` production environment.

## Pre-Deployment Checklist
- [ ] Verify local build integrity (open `index.html` in browser).
- [ ] Ensure all project metadata (roles, dates) aligns with current "timeless" requirements.
- [ ] Check video IDs and poster image paths.
- [ ] Verify mobile autoplay logic in `main.js`.

## Deployment Process
1.  **Commit Changes**: Ensure all local changes are committed with descriptive messages.
2.  **Verify Remote**: Ensure the Git remote is pointing to the correct repository.
3.  **Push to Main**: `git push origin main`.
4.  **Monitor Netlify**: Check the Netlify dashboard for build success.

## Rollback Procedure
In case of a deployment failure:
1.  Identify the last stable commit: `git log`.
2.  Revert to stable state: `git revert <commit_hash>`.
3.  Push the revert: `git push origin main`.
