# 🎭 Wayang Digital - SMK Taruna Jaya Prawira Tuban

[![Platform: Windows Offline](https://img.shields.io/badge/Platform-Windows_10%2F11_Offline-0078D6?logo=windows&logoColor=white)](https://github.com/)
[![Graphics: WebGL2 60FPS](https://img.shields.io/badge/Graphics-WebGL2_HDR_Bloom-F39C12?logo=webgl&logoColor=white)](https://github.com/)
[![AI: MediaPipe Vision](https://img.shields.io/badge/AI-MediaPipe_Hand_Tracking-4285F4?logo=google&logoColor=white)](https://github.com/)
[![Institution: SMK Taruna Jaya Prawira Tuban](https://img.shields.io/badge/Institution-SMK_Taruna_Jaya_Prawira_Tuban-D4AF37)](https://github.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-2ECC71.svg)](LICENSE)

> **Pagelaran Wayang Kulit Digital Interaktif Berbasis Kecerdasan Buatan (AI)**  
> Karya Inovasi Pelestarian Budaya Nusantara oleh **SMK Taruna Jaya Prawira Tuban**.

---

## 🌟 Sekilas Tentang Aplikasi

**Wayang Digital** adalah perangkat lunak panggung wayang kulit interaktif yang memungkinkan siapa saja menjadi dalang secara langsung di depan komputer. Menggunakan kamera web (*webcam*) biasa, kecerdasan buatan (*AI Computer Vision*) melacak posisi kedua tangan dalang secara *real-time* untuk menggerakkan badan (*gapit*) dan kedua lengan (*tuding*) wayang di atas kelir digital beresolusi tinggi, diiringi alunan musik gamelan Jawa autentik serta efek suara keprak/cempala.

Aplikasi ini dirancang **100% luring (offline)** tanpa ketergantungan internet, tanpa *cloud*, dan tanpa memerlukan instalasi perangkat lunak yang rumit.

---

## ✨ Fitur-Fitur Utama

### 1. 🤖 Pelacakan Tangan AI Offline (*Real-time Hand Tracking*)
- Menggunakan model **MediaPipe Vision (Google)** yang berjalan secara lokal via WebAssembly (WASM).
- **Tangan Kiri**: Mengendalikan wayang kiri (*Default:* **Raden Bima**).
- **Tangan Kanan**: Mengendalikan wayang kanan (*Default:* **Prabu Rahwana**).
- **Pengendali Gapit (Badan)**: Mengikuti gerakan telapak tangan, kemiringan tangan (*tilt*), dan kedekatan dengan kamera (bayangan kelir menjadi lebih besar dan lembut).
- **Balik Telapak Tangan**: Membalik arah hadap wayang secara otomatis saat telapak tangan dibalik menghadap/membelakangi kamera.
- **Pengendali Tuding (Lengan)**: Menggunakan **Jempol + Kelingking** secara alami layaknya dalang memegang tuding bambu.

### 2. 🎵 Gerak Otomatis Ritmik Gamelan (*Idle Auto-Motion*)
- Bila tangan dalang tidak bergerak selama ~2,2 detik, kedua wayang akan **otomatis bergerak dan menari mengikuti irama gamelan (*wirama*)**.
- Gerakan kedua wayang **asimetris dan berkarakter unik**:
  - **Raden Bima (*Gagahan*)**: Tegak, mantap, melangkah berwibawa dalam siklus 4 dan 8 ketukan (*gongan*), tuding menuding ke depan.
  - **Prabu Rahwana (*Kasar / Buta*)**: Liar, dinamis, kepala bergetar amarah, kedua lengan mengacung garang menantang lawan.

### 3. 💥 Jurus Kasekten & Aji-aji Sakti (*Special FX*)
- **Bima [Tombol J]**: Jurus *Kuku Pancanaka* & *Gada Rujakpala* (kilatan petir emas-oranye, guncangan layar panggung, dan lontaran partikel energi prana).
- **Rahwana [Tombol L]**: Aji-aji *Pancasona* & *Rawarontek* (semburan api magis merah keunguan, aura kegelapan menyala, dan raungan suara dahsyat).

### 4. 🌅 Tata Cahaya Kelir Dinamis (*Atmospheric Lighting*)
- Tekan **[B]** untuk mengganti suasana panggung:
  - **Malam Klasik**: Kelir temaram dengan nyala lampu *blencong* minyak kelapa hangat berkelip (*candle flicker*).
  - **Senja Mistis**: Langit tembaga keemasan dengan bayangan pekat dramatis.
  - **Siang Cerah**: Terang benderang untuk latihan detail gerak anatomi wayang.

### 5. 📽️ Perekam Pertunjukan (*Video Recorder*)
- Tekan **[R]** untuk merekam lakon dalang langsung ke berkas video resolusi tinggi (`.webm`).
- Sangat cocok untuk tugas sekolah seni budaya, ujian praktik kejuruan, dokumentasi pentas, maupun konten edukasi media sosial.

### 6. 🍃 Gunungan Buka & Tutup (*Kayon*)
- Tekan **[Spasi]** untuk menancapkan Gunungan di tengah kelir panggung sebagai tanda pembuka atau penutup lakon (*tancep kayon*).

---

## 🚀 Panduan Menjalankan Aplikasi

### Opsi A: Pengguna Windows (Paket Rilis 1-Klik)
1. Unduh paket rilis `.zip` dari halaman GitHub Releases.
2. Ekstrak seluruh isi folder ZIP ke komputer Anda.
3. Klik ganda berkas **`MULAI-WAYANG.bat`**.
4. Peramban web akan terbuka otomatis ke alamat `http://127.0.0.1:8089/`.
5. Klik tombol **"Mulai kamera"** dan izinkan akses webcam. Panggung wayang siap dimainkan!

### Opsi B: Pengembang & Pengguna Git (Developer)
1. Klon repositori ini:
   ```bash
   git clone https://github.com/smktjptuban/wayang-digital.git
   cd wayang-digital
   ```
2. Jalankan server lokal:
   - **Dengan Python**:
     ```bash
     python server.py
     ```
   - **Atau dengan Node.js**:
     ```bash
     npx serve web -p 8089
     ```
3. Buka peramban di `http://localhost:8089/`.

---

## 🎮 Panduan Kendali & Tombol Pintas

### Kendali Tangan (Webcam AI)
| Gerakan Tangan Dalang | Efek pada Wayang di Layar |
| :--- | :--- |
| **Geser Telapak Tangan** | Menggerakkan badan wayang (*gapit*) ke segala arah |
| **Maju / Mundur ke Kamera** | Mengatur jarak wayang ke kelir (efek bayangan *blencong*) |
| **Balik Arah Telapak** | Membalik arah hadap wayang (menghadap kiri / kanan) |
| **Ujung Jempol (Thumb)** | Menggerakkan lengan depan wayang (*forearm*) |
| **Ujung Kelingking (Pinky)** | Menggerakkan lengan belakang wayang (*forearm*) |

### Tombol Pintas Keyboard
| Tombol | Fungsi |
| :---: | :--- |
| `[Spasi]` | Tancapkan / Cabut Gunungan (*Tancep Kayon*) |
| `[M]` | Nyalakan / Matikan Musik Gamelan (*Backsound*) |
| `[B]` | Ganti Suasana Kelir (*Malam / Senja / Siang*) |
| `[J]` | Jurus Kasekten Wayang Kiri (Raden Bima) |
| `[L]` | Jurus Kasekten Wayang Kanan (Prabu Rahwana) |
| `[R]` | Mulai / Berhenti Rekam Video Pertunjukan (*Export WebM*) |
| `[H]` | Sembunyikan / Tampilkan Antarmuka Dalang (*Clean View*) |
| `[F]` | Tampilan Layar Penuh (*Fullscreen*) |
| `[C]` | Buka Pratinjau Kamera di Jendela Terpisah (*Dual Monitor*) |

---

## 📁 Struktur Direktori Proyek

```
Wayang-Digital-Offline-Windows/
│
├── MULAI-WAYANG.bat       # Peluncur utama 1-klik untuk Windows
├── server.py              # Server HTTP lokal Python offline
├── BACA-DULU.txt          # Panduan cepat pengguna Windows offline
├── README.md              # Dokumentasi lengkap proyek
├── LICENSE                # Lisensi sumber terbuka (MIT)
├── package.json           # Skrip npm dan metadata repositori
├── .gitignore             # Aturan pengabaian file Git
├── .gitattributes         # Penanganan normalisasi baris & biner Git
├── CONTRIBUTING.md        # Panduan kontribusi komunitas & sekolah
│
├── runtime/               # Python 3.12 embedded portabel (Windows)
│
└── web/                   # Aplikasi web front-end mandiri
    ├── index.html         # Halaman utama panggung wayang
    ├── styles.css         # Desain antarmuka & tema kelir wayang
    ├── camera.html        # Jendela pratinjau kamera dalang terpisah
    ├── hand_landmarker.task # Model kecerdasan buatan MediaPipe (offline)
    ├── assets/            # Gambar potongan organ wayang & audio gamelan
    │   ├── bima-*.png     # Anatomi wayang Raden Bima
    │   ├── rahwana-*.png  # Anatomi wayang Prabu Rahwana
    │   ├── gunungan.png   # Aset gunungan kayon
    │   ├── logo.png       # Logo resmi Wayang Digital SMK TJP Tuban
    │   ├── backsound.mp3  # Musik gamelan Jawa instrumen autentik
    │   └── backsound-beats.json # Peta ketukan ritmis gamelan (wirama)
    ├── src/               # Logika modular JavaScript
    │   ├── main.js        # Entry point aplikasi & UI controller
    │   ├── rig.js         # Sistem engsel biomekanik organ wayang
    │   ├── tracking.js    # Antarmuka MediaPipe hand landmarker
    │   ├── dance.js       # Mesin gerak tari otomatis ritmik gamelan
    │   ├── particles.js   # Sistem partikel visual kasekten
    │   ├── renderer.js    # Canvas 2D & efek kelir bayangan
    │   ├── sfx.js         # Efek suara keprak, cempala, & guntur
    │   └── recorder.js    # Perekam video pertunjukan dalang
    └── vendor/            # Pustaka MediaPipe Vision lokal (WASM)
```

---

## 🏛️ Identitas & Hak Cipta

- **Institusi**: [SMK Taruna Jaya Prawira Tuban](https://smktjptuban.sch.id/)
- **Tahun Pembuatan**: 2026
- **Lisensi**: [MIT License](LICENSE)
- **Tujuan**: Pendidikan kejuruan, pelestarian seni budaya tradisional Jawa berbasis teknologi kecerdasan buatan (*AI-powered cultural preservation*).

---
*Mugi pagelaran menika saget ngrembakakaken budaya adiluhung nusantara.*
