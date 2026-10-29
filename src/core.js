/**
 * Match a device path with its character/block counterpart.
 *
 * Why these pairs exist: Linux exposes the same underlying device through two
 * node types.  /dev/tty0  (char) ↔ /dev/block/0:0, and /dev/block/8:0 (block)
 * ↔ /dev/char/8:0.  The mapping is defined entirely by major:minor numbers,
 * so we parse those from the path rather than stat-ing the inode, which keeps
 * the function pure and deterministic — no filesystem access required.
 */

/**
 * Parse a trailing "major:minor" pair from a path segment.
 *
 * Returns [major, minor] or null when the segment has no such suffix.
 *
 * Only the final path segment is inspected.  Paths such as
 * /dev/char/8:0/foo are rejected because the colon-pair must be the leaf,
 * matching how /dev lays these nodes out in practice.
 */
function parseMajorMinor(leaf) {
  if (leaf === undefined || leaf === null || leaf === '') {
    return null;
  }

  const colon = leaf.lastIndexOf(':');
  if (colon <= 0 || colon === leaf.length - 1) {
    return null;
  }

  const majorStr = leaf.slice(0, colon);
  const minorStr = leaf.slice(colon + 1);

  if (!/^\d+$/.test(majorStr) || !/^\d+$/.test(minorStr)) {
    return null;
  }

  const major = Number(majorStr);
  const minor = Number(minorStr);

  // Guard against values outside the 32-bit unsigned range the kernel uses
  // for dev_t encoding.  Real device numbers never exceed this.
  if (major > 4294967295 || minor > 4294967295) {
    return null;
  }

  return [major, minor];
}

/**
 * Split a POSIX path into directory and leaf.
 *
 * Trailing slashes are dropped so /dev/tty0/ is treated the same as /dev/tty0.
 * The root path '/' is special-cased to avoid returning an empty directory.
 */
function splitPath(p) {
  const trimmed = p.replace(/\/+$/, '');
  if (trimmed === '') {
    return ['', ''];
  }
  const slash = trimmed.lastIndexOf('/');
  if (slash === -1) {
    return ['', trimmed];
  }
  return [trimmed.slice(0, slash), trimmed.slice(slash + 1)];
}

/**
 * Given a device path, return its matching counterpart device-node path.
 *
 * Recognised inputs and their counterparts:
 *   /dev/char/<maj>:<min>        → /dev/block/<maj>:<min>
 *   /dev/block/<maj>:<min>       → /dev/char/<maj>:<min>
 *   /dev/tty<n> (char)           → /dev/block/4:<n>
 *   /dev/loop<n> (block)         → /dev/char/7:<n>
 *   /dev/sd<letters><n> (block)  → /dev/char/8:<n>
 *   /dev/nvme<n>c<n>n<n> (block) → /dev/char/259:<n>
 *
 * Returns null for anything that is not recognised as one of the shapes above.
 * This is a deliberate trade-off: we avoid stat(2) so the function is pure,
 * but we cannot pair arbitrary paths whose major/minor we cannot infer.
 *
 * @param {string} devicePath
 * @returns {string|null}
 */
export function pairDevice(devicePath) {
  if (typeof devicePath !== 'string') {
    return null;
  }
  if (devicePath.length === 0) {
    return null;
  }

  const [dir, leaf] = splitPath(devicePath);

  // /dev/char/N:M  ↔  /dev/block/N:M
  if (dir === '/dev/char') {
    const mm = parseMajorMinor(leaf);
    if (mm) {
      return `/dev/block/${mm[0]}:${mm[1]}`;
    }
    return null;
  }

  // /dev/block/N:M  ↔  /dev/char/N:M
  if (dir === '/dev/block') {
    const mm = parseMajorMinor(leaf);
    if (mm) {
      return `/dev/char/${mm[0]}:${mm[1]}`;
    }
    return null;
  }

  // /dev/tty<n> — char 4:n  (console / virtual terminal)
  if (dir === '/dev') {
    const tty = leaf.match(/^tty(\d+)$/);
    if (tty) {
      return `/dev/block/4:${tty[1]}`;
    }

    // /dev/loop<n> — block 7:n  (loop devices)
    const loop = leaf.match(/^loop(\d+)$/);
    if (loop) {
      return `/dev/char/7:${loop[1]}`;
    }

    // /dev/sd<letters><digits> — SCSI/SATA disk, block 8:n
    // Letters identify the whole-disk spindle; only the trailing number
    // contributes to the minor, so /dev/sda3 → char 8:3.
    const sd = leaf.match(/^sd[a-z]+(\d+)$/);
    if (sd) {
      return `/dev/char/8:${sd[1]}`;
    }

    // /dev/nvme<n>c<n>n<n> — NVMe namespace, block 259:n
    // Matches the kernel's nvme-subsystem naming, e.g. /dev/nvme0n1.
    const nvme = leaf.match(/^nvme\d+n(\d+)$/);
    if (nvme) {
      return `/dev/char/259:${nvme[1]}`;
    }

    // /dev/vd<letter><digits> — virtio disk, block 254:n
    const vd = leaf.match(/^vd[a-z]+(\d+)$/);
    if (vd) {
      return `/dev/char/254:${vd[1]}`;
    }

    // /dev/xvd<letter><digits> — Xen virtual disk, block 202:n
    const xvd = leaf.match(/^xvd[a-z]+(\d+)$/);
    if (xvd) {
      return `/dev/char/202:${xvd[1]}`;
    }

    // /dev/fd<n> — floppy, block 2:n
    const fd = leaf.match(/^fd(\d+)$/);
    if (fd) {
      return `/dev/char/2:${fd[1]}`;
    }
  }

  return null;
}
