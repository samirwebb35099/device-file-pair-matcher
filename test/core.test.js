import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pairDevice } from '../src/core.js';

// ---------- /dev/char <-> /dev/block ----------

test('char to block via /dev/char path', () => {
  assert.equal(pairDevice('/dev/char/8:0'), '/dev/block/8:0');
});

test('block to char via /dev/block path', () => {
  assert.equal(pairDevice('/dev/block/8:0'), '/dev/char/8:0');
});

test('char path with multi-digit minor', () => {
  assert.equal(pairDevice('/dev/char/259:42'), '/dev/block/259:42');
});

// ---------- /dev/tty<n> ----------

test('tty0 pairs to block 4:0', () => {
  assert.equal(pairDevice('/dev/tty0'), '/dev/block/4:0');
});

test('tty7 pairs to block 4:7', () => {
  assert.equal(pairDevice('/dev/tty7'), '/dev/block/4:7');
});

// ---------- /dev/loop<n> ----------

test('loop0 pairs to char 7:0', () => {
  assert.equal(pairDevice('/dev/loop0'), '/dev/char/7:0');
});

test('loop15 pairs to char 7:15', () => {
  assert.equal(pairDevice('/dev/loop15'), '/dev/char/7:15');
});

// ---------- /dev/sd* ----------

test('sda3 pairs to char 8:3', () => {
  assert.equal(pairDevice('/dev/sda3'), '/dev/char/8:3');
});

test('sdb1 pairs to char 8:1', () => {
  assert.equal(pairDevice('/dev/sdb1'), '/dev/char/8:1');
});

test('sdac5 (multi-letter disk) pairs to char 8:5', () => {
  assert.equal(pairDevice('/dev/sdac5'), '/dev/char/8:5');
});

test('sda without a trailing number is not paired', () => {
  assert.equal(pairDevice('/dev/sda'), null);
});

// ---------- /dev/nvme ----------

test('nvme0n1 pairs to char 259:1', () => {
  assert.equal(pairDevice('/dev/nvme0n1'), '/dev/char/259:1');
});

test('nvme3n9 pairs to char 259:9', () => {
  assert.equal(pairDevice('/dev/nvme3n9'), '/dev/char/259:9');
});

test('nvme0 without namespace suffix is not paired', () => {
  assert.equal(pairDevice('/dev/nvme0'), null);
});

// ---------- virtio / xen / floppy ----------

test('vda1 pairs to char 254:1', () => {
  assert.equal(pairDevice('/dev/vda1'), '/dev/char/254:1');
});

test('xvda2 pairs to char 202:2', () => {
  assert.equal(pairDevice('/dev/xvda2'), '/dev/char/202:2');
});

test('fd0 pairs to char 2:0', () => {
  assert.equal(pairDevice('/dev/fd0'), '/dev/char/2:0');
});

// ---------- edge cases ----------

test('trailing slash is tolerated', () => {
  assert.equal(pairDevice('/dev/tty0/'), '/dev/block/4:0');
});

test('empty string returns null', () => {
  assert.equal(pairDevice(''), null);
});

test('non-string returns null', () => {
  assert.equal(pairDevice(42), null);
  assert.equal(pairDevice(null), null);
  assert.equal(pairDevice(undefined), null);
});

test('unknown device returns null', () => {
  assert.equal(pairDevice('/dev/random'), null);
});

test('non-dev path returns null', () => {
  assert.equal(pairDevice('/home/user/file.txt'), null);
});

test('malformed major minor under /dev/char returns null', () => {
  assert.equal(pairDevice('/dev/char/abc'), null);
});

test('malformed major minor with colon under /dev/block returns null', () => {
  assert.equal(pairDevice('/dev/block/1:'), null);
});

test('major minor with non-numeric major returns null', () => {
  assert.equal(pairDevice('/dev/char/x:0'), null);
});

test('major minor path with extra segment is rejected', () => {
  assert.equal(pairDevice('/dev/char/8:0/foo'), null);
});

test('root path returns null', () => {
  assert.equal(pairDevice('/'), null);
});

test('relative path returns null', () => {
  assert.equal(pairDevice('tty0'), null);
});
