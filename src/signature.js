const crypto = require('crypto');

/**
 * Verify the GitHub webhook signature from the X-Hub-Signature-256 header.
 * Returns true if the signature matches, false otherwise.
 *
 * @param {string} secret - The webhook secret from config
 * @param {string|Buffer} rawBody - The raw request body
 * @param {string} signatureHeader - The value of X-Hub-Signature-256
 * @returns {boolean}
 */
function verifySignature(secret, rawBody, signatureHeader) {
  if (!secret) {
    // No secret configured — skip verification (not recommended for prod)
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  const [algo, theirDigest] = signatureHeader.split('=');

  if (algo !== 'sha256' || !theirDigest) {
    return false;
  }

  const ourDigest = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(ourDigest, 'hex'),
      Buffer.from(theirDigest, 'hex')
    );
  } catch {
    // Buffer lengths differ — definitely not equal
    return false;
  }
}

module.exports = { verifySignature };
