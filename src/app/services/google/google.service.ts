import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GoogleService {

  private sdkLoaded = false;

  loadSdk(): Promise<void> {
    return new Promise((resolve) => {
      if (this.sdkLoaded) return resolve();

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.sdkLoaded = true;
        resolve();
      };
      document.head.appendChild(script);
    });
  }
}
