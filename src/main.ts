// converts an image to ascii art (note: font must be monospaced, and must not contain ligatures)

import { Font } from "../deps.ts";
import { decode } from '../deps.ts';

const fontRes = 16;

const data = await Deno.readFile(Deno.args[1]);
const font = new Font(data);

const chars: { [key: string]: string; } = {};

// loop over ascii codes from 32 to 126 (safe ascii character range, i could use a unicode range but javascript is messy with unicode)
for (let i = 32; i <= 126; i++) {
  const char = String.fromCharCode(i);
  let rast = font.rasterize(char, fontRes).bitmap ?? new Uint8Array([0]);

  // apply right padding to the array if the arrays length is not 50*50
  if (rast.length <= Math.pow(fontRes, 2)) {
    const pad = new Uint8Array(Math.pow(fontRes, 2));
    pad.set(rast);
    rast = pad;
  }

  // rast is a Uint8Array and its values represent the coverage of each pixel (grayscale)
  // get the average coverage of rast
  let avg = rast.reduce((a, b) => a + b) / rast.length;
  if (isNaN(avg)) { console.log(char); avg = 0; };
  chars[avg] = char;
}

const mapped = {};

Object.keys(chars).map(x => parseFloat(x)).map(
  //map from 0..the maximum value in the array to 0..255

  key => {
    //@ts-ignore
    mapped[(
      key / Math.max(
        ...(Object.keys(chars).map(x => parseFloat(x)))
      )
    ) * 255] = chars[key];
  }
);

const image = decode(await Deno.readFile(Deno.args[0]));

// loop on every pixel in the image.image array using for..in
for (let i = 0; i < image.data.length; i += 4) {
  // get the pixel's RGB values
  const r = image.data[i];
  const g = image.data[i + 1];
  const b = image.data[i + 2];
  const a = image.data[i + 3];
  // get the pixel's average value
  const avg = (((r + g + b) / 3)) * (a / 255);

  // get the mapped char closest to the pixel's average
  //@ts-ignore
  const char = mapped[Object.keys(mapped).reduce((a, b) => Math.abs(parseFloat(a) - avg) < Math.abs(parseFloat(b) - avg) ? a : b)];

  // print the char without a newline
  await Deno.stdout.write(new TextEncoder().encode(`\x9B38;2;${r};${g};${b}m${char}`));

  if (((i + 4) % (image.width * 4)) === 0) {
    // after every row is printed, print a newline
    await Deno.stdout.write(new TextEncoder().encode("\n"));
  }
}