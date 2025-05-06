import { openDB } from "idb";

// Decrypts the private key using AES-GCM and stores it in IndexedDB
export async function decryptAndStorePrivateKey(encryptedKey, passphrase) {
    try {
        const [saltBase64, ivBase64, encryptedBase64] = encryptedKey.split(":");

        const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
        const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
        const encryptedData = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

        const encoder = new TextEncoder();
        const passphraseKey = encoder.encode(passphrase);

        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            passphraseKey,
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        const aesKey = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["decrypt"]
        );

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            aesKey,
            encryptedData
        );

        const decryptedPrivateKey = new TextDecoder().decode(decryptedBuffer);

        // Make sure object store 'keys' exists
        const db = await openDB("filexpressDB", 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains("keys")) {
                    db.createObjectStore("keys");
                }
            }
        });

        await db.put("keys", decryptedPrivateKey, "privateKey");

        console.log("Private key stored in IndexedDB.");
        return decryptedPrivateKey;
    } catch (error) {
        console.error("Decryption error:", error);
        return null;
    }
}


// Generate a 256-bit AES key for encryption and decryption
export async function generateAESKey() {
    return await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

// Encrypt a file using AES-GCM
export async function encryptFile(arrayBuffer, aesKey, iv) {
    return await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        arrayBuffer
    );
}

// Decrypt a file that was encrypted with AES-GCM
export async function decryptFile(encryptedBuffer, aesKeyRaw, iv) {
    const aesKey = await crypto.subtle.importKey(
        "raw",
        aesKeyRaw,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        encryptedBuffer
    );

    return decryptedBuffer;
}

// Convert a PEM-formatted public key to a CryptoKey
export async function importPublicKey(pem) {
    const b64 = pem
        .replace("-----BEGIN PUBLIC KEY-----", "")
        .replace("-----END PUBLIC KEY-----", "")
        .replace(/\s/g, "");
    const binaryDer = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    return await window.crypto.subtle.importKey(
        "spki",
        binaryDer.buffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["encrypt"]
    );
}

// Encrypt an AES key using the recipient's public key
export async function encryptAESKeyWithPublicKey(aesKey, publicKeyPem) {
    const publicKey = await importPublicKey(publicKeyPem);
    const rawKey = await window.crypto.subtle.exportKey("raw", aesKey);
    return await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey,
        rawKey
    );
}

// Convert a PEM-formatted private key to a CryptoKey
export async function importPrivateKey(pem) {
    const b64 = pem
        .replace("-----BEGIN PRIVATE KEY-----", "")
        .replace("-----END PRIVATE KEY-----", "")
        .replace(/\s/g, "");
    const binaryDer = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    return await window.crypto.subtle.importKey(
        "pkcs8",
        binaryDer.buffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["decrypt"]
    );
}

// Decrypt an AES key using the recipient's private key
export async function decryptAESKeyWithPrivateKey(
    encryptedKeyBuffer,
    privateKeyPem
) {
    const privateKey = await importPrivateKey(privateKeyPem);
    return await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        encryptedKeyBuffer
    );
}

export const deletePrivateKey = async () => {
    const db = await openDB("filexpressDB", 1);
    await db.delete("keys", "privateKey");
};
