#!/usr/bin/env node
// Production build with one retry for Google Fonts download failures
// (CLAUDE.md §57). next/font/google fetches font files at build time and
// already retries each file 3 times; when fonts.gstatic.com still fails the
// whole build stops ("Failed to fetch `<Family>` from Google Fonts." or "An
// error occurred in `next/font`.") and
// a redeploy fixes it. This wrapper retries the build once, only for that
// error, so a real build error still fails at once.
import { spawn } from 'node:child_process';

const FONT_ERROR = /from Google Fonts|An error occurred in `next\/font`/;

function run() {
  return new Promise((resolve) => {
    let tail = '';
    const child = spawn('npm', ['run', 'build'], { stdio: ['inherit', 'pipe', 'pipe'] });
    const keep = (chunk, out) => {
      out.write(chunk);
      tail = (tail + chunk.toString()).slice(-20000);
    };
    child.stdout.on('data', (c) => keep(c, process.stdout));
    child.stderr.on('data', (c) => keep(c, process.stderr));
    child.on('close', (code) => resolve({ code: code ?? 1, fontError: FONT_ERROR.test(tail) }));
  });
}

const first = await run();
if (first.code === 0) process.exit(0);
if (!first.fontError) process.exit(first.code);
console.error('\n[build-retry] Google Fonts download failed; retrying the build once in 20 s.\n');
await new Promise((r) => setTimeout(r, 20000));
const second = await run();
process.exit(second.code);
