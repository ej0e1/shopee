import crypto from "crypto"

/**
 * Generate HMAC-SHA256 signature for Shopee API.
 *
 * Base string format (parts joined without separator):
 *   Public-level : partner_id + path + timestamp
 *   Shop-level   : partner_id + path + timestamp + access_token + shop_id
 *
 * Reference: shopee-sdk-main/src/utils/signature.ts
 */
export function generateSignature(partnerKey: string, parts: (string | number)[]): string {
    const baseString = parts.map(String).join("")
    return crypto.createHmac("sha256", partnerKey).update(baseString).digest("hex")
}
