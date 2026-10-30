# device-file-pair-matcher

Given a device path, returns its matching character ↔ block device-node counterpart.

```js
import { pairDevice } from 'device-file-pair-matcher';

pairDevice('/dev/char/8:0');     // → '/dev/block/8:0'
pairDevice('/dev/tty0');         // → '/dev/block/4:0'
pairDevice('/dev/loop0');       // → '/dev/char/7:0'
pairDevice('/dev/sda3');        // → '/dev/char/8:3'
pairDevice('/dev/nvme0n1');     // → '/dev/char/259:1'
pairDevice('/dev/random');      // → null
```

## Why this exists

Linux exposes the same backing device through two node types — a character
device and a block device — and tools sometimes need the one they weren't
given.  The canonical mapping is defined by major:minor numbers, so this
library parses those from the path string rather than stat-ing the inode.

That makes `pairDevice` pure and deterministic: no filesystem access, no
side effects, trivially testable.  The trade-off is that it only recognises
the device shapes whose major/minor can be inferred from the path name
(`char`, `block`, `tty`, `loop`, `sd`, `nvme`, `vd`, `xvd`, `fd`).  An
arbitrary path whose type we cannot infer returns `null` rather than a
best-guess.

## The awkward edge

Whole-disk nodes like `/dev/sda` (no trailing partition number) are not
paired, because the minor number for the whole disk depends on the SCSI
disk index and cannot be derived from the name alone without stat.  If you
need whole-disk mapping, stat the node and use the major:minor directly via
the `/dev/char/` and `/dev/block/` forms, which this library does support.

## Exports

| Name         | Signature                          |
|--------------|-----------------------------------|
| `pairDevice` | `(devicePath: string) => string \| null` |
