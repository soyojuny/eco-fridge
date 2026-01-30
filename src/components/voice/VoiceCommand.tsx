'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useItems } from '@/hooks/useItems';

// Web Speech API types
type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : never;

type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

export function VoiceCommand() {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionType> | null>(null);

  const { processVoiceCommand, isProcessingVoiceCommand } = useItems();

  // 파형 애니메이션을 위한 높이 값들 (고정값 사용)
  const [waveHeights] = useState([25, 35, 30, 40, 28]);

  // 브라우저 지원 여부를 클라이언트에서만 확인
  useEffect(() => {
    setIsMounted(true);
    setIsSupported(
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
    );
  }, []);

  // 음성 인식 시작
  const startListening = useCallback(() => {
    if (!isSupported) {
      toast.error('이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();

    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setState('listening');
      setTranscript('');
      setSheetOpen(true);
    };

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      setTranscript(text);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setState('error');

      if (event.error === 'not-allowed') {
        toast.error('마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
      } else if (event.error === 'no-speech') {
        toast.error('음성이 감지되지 않았습니다. 다시 시도해주세요.');
      } else {
        toast.error('음성 인식 중 오류가 발생했습니다.');
      }

      setTimeout(() => {
        setState('idle');
        setSheetOpen(false);
      }, 2000);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      // 인식이 끝났을 때 텍스트가 있으면 처리
      // 트랜스크립트가 있는 상태에서 listening이면 처리 진행
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported]);

  // 음성 인식 중지 및 처리
  const stopListeningAndProcess = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (!transcript.trim()) {
      setState('idle');
      setSheetOpen(false);
      return;
    }

    setState('processing');

    try {
      const result = await processVoiceCommand(transcript);

      if (result.success && result.results.length > 0) {
        const successResults = result.results.filter((r) => r.success);
        const failResults = result.results.filter((r) => !r.success);

        if (successResults.length > 0) {
          const messages = successResults.map((r) => {
            switch (r.action) {
              case 'ADD':
                return `${r.itemName} 추가됨`;
              case 'CONSUME':
                return `${r.itemName} 소비 완료`;
              case 'DISCARD':
                return `${r.itemName} 폐기 처리`;
              case 'UPDATE':
                return `${r.itemName} 수정됨`;
              default:
                return `${r.itemName} 처리됨`;
            }
          });
          toast.success(messages.join(', '));
        }

        if (failResults.length > 0) {
          failResults.forEach((r) => {
            toast.error(r.error || `${r.itemName || '품목'} 처리 실패`);
          });
        }
      }

      setState('idle');
      setTranscript('');
      setSheetOpen(false);
    } catch (error) {
      console.error('Voice command error:', error);
      toast.error(error instanceof Error ? error.message : '명령을 처리할 수 없습니다.');
      setState('error');

      setTimeout(() => {
        setState('idle');
        setSheetOpen(false);
      }, 2000);
    }
  }, [transcript, processVoiceCommand]);

  // 취소
  const handleCancel = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setState('idle');
    setTranscript('');
    setSheetOpen(false);
  }, []);

  // FAB 클릭 핸들러
  const handleFabClick = useCallback(() => {
    if (state === 'idle') {
      startListening();
    } else if (state === 'listening') {
      stopListeningAndProcess();
    }
  }, [state, startListening, stopListeningAndProcess]);

  // 브라우저 미지원 시 또는 마운트 전에는 렌더링 안 함
  if (!isMounted || !isSupported) {
    return null;
  }

  const getStateTitle = () => {
    switch (state) {
      case 'listening':
        return '듣고 있어요...';
      case 'processing':
        return '처리 중...';
      case 'error':
        return '오류 발생';
      default:
        return '음성 명령';
    }
  };

  const getStateDescription = () => {
    switch (state) {
      case 'listening':
        return '명령을 말씀해주세요. 완료되면 버튼을 다시 눌러주세요.';
      case 'processing':
        return 'AI가 명령을 분석하고 있습니다.';
      case 'error':
        return '다시 시도해주세요.';
      default:
        return '';
    }
  };

  return (
    <>
      {/* FAB Button */}
      <Button
        onClick={handleFabClick}
        disabled={state === 'processing' || isProcessingVoiceCommand}
        className="fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg bg-green-600 hover:bg-green-700"
        size="icon"
      >
        {state === 'processing' || isProcessingVoiceCommand ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : state === 'listening' ? (
          <MicOff className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </Button>

      {/* Voice Command Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(open) => !open && handleCancel()}>
        <SheetContent side="bottom" className="h-auto max-h-[50vh] rounded-t-2xl">
          <SheetHeader className="text-center">
            <SheetTitle>{getStateTitle()}</SheetTitle>
            <SheetDescription>{getStateDescription()}</SheetDescription>
          </SheetHeader>

          <div className="flex flex-col items-center gap-4 py-6">
            {/* 파형 애니메이션 */}
            {state === 'listening' && (
              <div className="flex items-center justify-center gap-1 h-12">
                {waveHeights.map((height, i) => (
                  <div
                    key={i}
                    className="w-1 bg-green-600 rounded-full animate-pulse"
                    style={{
                      height: `${height}px`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '0.5s',
                    }}
                  />
                ))}
              </div>
            )}

            {/* 처리 중 스피너 */}
            {(state === 'processing' || isProcessingVoiceCommand) && (
              <div className="flex items-center justify-center h-12">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              </div>
            )}

            {/* 인식된 텍스트 */}
            {transcript && (
              <div className="bg-gray-100 rounded-lg p-4 w-full text-center">
                <p className="text-lg font-medium text-gray-800">{'"'}{transcript}{'"'}</p>
              </div>
            )}

            {/* 버튼 영역 */}
            <div className="flex gap-3 w-full max-w-xs">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
                disabled={state === 'processing'}
              >
                <X className="h-4 w-4 mr-2" />
                취소
              </Button>
              {state === 'listening' && (
                <Button
                  onClick={stopListeningAndProcess}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  완료
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
