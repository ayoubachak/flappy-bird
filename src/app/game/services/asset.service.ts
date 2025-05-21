import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  AUDIO_PATHS,
  BackgroundSkin,
  BIRD_SPRITES,
  BirdSkin,
  DEFAULT_ASSETS,
  GameAssets,
  PipeSkin,
  SPRITE_PATHS
} from '../models/game-assets.model';

export enum BirdAnimationFrame {
  UPFLAP = 0,
  MIDFLAP = 1,
  DOWNFLAP = 2
}

@Injectable({
  providedIn: 'root'
})
export class AssetService {
  private assets: GameAssets = DEFAULT_ASSETS;
  private loadedImages: Map<string, HTMLImageElement> = new Map();
  private loadedSounds: Map<string, HTMLAudioElement> = new Map();
  private assetsSubject = new BehaviorSubject<GameAssets>(this.assets);
  
  // Bird animation
  private birdAnimationFrame = BirdAnimationFrame.MIDFLAP;
  private birdAnimationDirection = 1; // 1 = going down, -1 = going up
  private birdFrameCount = 0;
  private birdAnimationSpeed = 100; // ms between frames
  
  // Base scrolling
  private baseOffset = 0;
  
  constructor() {
    this.preloadAssets();
  }
  
  getAssets(): Observable<GameAssets> {
    return this.assetsSubject.asObservable();
  }
  
  updateAssets(assets: Partial<GameAssets>): void {
    this.assets = { ...this.assets, ...assets };
    this.assetsSubject.next(this.assets);
  }
  
  getBirdSkin(): BirdSkin {
    return this.assets.bird;
  }
  
  getPipeSkin(): PipeSkin {
    return this.assets.pipes;
  }
  
  getBackgroundSkin(): BackgroundSkin {
    return this.assets.background;
  }
  
  setBirdSkin(skin: BirdSkin): void {
    this.assets.bird = skin;
    this.assetsSubject.next(this.assets);
  }
  
  setPipeSkin(skin: PipeSkin): void {
    this.assets.pipes = skin;
    this.assetsSubject.next(this.assets);
  }
  
  setBackgroundSkin(skin: BackgroundSkin): void {
    this.assets.background = skin;
    this.assetsSubject.next(this.assets);
  }
  
  private preloadAssets(): void {
    // Preload all bird skins (all animation frames)
    Object.values(BirdSkin).forEach(skin => {
      this.loadImage(BIRD_SPRITES[skin].upflap);
      this.loadImage(BIRD_SPRITES[skin].midflap);
      this.loadImage(BIRD_SPRITES[skin].downflap);
    });
    
    // Preload all pipe skins
    Object.values(PipeSkin).forEach(skin => {
      this.loadImage(SPRITE_PATHS.pipes[skin].src);
    });
    
    // Preload all background skins
    Object.values(BackgroundSkin).forEach(skin => {
      this.loadImage(SPRITE_PATHS.backgrounds[skin].src);
    });
    
    // Preload base
    this.loadImage(SPRITE_PATHS.base.src);
    
    // Preload sounds
    this.loadSound('die');
    this.loadSound('hit');
    this.loadSound('point');
    this.loadSound('swoosh');
    this.loadSound('wing');
  }
  
  private loadImage(src: string): HTMLImageElement {
    if (this.loadedImages.has(src)) {
      return this.loadedImages.get(src)!;
    }
    
    const img = new Image();
    img.onerror = () => {
      console.error(`Failed to load image: ${src}`);
    };
    img.src = src;
    this.loadedImages.set(src, img);
    return img;
  }
  
  private loadSound(soundName: string): HTMLAudioElement {
    if (this.loadedSounds.has(soundName)) {
      return this.loadedSounds.get(soundName)!;
    }
    
    const audio = new Audio();
    
    // Try to determine if the browser supports OGG or WAV better
    const soundPaths = AUDIO_PATHS[soundName as keyof typeof AUDIO_PATHS];
    const canPlayOgg = audio.canPlayType('audio/ogg') !== '';
    
    // Prefer OGG if supported (usually smaller file size), otherwise fall back to WAV
    audio.src = canPlayOgg ? soundPaths.ogg : soundPaths.wav;
    
    audio.onerror = () => {
      console.error(`Failed to load audio: ${audio.src}`);
      // If the preferred format fails, try the other format
      if (canPlayOgg) {
        audio.src = soundPaths.wav;
      } else {
        audio.src = soundPaths.ogg;
      }
    };
    
    this.loadedSounds.set(soundName, audio);
    return audio;
  }
  
  getImage(src: string): HTMLImageElement | undefined {
    return this.loadedImages.get(src);
  }
  
  getSound(soundName: string): HTMLAudioElement | undefined {
    return this.loadedSounds.get(soundName);
  }
  
  getCurrentBirdImage(): HTMLImageElement | undefined {
    const birdSprites = BIRD_SPRITES[this.assets.bird];
    let frameSrc: string;
    
    switch (this.birdAnimationFrame) {
      case BirdAnimationFrame.UPFLAP:
        frameSrc = birdSprites.upflap;
        break;
      case BirdAnimationFrame.DOWNFLAP:
        frameSrc = birdSprites.downflap;
        break;
      case BirdAnimationFrame.MIDFLAP:
      default:
        frameSrc = birdSprites.midflap;
        break;
    }
    
    return this.getImage(frameSrc);
  }
  
  getPipeImage(): HTMLImageElement | undefined {
    const pipeSrc = SPRITE_PATHS.pipes[this.assets.pipes].src;
    return this.getImage(pipeSrc);
  }
  
  getBackgroundImage(): HTMLImageElement | undefined {
    const bgSrc = SPRITE_PATHS.backgrounds[this.assets.background].src;
    return this.getImage(bgSrc);
  }
  
  getBaseImage(): HTMLImageElement | undefined {
    return this.getImage(SPRITE_PATHS.base.src);
  }
  
  // Update animation frames
  updateBirdAnimation(deltaTime: number): void {
    // Update the animation frame
    this.birdFrameCount += deltaTime;
    
    if (this.birdFrameCount > this.birdAnimationSpeed) {
      this.birdFrameCount = 0;
      
      // Cycle through animation frames
      // Sequence: midflap -> downflap -> midflap -> upflap -> midflap...
      if (this.birdAnimationFrame === BirdAnimationFrame.MIDFLAP) {
        this.birdAnimationFrame = this.birdAnimationDirection > 0 ? 
          BirdAnimationFrame.DOWNFLAP : BirdAnimationFrame.UPFLAP;
      } else {
        // After upflap or downflap, return to midflap and switch direction
        this.birdAnimationFrame = BirdAnimationFrame.MIDFLAP;
        this.birdAnimationDirection *= -1;
      }
    }
  }
  
  // Update base scrolling
  updateBaseScroll(speed: number): void {
    // Use base image width for proper scrolling
    const baseImage = this.getBaseImage();
    const baseWidth = baseImage && baseImage.complete ? baseImage.width : 336;
    
    // Update scroll offset
    this.baseOffset = (this.baseOffset - speed) % baseWidth;
    if (this.baseOffset > 0) {
      this.baseOffset -= baseWidth;
    }
  }
  
  getBaseOffset(): number {
    return this.baseOffset;
  }
  
  // Play sound
  playSound(soundName: 'die' | 'hit' | 'point' | 'swoosh' | 'wing'): void {
    const sound = this.getSound(soundName);
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(err => console.error(`Error playing ${soundName} sound:`, err));
    }
  }
  
  // Render methods to draw sprites with appropriate frames and offsets
  renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const bgImage = this.getBackgroundImage();
    
    if (!bgImage || !bgImage.complete || bgImage.naturalWidth === 0) {
      // Fallback to plain blue if image not loaded
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, width, height);
      return;
    }
    
    // Calculate how many times to repeat the background horizontally
    const bgWidth = bgImage.width;
    const repetitions = Math.ceil(width / bgWidth) + 1;
    
    // Draw tiled background
    for (let i = 0; i < repetitions; i++) {
      ctx.drawImage(bgImage, i * bgWidth, 0, bgWidth, height);
    }
  }
  
  renderBase(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const baseImage = this.getBaseImage();
    
    if (!baseImage || !baseImage.complete || baseImage.naturalWidth === 0) {
      // Fallback to brown ground if image not loaded
      ctx.fillStyle = '#7B5315';
      ctx.fillRect(0, height - 20, width, 20);
      return;
    }
    
    // Calculate base position (at bottom of canvas)
    const baseY = height - baseImage.height;
    
    // Calculate how many times to repeat the base horizontally
    const baseWidth = baseImage.width;
    const repetitions = Math.ceil(width / baseWidth) + 1;
    
    // Draw tiled base with scroll offset
    for (let i = 0; i < repetitions; i++) {
      const x = (i * baseWidth) + this.baseOffset;
      ctx.drawImage(baseImage, x, baseY, baseWidth, baseImage.height);
    }
  }
  
  renderBird(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, size: number): void {
    const birdImage = this.getCurrentBirdImage();
    
    if (!birdImage || !birdImage.complete || birdImage.naturalWidth === 0) {
      // Fallback to colored circle if image not loaded
      ctx.fillStyle = this.assets.bird === BirdSkin.YELLOW ? 'yellow' : 
                      this.assets.bird === BirdSkin.RED ? 'red' : 'blue';
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    
    // Apply rotation around the bird's center
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    // Calculate scale to match desired size
    const scale = size / birdImage.width;
    
    // Draw the bird image
    ctx.drawImage(
      birdImage,
      -birdImage.width * scale / 2,
      -birdImage.height * scale / 2,
      birdImage.width * scale,
      birdImage.height * scale
    );
    
    ctx.restore();
  }
  
  renderPipe(ctx: CanvasRenderingContext2D, x: number, topHeight: number, bottomY: number, width: number, height: number): void {
    const pipeImage = this.getPipeImage();
    
    if (!pipeImage || !pipeImage.complete || pipeImage.naturalWidth === 0) {
      // Fallback to colored rectangles if image not loaded
      ctx.fillStyle = this.assets.pipes === PipeSkin.GREEN ? 'green' : 'red';
      
      // Top pipe
      ctx.fillRect(x, 0, width, topHeight);
      
      // Bottom pipe
      ctx.fillRect(x, bottomY, width, height - bottomY);
      return;
    }
    
    // Draw top pipe (flipped vertically)
    ctx.save();
    ctx.translate(x + width / 2, topHeight / 2);
    ctx.scale(1, -1);
    ctx.drawImage(pipeImage, -width / 2, -topHeight / 2, width, topHeight);
    ctx.restore();
    
    // Draw bottom pipe
    ctx.drawImage(pipeImage, x, bottomY, width, height - bottomY);
  }
  
  // Set volume for all sounds
  setVolume(volume: number): void {
    Object.keys(AUDIO_PATHS).forEach(soundName => {
      const sound = this.getSound(soundName);
      if (sound) {
        sound.volume = volume;
      }
    });
  }
} 