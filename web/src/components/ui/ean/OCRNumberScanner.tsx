'use client';

import { useEffect, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';
import type { Worker } from 'tesseract.js';

interface OCRNumberScannerProps {
    onDetected: (ean: string) => void;
}

export default function OCRNumberScanner({ onDetected }: OCRNumberScannerProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [scanning, setScanning] = useState(false);
    const [worker, setWorker] = useState<Worker | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const startCamera = async () => {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
        };

        const initWorker = async () => {
            const w = await createWorker('eng', 1, {
                logger: (m) => console.log(m),
            });
            setWorker(w);
        };

        startCamera();
        initWorker();

        return () => {
            // stop kamera
            if (videoRef.current?.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
            }
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (worker) worker.terminate();
        };
    }, []);

    const startScanning = async () => {
        if (!videoRef.current || !worker) return;

        setScanning(true);
        intervalRef.current = setInterval(async () => {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current!.videoWidth;
            canvas.height = videoRef.current!.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(videoRef.current!, 0, 0, canvas.width, canvas.height);

            const { data } = await worker.recognize(canvas);
            const cleaned = data.text.replace(/\D/g, '');
            console.log('OCR result:', cleaned);

            if (cleaned.length >= 13) {
                onDetected(cleaned.slice(0, 13));
                stopScanning();
            }
        }, 1500); // každých 1.5 sekundy
    };

    const stopScanning = () => {
        setScanning(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
    };

    return (
        <div className="mt-4">
            <video ref={videoRef} className="w-full max-w-sm rounded border shadow" autoPlay muted playsInline />
            <div className="mt-2 flex gap-2">
                <button
                    onClick={startScanning}
                    disabled={scanning}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                >
                    {scanning ? 'Skenuji…' : 'Spustit OCR'}
                </button>
                {scanning && (
                    <button
                        onClick={stopScanning}
                        className="bg-gray-600 text-white px-4 py-2 rounded"
                    >
                        Zastavit
                    </button>
                )}
            </div>
            <p className="text-sm text-gray-500 mt-2">Zaměř foťák na čísla pod čárovým kódem</p>
        </div>
    );
}
