export function hexToDecimal(hexString: string): string {
    return BigInt(hexString.startsWith("0x") ? hexString : "0x" + hexString).toString(10);
}

export function hexToString(hexString: string): string {
    return (hexString.match(/.{1,2}/g) || []) // Ensure match() doesn't return null
        .map(byte => String.fromCharCode(parseInt(byte, 16))) // Convert each byte to character
        .join("")
        .replace(/\x00/g, ""); // Remove null characters
}
