import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  error?: string;
  transcript?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VoiceService {
  private synth = window.speechSynthesis;
  private recognition: any;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private animationId: number | null = null;

  private voices: SpeechSynthesisVoice[] = [];
  // 1. Rendre stateSubject privé
  private stateSubject = new BehaviorSubject<VoiceState>({
    isListening: false,
    isSpeaking: false
  });

  // ✅ AJOUTER ce flag pour tracker l'arrêt manuel
  private isUserStopped = false;

  // 2. Ajouter une méthode publique pour reset le transcript
  resetTranscript(): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      transcript: undefined
    });
  }

  // 3. Garder state$ public pour l'UI
  public state$: Observable<VoiceState> = this.stateSubject.asObservable();

  // Callback pour le résultat STT
  public onTranscript?: (text: string) => void;

  constructor(private ngZone: NgZone) {
    this.initRecognition();
    this.loadVoices();
  }

  private initRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'fr-FR';
      this.recognition.interimResults = false;
      this.recognition.continuous = true;

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.ngZone.run(() => {
          this.stateSubject.next({ ...this.stateSubject.value, transcript });
          if (this.onTranscript) this.onTranscript(transcript);
        });
      };

      this.recognition.onstart = () => {
        this.ngZone.run(() => {
          this.stateSubject.next({
            ...this.stateSubject.value,
            isListening: true,
            error: undefined
          });
        });
      };

      this.recognition.onend = () => {
        this.ngZone.run(() => {

          if (this.isUserStopped) {
            this.isUserStopped = false; // reset le flag
            this.stateSubject.next({
              ...this.stateSubject.value,
              isListening: false
            });
          }

        });
      };



      this.recognition.onerror = (event: any) => {
        this.ngZone.run(() => {
          const errorMsg = this.getErrorMessage(event.error);
          this.stateSubject.next({
            ...this.stateSubject.value,
            isListening: false,
            error: errorMsg
          });
        });
      };
    }
  }

  private loadVoices() {
    const load = () => {
      this.voices = this.synth.getVoices();
    };
    load();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = load;
    }
  }

  private getErrorMessage(error: string): string {
    const errors: Record<string, string> = {
      'not-allowed': 'Permission microphone refusée',
      'no-speech': 'Aucun son détecté',
      'audio-capture': 'Microphone non trouvé',
      'network': 'Erreur réseau'
    };
    return errors[error] || 'Erreur de reconnaissance';
  }

  // === TEXT-TO-SPEECH ===
  speak(text: string, onEnd?: () => void): void {
    if (!this.synth) return;

    // Annuler toute lecture en cours
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Sélectionner voix française
    const frVoice = this.voices.find(v => v.lang.includes('fr'));
    if (frVoice) utterance.voice = frVoice;

    utterance.lang = 'fr-FR';
    utterance.rate = 1;

    utterance.onstart = () => {
      this.ngZone.run(() => {
        this.stateSubject.next({
          ...this.stateSubject.value,
          isSpeaking: true
        });
      });
    };

    utterance.onend = () => {
      this.ngZone.run(() => {
        this.stateSubject.next({
          ...this.stateSubject.value,
          isSpeaking: false
        });
        if (onEnd) onEnd();
      });
    };

    utterance.onerror = () => {
      this.ngZone.run(() => {
        this.stateSubject.next({
          ...this.stateSubject.value,
          isSpeaking: false
        });
      });
    };

    this.synth.speak(utterance);
  }

  cancelSpeech(): void {
    if (this.synth) {
      this.synth.cancel();
      this.ngZone.run(() => {
        this.stateSubject.next({
          ...this.stateSubject.value,
          isSpeaking: false
        });
      });
    }
  }

  isSpeaking(): boolean {
    return this.synth?.speaking ?? false;
  }

  // === SPEECH-TO-TEXT ===
  startListening(onTranscript: (text: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject('SpeechRecognition non supporté');
        return;
      }

      this.onTranscript = onTranscript;

      try {
        this.recognition.start();
        resolve();
      } catch (e) {
        // Déjà en cours d'écoute
        reject('Déjà en écoute');
      }
    });
  }

  stopListening(): void {
    if (this.recognition) {
      // ✅ Marquer que l'arrêt vient de l'utilisateur
      this.isUserStopped = true;
      this.recognition.stop();
    }
  }

  // === VISUALIZER ===
  async startVisualizer(canvas: HTMLCanvasElement): Promise<void> {
    if (!canvas) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.source = this.audioContext.createMediaStreamSource(this.stream);

      this.analyser.fftSize = 2048;
      this.source.connect(this.analyser);

      // ✅ AJOUTER CETTE LIGNE (critique !)
      this.isActive = true;

      this.setupCanvas(canvas);
      this.drawVisualizer(canvas);
    } catch (err) {
      console.error('Erreur Visualizer:', err);
      throw err;
    }
  }

  private setupCanvas(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }

  private drawVisualizer(canvas: HTMLCanvasElement) {
    if (!this.analyser || !this.isActive) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!this.isActive || !this.analyser) return;

      this.animationId = requestAnimationFrame(draw);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyser.getByteTimeDomainData(dataArray);

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#4f46e5'; // Couleur primaire
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };

    draw();
  }

  private isActive = false;

  stopVisualizer(): void {
    this.isActive = false;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  // === UTILITIES ===
  isSupported(): boolean {
    return !!(
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    );
  }

  cleanup(): void {
    this.cancelSpeech();
    this.stopListening();
    this.stopVisualizer();
  }
}