import { access, cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const standaloneRoot = resolve(projectRoot, ".next", "standalone");
const nextStaticRoot = resolve(projectRoot, ".next", "static");

async function assertStandaloneBuild() {
  try {
    await access(standaloneRoot);
  } catch {
    throw new Error(
      'Missing .next/standalone. Run this script after `next build` with `output: "standalone"` enabled.',
    );
  }
}

async function assertGeneratedStaticAssets() {
  try {
    await access(nextStaticRoot);
  } catch {
    throw new Error(
      "Missing .next/static. Run a complete production build before packaging the standalone server.",
    );
  }
}

async function copyIfPresent(source, destination) {
  try {
    await access(source);
  } catch {
    return false;
  }

  await mkdir(resolve(destination, ".."), { recursive: true });
  await cp(source, destination, { recursive: true, force: true });
  return true;
}

await assertStandaloneBuild();
await assertGeneratedStaticAssets();

const copiedStatic = await copyIfPresent(
  nextStaticRoot,
  resolve(standaloneRoot, ".next", "static"),
);

const copiedPublic = await copyIfPresent(
  resolve(projectRoot, "public"),
  resolve(standaloneRoot, "public"),
);

console.log(
  `Standalone browser assets prepared. static=${copiedStatic ? "copied" : "missing"} public=${copiedPublic ? "copied" : "missing"}`,
);