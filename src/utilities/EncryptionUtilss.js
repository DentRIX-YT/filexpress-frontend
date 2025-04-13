// EncryptionUtils.js
export async function generateAESKey() {
    return await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

export async function encryptFile(arrayBuffer, aesKey, iv) {
    return await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        arrayBuffer
    );
}

export async function decryptFile(encryptedBuffer, aesKeyRaw, iv) {
    const aesKey = await crypto.subtle.importKey(
        "raw",
        aesKeyRaw,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        aesKey,
        encryptedBuffer
    );

    return decryptedBuffer;
}

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

export async function encryptAESKeyWithPublicKey(aesKey, publicKeyPem) {
    const publicKey = await importPublicKey(publicKeyPem);
    const rawKey = await window.crypto.subtle.exportKey("raw", aesKey);
    return await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey,
        rawKey
    );
}

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

export async function decryptAESKeyWithPrivateKey(encryptedKeyBuffer, privateKeyPem) {
    const privateKey = await importPrivateKey(privateKeyPem);
    return await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        encryptedKeyBuffer
    );
}