# Panduan Kontribusi - Wayang Digital
**SMK Taruna Jaya Prawira Tuban**

Terima kasih atas ketertarikan Anda untuk berkontribusi pada pengembangan **Wayang Digital**, proyek pelestarian seni budaya adiluhung Wayang Kulit Nusantara melalui teknologi komputasi modern dan kecerdasan buatan (*Artificial Intelligence*).

---

## 🎯 Visi & Nilai Inti Proyek
1. **100% Offline & Inklusif**: Aplikasi harus selalu dapat dijalankan tanpa koneksi internet dan tanpa akun cloud agar dapat dinikmati di seluruh pelosok sekolah dan sanggar seni di Indonesia.
2. **Kearifan Budaya & Estetika**: Anatomi wayang, tata busana (*sunggingan*), iringan gamelan (*wirama*), serta gestur lakon menghormati pakem tradisi wayang purwa nusantara.
3. **Performa Tinggi**: Pelacakan tangan AI dan rendering panggung harus berjalan lancar pada kecepatan 60 FPS di laptop sekolah maupun PC standar.

---

## 🛠️ Cara Berkontribusi

### 1. Melaporkan Masalah (*Issues*)
Jika Anda menemukan kendala teknis atau memiliki usulan fitur:
- Periksa daftar *Issues* yang sudah ada terlebih dahulu.
- Buka issue baru dengan menyertakan:
  - Deskripsi kendala secara jelas.
  - Spesifikasi sistem (Sistem operasi Windows, tipe peramban Chrome/Edge).
  - Tipe kamera web (*webcam*).
  - Tangkapan layar (*screenshot*) atau pesan kesalahan di konsol peramban (F12).

### 2. Menambahkan Karakter Wayang Baru
Kami sangat menyambut penambahan tokoh-tokoh wayang purwa lainnya (misalnya Gatotkaca, Arjuna, Werkudara, Semar, Petruk, Gareng, Bagong, Kumbakarna, dll.):
- **Struktur Berkas Aset**:
  Setiap wayang memerlukan potongan organ transparan PNG:
  - `[nama]-body.png`: Badan, kepala, dan kaki menyatu.
  - `[nama]-upper-arm-l.png` / `r.png`: Lengan atas (bahu ke siku).
  - `[nama]-forearm-l.png` / `r.png`: Lengan bawah (siku ke pergelangan).
  - `[nama]-hand-l.png` / `r.png`: Telapak tangan beserta tuding/gapit.
- **Konfigurasi Rig**:
  Tambahkan koordinat engsel (*pivot*) pada `web/src/rig.js` (anchor bahu, siku, dan pergelangan tangan).

### 3. Kontribusi Kode Sumber (*Pull Requests*)
1. Fork repositori ini ke akun GitHub Anda.
2. Buat branch fitur baru:
   ```bash
   git checkout -b fitur/nama-fitur-anda
   ```
3. Lakukan pengujian secara lokal dengan menjalankan `python server.py` atau `MULAI-WAYANG.bat`.
4. Pastikan kode menggunakan standar **Vanilla JavaScript ES Modules** tanpa pustaka eksternal yang memerlukan koneksi CDN daring.
5. Commit perubahan Anda dengan pesan commit yang jelas dan deskriptif:
   ```bash
   git commit -m "feat(rig): menambahkan rig karakter Gatotkaca"
   ```
6. Push branch Anda ke fork dan ajukan *Pull Request* ke branch `main`.

---

## 📜 Lisensi
Dengan berkontribusi pada proyek ini, Anda menyetujui bahwa kontribusi Anda akan dilisensikan di bawah **Lisensi MIT**.

Dikelola dan dikembangkan dengan bangga oleh:  
**SMK Taruna Jaya Prawira Tuban**
