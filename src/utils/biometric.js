/**
 * Biometric / Fingerprint authentication utility
 * Uses the Web Authentication API (WebAuthn) via platform authenticator.
 * Works on Android (fingerprint/face) and iOS 16+ (Face ID/Touch ID).
 *
 * Strategy:
 *  - "register"  → create a credential bound to this device and store its ID in localStorage
 *  - "verify"    → use the stored credential ID to prompt the biometric sensor
 */

const RP_ID = window.location.hostname || "localhost";
const RP_NAME = "Sanjeewa Finance Book";
const CRED_KEY = "bio_cred_id";

/** Check if the device supports platform biometric authenticator */
export async function isBiometricAvailable() {
  try {
    if (!window.PublicKeyCredential) return false;
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}

/** Returns true if user has already registered a biometric credential on this device */
export function isBiometricRegistered() {
  return !!localStorage.getItem(CRED_KEY);
}

/**
 * Register / enroll biometric credential.
 * Must be called after the user has entered their PIN successfully (so we use PIN as the "user id").
 * Returns true on success, false on failure/cancel.
 */
export async function registerBiometric() {
  try {
    // Use a fixed user ID derived from the app (not personal data)
    const userId = new TextEncoder().encode("sanjeewa_finance_user");

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { id: RP_ID, name: RP_NAME },
        user: {
          id: userId,
          name: "Sanjeewa",
          displayName: "Sanjeewa Finance User",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },   // ES256
          { type: "public-key", alg: -257 },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",   // device-built-in sensor
          userVerification: "required",           // require fingerprint/face/PIN
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    });

    if (credential) {
      // Store credential ID (base64) so we can use it for future verification
      const rawId = new Uint8Array(credential.rawId);
      const b64Id = btoa(String.fromCharCode(...rawId));
      localStorage.setItem(CRED_KEY, b64Id);
      return true;
    }
    return false;
  } catch (err) {
    console.error("Biometric registration error:", err);
    return false;
  }
}

/**
 * Verify biometric – prompts the fingerprint/face sensor.
 * Returns true if the user verified successfully, false otherwise.
 */
export async function verifyBiometric() {
  try {
    const storedB64 = localStorage.getItem(CRED_KEY);
    if (!storedB64) return false;

    // Decode stored credential ID back to Uint8Array
    const rawBytes = Uint8Array.from(atob(storedB64), (c) => c.charCodeAt(0));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rpId: RP_ID,
        allowCredentials: [
          {
            type: "public-key",
            id: rawBytes.buffer,
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });

    return !!assertion;
  } catch (err) {
    // User cancelled or sensor failed
    if (err.name !== "NotAllowedError") {
      console.error("Biometric verify error:", err);
    }
    return false;
  }
}

/** Remove stored biometric credential (e.g. when user disables it) */
export function removeBiometric() {
  localStorage.removeItem(CRED_KEY);
}

