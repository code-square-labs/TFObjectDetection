import {ChangeDetectorRef, Component, ElementRef, NgZone, OnInit, ViewChild} from '@angular/core';

import * as cocoSSD from '@tensorflow-models/coco-ssd';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  @ViewChild('fileUpload') fileUpload: ElementRef;
  @ViewChild('chosenImage') img: ElementRef;

  model;
  requesting;
  error;

  constructor(private changeDetectorRef: ChangeDetectorRef, private zone: NgZone) {
  }

  ngOnInit() {
    cocoSSD.load('lite_mobilenet_v2').then((model: any) => {
      this.model = model;
      console.log('model loaded');
    });
  }

  public async predictWithCocoModel() {
    this.model = await cocoSSD.load('lite_mobilenet_v2');
    console.log('model loaded');
    this.model.detect(this.img.nativeElement).then(predictions => {
      console.log(predictions);
      this.renderPredictions(predictions);
    });
  }

  public fileChangeEvent(event: any): void {
    const file = event.target.files[0];
    if (!file || !file.type.match('image.*')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = this.onLoadCallback.bind(this);
    reader.readAsDataURL(file);
  }

  onLoadCallback = (event) => {
    const canvas = <HTMLCanvasElement>document.getElementById('canvas');
    const context = canvas.getContext('2d');

    context.clearRect(0, 0, canvas.width, canvas.height);

    this.img.nativeElement.src = event.target['result'];
    this.error = null;
    this.requesting = true;

    this.changeDetectorRef.detectChanges();

    setTimeout(() => {
      this.model.detect(this.img.nativeElement).then(predictions => {
        this.requesting = false;
        console.log(predictions);
        this.renderPredictions(predictions);
      }, (error) => {
        this.requesting = false;
        error = this.error;
      });
    }, 300);
  };

  renderPredictions = predictions => {
    const canvas = <HTMLCanvasElement>document.getElementById('canvas');

    const ctx = canvas.getContext('2d');

    canvas.width = this.img.nativeElement.width;
    canvas.height = this.img.nativeElement.height;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // Font options.
    const font = '16px sans-serif';
    ctx.font = font;
    ctx.textBaseline = 'top';
    ctx.drawImage(this.img.nativeElement, 0, 0, this.img.nativeElement.width, this.img.nativeElement.height);

    predictions.forEach(prediction => {
      const x = prediction.bbox[0];
      const y = prediction.bbox[1];
      const width = prediction.bbox[2];
      const height = prediction.bbox[3];
      // Draw the bounding box.
      ctx.strokeStyle = '#00FFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      // Draw the label background.
      ctx.fillStyle = '#00FFFF';
      const textWidth = ctx.measureText(Number(prediction.score * 100).toFixed(1) + '% ' + prediction.class).width;
      const textHeight = parseInt(font, 10); // base 10
      ctx.fillRect(x, y, textWidth + 4, textHeight + 4);
    });

    predictions.forEach(prediction => {
      const x = prediction.bbox[0];
      const y = prediction.bbox[1];
      // Draw the text last to ensure it's on top.
      ctx.fillStyle = '#000000';
      ctx.fillText(Number(prediction.score * 100).toFixed(1) + '% ' + prediction.class, x, y);
    });

    this.img.nativeElement.src = '';
  };
}
