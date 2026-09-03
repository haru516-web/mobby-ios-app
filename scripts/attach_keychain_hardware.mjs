import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PNG } from 'pngjs';

const projectRoot = process.cwd();
const goodsRoot = path.join(projectRoot, 'assets', 'gacha', 'goods');
const hardwarePath = path.join(projectRoot, 'assets', 'gacha', 'parts', 'keychain-hardware-gold.png');
const onlyArg = process.argv.find((value) => value.startsWith('--only='));
const outputArg = process.argv.find((value) => value.startsWith('--output='));
const pngOutput = process.argv.includes('--png');

function resolveProjectPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(projectRoot, value);
}

function runFfmpeg(args, input) {
  const result = spawnSync('ffmpeg', args, {
    cwd: projectRoot,
    input,
    encoding: null,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`ffmpeg failed: ${result.error?.message ?? result.stderr?.toString() ?? `exit ${result.status}`}`);
  }
  return result.stdout;
}

function decodeWebp(filePath) {
  const pngBuffer = runFfmpeg(['-v', 'error', '-i', filePath, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-']);
  return PNG.sync.read(pngBuffer);
}

function encodeWebp(png, outputPath, temporaryDirectory) {
  if (path.extname(outputPath).toLowerCase() === '.png') {
    fs.writeFileSync(outputPath, PNG.sync.write(png));
    return;
  }
  const temporaryPng = path.join(temporaryDirectory, `${path.basename(outputPath)}.png`);
  fs.writeFileSync(temporaryPng, PNG.sync.write(png));
  runFfmpeg(['-v', 'error', '-y', '-i', temporaryPng, '-frames:v', '1', '-c:v', 'libwebp', '-lossless', '1', '-pix_fmt', 'yuva444p', outputPath]);
}

function alphaBounds(image, threshold = 8) {
  let left = image.width;
  let top = image.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] <= threshold) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error('The generated hardware has no visible alpha content');
  return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 };
}

function crop(image, bounds) {
  const result = new PNG({ width: bounds.width, height: bounds.height });
  PNG.bitblt(image, result, bounds.left, bounds.top, bounds.width, bounds.height, 0, 0);
  return result;
}

function resizePremultiplied(source, width, height) {
  const result = new PNG({ width, height });
  const sourcePixel = (x, y) => {
    const offset = (y * source.width + x) * 4;
    const alpha = source.data[offset + 3] / 255;
    return [source.data[offset] * alpha, source.data[offset + 1] * alpha, source.data[offset + 2] * alpha, alpha];
  };
  for (let y = 0; y < height; y += 1) {
    const sourceY = (y + 0.5) * source.height / height - 0.5;
    const y0 = Math.max(0, Math.floor(sourceY));
    const y1 = Math.min(source.height - 1, y0 + 1);
    const fy = Math.max(0, Math.min(1, sourceY - y0));
    for (let x = 0; x < width; x += 1) {
      const sourceX = (x + 0.5) * source.width / width - 0.5;
      const x0 = Math.max(0, Math.floor(sourceX));
      const x1 = Math.min(source.width - 1, x0 + 1);
      const fx = Math.max(0, Math.min(1, sourceX - x0));
      const topLeft = sourcePixel(x0, y0);
      const topRight = sourcePixel(x1, y0);
      const bottomLeft = sourcePixel(x0, y1);
      const bottomRight = sourcePixel(x1, y1);
      const weights = [
        (1 - fx) * (1 - fy),
        fx * (1 - fy),
        (1 - fx) * fy,
        fx * fy,
      ];
      const channels = [0, 0, 0, 0];
      [topLeft, topRight, bottomLeft, bottomRight].forEach((pixel, index) => {
        channels[0] += pixel[0] * weights[index];
        channels[1] += pixel[1] * weights[index];
        channels[2] += pixel[2] * weights[index];
        channels[3] += pixel[3] * weights[index];
      });
      const offset = (y * width + x) * 4;
      result.data[offset] = channels[3] > 0 ? Math.round(channels[0] / channels[3]) : 0;
      result.data[offset + 1] = channels[3] > 0 ? Math.round(channels[1] / channels[3]) : 0;
      result.data[offset + 2] = channels[3] > 0 ? Math.round(channels[2] / channels[3]) : 0;
      result.data[offset + 3] = Math.round(channels[3] * 255);
    }
  }
  return result;
}

function findCharacterTop(image) {
  for (let y = 40; y < image.height; y += 1) {
    let visiblePixels = 0;
    for (let x = 0; x < image.width; x += 1) {
      if (image.data[(y * image.width + x) * 4 + 3] > 8) visiblePixels += 1;
    }
    if (visiblePixels > 40) return y;
  }
  throw new Error('Could not identify the plush body below the existing hardware');
}

function clearExistingHardware(image, characterTop) {
  for (let y = 0; y < characterTop; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      image.data[offset] = 0;
      image.data[offset + 1] = 0;
      image.data[offset + 2] = 0;
      image.data[offset + 3] = 0;
    }
  }
}

function composite(source, destination, left, top) {
  for (let y = 0; y < source.height; y += 1) {
    const destinationY = top + y;
    if (destinationY < 0 || destinationY >= destination.height) continue;
    for (let x = 0; x < source.width; x += 1) {
      const destinationX = left + x;
      if (destinationX < 0 || destinationX >= destination.width) continue;
      const sourceOffset = (y * source.width + x) * 4;
      const destinationOffset = (destinationY * destination.width + destinationX) * 4;
      const sourceAlpha = source.data[sourceOffset + 3] / 255;
      if (sourceAlpha === 0) continue;
      const destinationAlpha = destination.data[destinationOffset + 3] / 255;
      const outputAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
      const sourceWeight = sourceAlpha / outputAlpha;
      const destinationWeight = destinationAlpha * (1 - sourceAlpha) / outputAlpha;
      destination.data[destinationOffset] = Math.round(source.data[sourceOffset] * sourceWeight + destination.data[destinationOffset] * destinationWeight);
      destination.data[destinationOffset + 1] = Math.round(source.data[sourceOffset + 1] * sourceWeight + destination.data[destinationOffset + 1] * destinationWeight);
      destination.data[destinationOffset + 2] = Math.round(source.data[sourceOffset + 2] * sourceWeight + destination.data[destinationOffset + 2] * destinationWeight);
      destination.data[destinationOffset + 3] = Math.round(outputAlpha * 255);
    }
  }
}

function clearTransparentRgb(image) {
  for (let offset = 0; offset < image.data.length; offset += 4) {
    if (image.data[offset + 3] !== 0) continue;
    image.data[offset] = 0;
    image.data[offset + 1] = 0;
    image.data[offset + 2] = 0;
  }
}

function attachHardware(image, hardware, small) {
  const characterTop = findCharacterTop(image);
  clearExistingHardware(image, characterTop);
  const maximumHeight = small ? 78 : 104;
  const hardwareHeight = Math.min(maximumHeight, Math.max(48, characterTop - 3));
  // The source is a realistic long clasp. Slight horizontal compression is
  // intentional here so the links remain readable at 512px collectible size.
  const hardwareWidth = small ? 34 : 44;
  const resizedHardware = resizePremultiplied(hardware, hardwareWidth, hardwareHeight);
  const top = characterTop + 1 - hardwareHeight;
  const left = Math.round((image.width - hardwareWidth) / 2);
  composite(resizedHardware, image, left, top);
  clearTransparentRgb(image);
  return { characterTop, hardwareWidth, hardwareHeight, top };
}

function diagnosisKeyFiles() {
  return fs.readdirSync(goodsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((directory) => fs.readdirSync(path.join(goodsRoot, directory.name))
      .filter((fileName) => /^key-(normal|small)\.webp$/.test(fileName))
      .map((fileName) => path.join(goodsRoot, directory.name, fileName)));
}

const hardwareSource = PNG.sync.read(fs.readFileSync(hardwarePath));
const hardware = crop(hardwareSource, alphaBounds(hardwareSource));
const files = onlyArg ? [resolveProjectPath(onlyArg.slice('--only='.length))] : diagnosisKeyFiles();
if (files.length === 0) throw new Error('No diagnosis key images were found');

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mobby-keychain-'));
try {
  for (const filePath of files) {
    const image = decodeWebp(filePath);
    const small = path.basename(filePath) === 'key-small.webp';
    const result = attachHardware(image, hardware, small);
    const destination = outputArg && files.length === 1
      ? resolveProjectPath(outputArg.slice('--output='.length))
      : pngOutput ? filePath.replace(/\.webp$/i, '.png') : filePath;
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    encodeWebp(image, destination, temporaryDirectory);
    console.log(`${path.relative(projectRoot, destination)}: bodyTop=${result.characterTop}, hardware=${result.hardwareWidth}x${result.hardwareHeight}`);
  }
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
