# -*- coding: utf-8 -*-
"""
WAYANG DIGITAL - SMK TARUNA JAYA PRAWIRA TUBAN
Local web server for the offline interactive AI puppet theater package.
"""
from functools import partial
from http.server import SimpleHTTPHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser
import sys

ROOT = Path(__file__).resolve().parent / 'web'

class Handler(SimpleHTTPHandler):
    extensions_map = {
        **SimpleHTTPHandler.extensions_map,
        '.mjs': 'text/javascript',
        '.js': 'text/javascript',
        '.wasm': 'application/wasm',
        '.task': 'application/octet-stream',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.ico': 'image/x-icon',
        '.mp3': 'audio/mpeg',
    }

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Permissions-Policy', 'camera=(self), microphone=()')
        self.send_header(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; "
            "object-src 'none'; base-uri 'self'"
        )
        super().end_headers()

    def list_directory(self, path):
        self.send_error(403, 'Daftar folder dinonaktifkan')
        return None

    def log_message(self, format, *args):
        pass

def main():
    if not ROOT.is_dir():
        print('[ERROR] Direktori web/ tidak ditemukan!', file=sys.stderr)
        sys.exit(1)

    model_path = ROOT / 'hand_landmarker.task'
    if not model_path.is_file():
        print('[ERROR] File model AI (hand_landmarker.task) tidak ditemukan di folder web/.', file=sys.stderr)
        print('Pastikan Anda telah mengekstrak seluruh arsip secara lengkap.', file=sys.stderr)
        sys.exit(1)

    server = None
    for port in (8089, 8080, 0):
        try:
            server = ThreadingHTTPServer(('127.0.0.1', port), partial(Handler, directory=str(ROOT)))
            break
        except OSError:
            continue

    if not server:
        print('[ERROR] Gagal membuka port server lokal.', file=sys.stderr)
        sys.exit(1)

    port = server.server_port
    url = f'http://127.0.0.1:{port}/'

    print()
    print('================================================================')
    print('   WAYANG DIGITAL - SMK TARUNA JAYA PRAWIRA TUBAN')
    print('   Pagelaran Wayang Kulit Interaktif Berbasis AI (Offline)')
    print('================================================================')
    print()
    print(f'-> Server lokal aktif di: {url}')
    print('-> Membuka peramban Microsoft Edge / Google Chrome...')
    print()
    print('Petunjuk Penggunaan:')
    print('  1. Klik tombol "Mulai kamera" di layar pembuka.')
    print('  2. Pilih "Izinkan / Allow" saat peramban meminta akses kamera.')
    print('  3. Gerakkan tangan di depan kamera untuk memainkan wayang.')
    print('  4. Tekan tombol [H] untuk menyembunyikan/menampilkan antarmuka.')
    print('  5. Tekan Ctrl+C di jendela ini untuk menghentikan server.')
    print('================================================================')
    print(flush=True)

    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\n[INFO] Server dihentikan oleh pengguna. Sampai jumpa!')
    finally:
        server.server_close()

if __name__ == '__main__':
    main()
