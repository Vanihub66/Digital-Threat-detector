/**
 * In-memory, per-tab cache for things we deliberately do NOT persist:
 * media preview object URLs and the raw text of a just-analysed message.
 * Cleared on reload, so sensitive content never reaches localStorage.
 */
const previews = new Map<string, string>();
const texts = new Map<string, string>();

export const sessionCache = {
  setPreview(id: string, url: string) {
    previews.set(id, url);
  },
  getPreview(id: string): string | undefined {
    return previews.get(id);
  },
  setText(id: string, text: string) {
    texts.set(id, text);
  },
  getText(id: string): string | undefined {
    return texts.get(id);
  },
  forget(id: string) {
    const url = previews.get(id);
    if (url) URL.revokeObjectURL(url);
    previews.delete(id);
    texts.delete(id);
  },
};
