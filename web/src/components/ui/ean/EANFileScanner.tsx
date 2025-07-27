'use client';

import { useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';

interface EANCameraScannerProps {
    onDetected: (ean: string) => void;
}

export default function EANCameraScanner({ onDetected }: EANCameraScannerProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
    const controlsRef = useRef<IScannerControls | null>(null); // uchovává stop kontroler

    useEffect(() => {
        const codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;

        BrowserMultiFormatReader.listVideoInputDevices()
            .then((videoInputDevices: MediaDeviceInfo[]) => {
                if (videoInputDevices.length === 0) return;
                const deviceId = videoInputDevices[0].deviceId;

                codeReader
                    .decodeFromVideoDevice(deviceId, videoRef.current!, (result, error, controls) => {
                        if (controls) controlsRef.current = controls;

                        if (result) {
                            const code = result.getText();
                            if (/^\d{13}$/.test(code)) {
                                onDetected(code);
                                controlsRef.current?.stop(); // 💥 správné ukončení skenování
                            }
                        }
                    })
                    .catch((err) => {
                        console.error('Chyba při spuštění skenování:', err);
                    });
            })
            .catch((err) => {
                console.error('Chyba při načítání kamer:', err);
            });

        return () => {
            controlsRef.current?.stop(); // 💡 stop on unmount
        };
    }, [onDetected]);

    return (
        <div className="mt-4">
            <video
                ref={videoRef}
                className="w-full max-w-sm rounded border shadow"
                autoPlay
                muted
            />
            <p className="text-sm text-gray-500 mt-2">Namíř kameru na EAN-13 kód</p>
        </div>
    );
}
