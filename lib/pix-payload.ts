import { supportConfig } from "@/lib/support-config";

function tlv(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function normalizePixText(value: string, maxLength: number) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9 $%*+\-./:]/g, " ").replace(/\s+/g, " ").trim().toUpperCase().slice(0, maxLength);
}

function crc16Ccitt(value: string) {
  let crc = 0xffff;
  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Generates the static BR Code (EMV) payload used by both the QR and copy action. */
export function createPixPayload() {
  const { city, key, message, name } = supportConfig.pix;
  if (!key || !name || !city) return "";
  const merchantAccount = tlv("00", "BR.GOV.BCB.PIX") + tlv("01", key);
  const txid = normalizePixText(message, 25) || "APOIO";
  const payload = [tlv("00", "01"), tlv("26", merchantAccount), tlv("52", "0000"), tlv("53", "986"), tlv("58", "BR"), tlv("59", normalizePixText(name, 25)), tlv("60", normalizePixText(city, 15)), tlv("62", tlv("05", txid)), "6304"].join("");
  return `${payload}${crc16Ccitt(payload)}`;
}
