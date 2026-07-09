/**
 * Fonnte WhatsApp API utility
 * Handles sending WhatsApp messages via Fonnte service
 */

export interface SendWhatsAppParams {
  target: string;
  message: string;
  countryCode?: string;
}

export interface FontteResponse {
  status: boolean;
  message?: string;
  detail?: string;
}

/**
 * Send WhatsApp message via Fonnte API
 * @param params - Parameters for sending message
 * @returns Promise with the API response
 */
export async function sendWhatsAppMessage(
  params: SendWhatsAppParams
): Promise<FontteResponse> {
const apiKey = process.env.FONNTE_API_KEY;

  if (!apiKey) {
 throw new Error("FONNTE_API_KEY is not configured");
  }

  const formData = new FormData();
  formData.append("target", params.target);
  formData.append("message", params.message);
  formData.append("countryCode", params.countryCode || "62");

  try {
    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: apiKey,
   },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Fonnte API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
    throw error;
  }
}

/**
 * Send OTP via WhatsApp
 * @param phone - Phone number (without country code)
 * @param otp - OTP code
 * @returns Promise with the API response
 */
export async function sendOTPWhatsApp(
  phone: string,
  otp: string
): Promise<FontteResponse> {
  const message = `*KopasNow Mart* - Kode OTP Anda:\n\n*${otp}*\n\nKode ini berlaku selama 5 menit. Jangan bagikan kode ini kepada siapapun.`;

  return sendWhatsAppMessage({
    target: phone,
    message,
    countryCode: "62",
  });
}
