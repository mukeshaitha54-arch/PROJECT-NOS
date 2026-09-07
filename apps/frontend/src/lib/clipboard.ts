/**
 * Bulletproof clipboard helper that works in both HTTPS secure contexts
 * and non-secure HTTP contexts (such as IP or local domain deployments).
 */
export const safeCopyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;

  // 1. Try modern Clipboard API if available
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to textarea fallback
    }
  }

  // 2. Legacy / HTTP fallback using textarea + execCommand
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    return false;
  }
};
