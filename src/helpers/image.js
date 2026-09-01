const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PUBLIC_ROOT = path.join(__dirname, '..', '..', 'public');

// Only these are ever allowed to land in the public/ static folder, which is
// served directly to the internet via @fastify/static. Anything else (a
// crafted "profile.php", "../../whatever") gets rejected before it touches disk.
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

// Credential "proof" uploads (degree certificates, licenses) are commonly
// scanned as PDFs, so that one type gets its own, slightly wider allowlist —
// kept separate from ALLOWED_IMAGE_EXTENSIONS so portfolio photos and
// category icons stay image-only.
const ALLOWED_PROOF_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']);

/**
 * Builds a filesystem-safe, collision-proof filename from a user-supplied
 * original name: keeps only a validated extension, discards everything else
 * the caller sent (no path segments, no user-controlled base name).
 */
function safeFilename(originalName, allowedExtensions) {
    const ext = path.extname(String(originalName || '')).toLowerCase();
    if (!allowedExtensions.has(ext)) {
        throw new Error(`Unsupported file type "${ext || '(none)'}". Allowed: ${[...allowedExtensions].join(', ')}`);
    }
    return `${crypto.randomUUID()}${ext}`;
}

function safeImageFilename(originalName) {
    return safeFilename(originalName, ALLOWED_IMAGE_EXTENSIONS);
}

/**
 * Resolves a path under the public/ root and throws if the result would
 * escape that root (defense in depth in case a caller passes a crafted
 * `type`/`write_to` segment — those should be from a fixed internal list,
 * never directly from request input, but this makes that a hard guarantee
 * rather than a convention).
 */
function resolveWithinPublic(...segments) {
    const resolved = path.join(PUBLIC_ROOT, ...segments);
    if (!resolved.startsWith(PUBLIC_ROOT + path.sep) && resolved !== PUBLIC_ROOT) {
        throw new Error('Resolved path escapes the public directory');
    }
    return resolved;
}

/**
 * Writes a base64-encoded image. Returns the safe filename actually used on
 * disk (NOT the caller's original name) — persist this, not the input.
 */
module.exports.writeImage = async function(type, file_name, data, write_to) {
    const safeName = safeImageFilename(file_name);
    const img_path = resolveWithinPublic(write_to, type);
    if (!fs.existsSync(img_path)) fs.mkdirSync(img_path, { recursive: true });
    await fs.promises.writeFile(path.join(img_path, safeName), data, { encoding: 'base64' });
    return safeName;
};

/**
 * Writes a streamed multipart file upload. Returns the safe filename
 * actually used on disk.
 */
module.exports.writeIconImage = async function(type, file_name, data) {
    const safeName = safeImageFilename(file_name);
    const icon_path = resolveWithinPublic(type, 'icon');
    if (!fs.existsSync(icon_path)) fs.mkdirSync(icon_path, { recursive: true });
    const stream = fs.createWriteStream(path.join(icon_path, safeName));
    await data.file.pipe(stream);
    return safeName;
};

/**
 * Writes a multipart file part that's already been buffered (via
 * `part.toBuffer()`), allowing PDFs in addition to images — used for
 * credential "proof" uploads, where the upload is optional and the handler
 * has to read the whole multipart stream itself (see credential.handler.js)
 * rather than relying on request.file()'s "first file part" shortcut.
 */
module.exports.writeProofFile = async function(type, filename, buffer) {
    const safeName = safeFilename(filename, ALLOWED_PROOF_EXTENSIONS);
    const icon_path = resolveWithinPublic(type, 'icon');
    if (!fs.existsSync(icon_path)) fs.mkdirSync(icon_path, { recursive: true });
    await fs.promises.writeFile(path.join(icon_path, safeName), buffer);
    return safeName;
};

module.exports.removePdf = async function(file_name, remove_from){
    // file_name here must already be a name we generated and stored (e.g.
    // read back from the DB row being deleted), never raw request input.
    const safeName = path.basename(String(file_name || ''));
    const pdf_path = resolveWithinPublic(remove_from, safeName);
    if (fs.existsSync(pdf_path)) {
        await fs.promises.unlink(pdf_path);
    }
};

module.exports.safeImageFilename = safeImageFilename;
