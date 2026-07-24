// QR rendering via the bundled qrcode-generator — self-contained, NO network
// (spec / plan: the detached + continue-on-phone panels must render offline).
import qrcode from 'qrcode-generator';

export function qrDataUrl(text) {
  // typeNumber 0 = auto-fit; 'M' = medium error correction.
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  // cellSize 5px, margin 2 cells -> a crisp GIF data URL, embedded inline.
  return qr.createDataURL(5, 2);
}
