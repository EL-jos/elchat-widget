import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BrowserService {

  isInIframe(): boolean {
    return window.self !== window.top;
  }

  isChromeFamily(): boolean {
    const ua = navigator.userAgent;
    return /Chrome|Edg|Brave/.test(ua);
  }

  /* supportsGoogleInIframe(): boolean {
    // Si pas dans iframe → OK
    if (!this.isInIframe()) return true;

    // Si Chrome-family dans iframe → bloqué
    if (this.isChromeFamily()) return false;

    return true;
  } */

  supportsGoogleInIframe(): boolean {

    if (window.self !== window.top) {

      const isChromium = !!(window as any).chrome;

      const fedcmBlocked = isChromium;

      if (fedcmBlocked) return false;
    }

    return true;
  }
}
