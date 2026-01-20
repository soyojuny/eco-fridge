'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Camera, Upload, X, RotateCcw, Check, Receipt, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

type ScanMode = 'receipt' | 'product';

interface ParsedItem {
  name: string;
  category: string;
  expiry_date: string | null;
  storage_method: 'fridge' | 'freezer' | 'pantry';
  is_estimated: boolean;
}

interface ScannerProps {
  onItemsParsed: (items: ParsedItem[]) => void;
}

export function Scanner({ onItemsParsed }: ScannerProps) {
  const [mode, setMode] = useState<ScanMode>('receipt');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async (fMode: 'environment' | 'user') => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: fMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.error('Video play failed:', playError);
          toast.error('카메라 영상을 재생할 수 없습니다.');
          return;
        }
      }

      setStream(mediaStream);
      setIsCapturing(true);
      setFacingMode(fMode);
    } catch (error) {
      console.error('Camera access error:', error);
      toast.error('카메라에 접근할 수 없습니다. 권한을 확인해주세요.');
      setIsCapturing(false);
    }
  }, [stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  }, [stream]);

  const toggleCamera = useCallback(() => {
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(newFacingMode);
  }, [facingMode, startCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      stopCamera();
    }
  }, [stopCamera, facingMode]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드할 수 있습니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const resetCapture = useCallback(() => {
    setCapturedImage(null);
    stopCamera();
  }, [stopCamera]);

  const parseImage = useCallback(async () => {
    if (!capturedImage) return;

    setIsParsing(true);
    try {
      const response = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedImage, mode }),
      });

      if (!response.ok) {
        throw new Error('파싱에 실패했습니다.');
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        onItemsParsed(data.items);
        toast.success(`${data.items.length}개의 품목을 인식했습니다.`);
        resetCapture();
      } else {
        toast.error('인식된 품목이 없습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('이미지 분석에 실패했습니다.');
    } finally {
      setIsParsing(false);
    }
  }, [capturedImage, mode, onItemsParsed, resetCapture]);

  return (
    <div className="flex flex-col gap-4">
      {/* Mode Selection */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={mode === 'receipt' ? 'default' : 'outline'}
          onClick={() => setMode('receipt')}
          className={mode === 'receipt' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          <Receipt className="w-4 h-4 mr-2" />
          영수증 모드
        </Button>
        <Button
          variant={mode === 'product' ? 'default' : 'outline'}
          onClick={() => setMode('product')}
          className={mode === 'product' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          <Package className="w-4 h-4 mr-2" />
          제품 모드
        </Button>
      </div>

      <p className="text-sm text-gray-500 text-center">
        {mode === 'receipt'
          ? '영수증을 촬영하면 여러 품목을 한 번에 등록할 수 있습니다.'
          : '제품의 라벨이나 유통기한을 촬영하세요.'}
      </p>

      {/* Camera / Preview Area */}
      <Card className="relative aspect-[3/4] bg-gray-900 overflow-hidden">
        {isCapturing && !capturedImage && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover bg-black"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="border-2 border-white/50 rounded-lg w-[80%] h-[70%]" />
            </div>
            <div className="absolute top-2 right-2">
                <Button variant="outline" size="icon" onClick={toggleCamera}>
                    <RotateCcw className="w-4 h-4" />
                </Button>
            </div>
          </>
        )}

        {capturedImage && (
          <Image
            src={capturedImage}
            alt="Captured"
            fill
            className="object-contain bg-black"
            unoptimized
          />
        )}

        {!isCapturing && !capturedImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4">
            <Camera className="w-16 h-16 text-gray-400" />
            <p className="text-gray-400">카메라를 시작하거나 이미지를 업로드하세요</p>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!isCapturing && !capturedImage && (
          <>
            <Button
              onClick={() => startCamera(facingMode)}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Camera className="w-4 h-4 mr-2" />
              카메라 시작
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              갤러리
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </>
        )}

        {isCapturing && !capturedImage && (
          <>
            <Button
              variant="outline"
              onClick={stopCamera}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              취소
            </Button>
            <Button
              onClick={capturePhoto}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Camera className="w-4 h-4 mr-2" />
              촬영
            </Button>
          </>
        )}

        {capturedImage && (
          <>
            <Button
              variant="outline"
              onClick={resetCapture}
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              다시 촬영
            </Button>
            <Button
              onClick={parseImage}
              disabled={isParsing}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isParsing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  분석 중...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  AI 분석
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
