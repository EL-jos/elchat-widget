import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.css']
})
export class SpinnerComponent {
  /** Taille du spinner en px (default 50) */
  @Input() size: number = 50;
  /** Couleur du spinner (default primary) */
  @Input() color: string = '#3f51b5';
}
