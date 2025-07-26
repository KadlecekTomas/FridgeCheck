'use client';

import { useRef, useState } from 'react';
import {
    Html5Qrcode,
    Html5QrcodeSupportedFormats,
} from 'html5-qrcode';

interface Props {
    onResult: (ean: string) => void;
}

export default function EANFileScanner({ onResult }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);

    const handleFileScan = async (file: File) => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            // 👇 typové obejití – protože typy nejsou správně deklarované
            const scanner = new Html5Qrcode('html5-qrcode-file-scan') as any;

            const ean: string = await scanner.scanFile(file, {
                formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13],
            });

            setResult(ean);
            onResult(ean);
        } catch (err) {
            setError('❌ Nepodařilo se načíst EAN z obrázku.');
            console.error('Scan error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-6 p-4 border rounded bg-gray-50">
            <h2 className="font-semibold text-lg mb-2">📷 Načíst EAN z obrázku</h2>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileScan(file);
                }}
                className="block mb-2 text-sm"
            />

            {loading && (
                <p className="text-sm text-gray-600">🔄 Načítám obrázek…</p>
            )}

            {result && (
                <p className="text-green-700 text-sm mt-2">
                    ✅ Načtený EAN: <span className="font-mono">{result}</span>
                </p>
            )}

            {error && (
                <p className="text-red-600 text-sm mt-2">{error}</p>
            )}

            {/* Required div pro scanFile – zůstane skrytý */}
            <div id="html5-qrcode-file-scan" style={{ display: 'none' }} />
        </div>
    );
}
