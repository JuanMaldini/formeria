// One-off PNG -> SVG using vtracer (color trace)
// vtracer is installed globally; resolve via npm root since we're ESM.
import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const globalRoot = path.join(
  os.homedir(),
  "AppData",
  "Roaming",
  "npm",
  "node_modules"
);
const vtracer = require(path.join(globalRoot, "vtracer"));

const [, , inputArg, outputArg] = process.argv;
if (!inputArg || !outputArg) {
  console.error("uso: node tools/png2svg.js <input.png> <output.svg>");
  process.exit(1);
}

const input = path.resolve(inputArg);
const output = path.resolve(outputArg);

console.log(`tracing ${input} -> ${output}`);

// vtracer params tuned for an app icon: keep colors, decent detail,
// smooth curves. filter_speckle drops tiny PNG compression noise.
vtracer.convertImageToSvg(input, output, {
  input_format: "png",
  output_format: "svg",
  color_precision: 8,
  layer_difference: 16,
  mode: "spline",        // smooth bezier
  corner_threshold: 60,
  length_threshold: 4.0,
  max_iterations: 10,
  splice_threshold: 45,
  path_precision: 3,
  filter_speckle: 4,
  color_precision_input: 8,
});

const stats = fs.statSync(output);
console.log(`done: ${(stats.size / 1024).toFixed(1)} KB`);
