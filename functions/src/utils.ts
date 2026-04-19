import * as crypto from "crypto";

/**
 * Validates Telegram initData checking HMAC-SHA256 signature
 */
export const validateTelegramInitData = (telegramInitData: string, botToken: string): Record<string, string> | null => {
  if (!telegramInitData) return null;

  try {
    const urlParams = new URLSearchParams(telegramInitData);
    const hash = urlParams.get("hash");
    if (!hash) return null;

    urlParams.delete("hash");

    // Sort params alphabetically
    const keys = Array.from(urlParams.keys()).sort();
    const dataCheckString = keys.map(key => `${key}=${urlParams.get(key)}`).join("\n");

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (calculatedHash === hash) {
      const data: Record<string, string> = {};
      for (const [key, value] of urlParams.entries()) {
        data[key] = value;
      }
      return data;
    }
  } catch (error) {
    console.error("Error validating initData", error);
  }
  return null;
};
