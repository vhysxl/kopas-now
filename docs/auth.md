# KopasNow — Dokumentasi Alur Masuk & Daftar (Auth Flow)

Dokumen ini menjelaskan bagaimana sistem pendaftaran (Register) dan masuk (Login) di KopasNow bekerja secara sederhana agar mudah dipahami oleh siapa saja.

---

## 1. Konsep Utama: Satu Kolom untuk Semua

KopasNow mempermudah anggota koperasi dengan menyediakan **satu kolom input** untuk memasukkan Email **atau** Nomor HP sekaligus. Anggota tidak perlu bingung memilih metode login yang berbeda.

### Mengapa ini penting?
Biasanya, login menggunakan Nomor HP memerlukan verifikasi SMS OTP (kirim kode lewat SMS) yang membutuhkan biaya pulsa untuk setiap SMS yang dikirim. Untuk menghemat biaya operasional koperasi, KopasNow menggunakan solusi cerdas:
- Jika mendaftar dengan **Email**: Sistem mendaftarkan email asli Anda.
- Jika mendaftar dengan **Nomor HP**: Sistem secara otomatis membuatkan email bayangan di latar belakang (misalnya: `08123456789@phone.kopasnow.com`).

Dengan cara ini, koperasi mendapatkan sistem keamanan yang handal dan fitur login nomor HP yang **100% gratis** dan instan!

---

## 2. Cara Kerja Pendaftaran (Daftar Akun Baru)

Ketika calon anggota mendaftar:

1. **Pemeriksaan Input**: Sistem mendeteksi secara otomatis apakah yang dimasukkan adalah alamat email (memiliki tanda `@`) atau nomor HP biasa.
2. **Pemeriksaan Duplikasi**: Sistem memastikan email atau nomor HP tersebut belum pernah digunakan oleh anggota lain di koperasi.
3. **Penyimpanan Profil**:
   - Akun didaftarkan ke sistem keamanan utama.
   - Nama lengkap, email, dan nomor HP disimpan dengan rapi di database anggota koperasi (`kopasnow_customers`).
4. **Masuk Otomatis**: Begitu pendaftaran selesai, sistem menampilkan pesan sukses dan langsung mengarahkan anggota masuk ke aplikasi dalam waktu 1.2 detik.

---

## 3. Cara Kerja Masuk (Login)

Ketika anggota ingin masuk kembali ke aplikasi:

1. **Deteksi Otomatis**: Anggota mengetik Email atau Nomor HP di kolom yang sama beserta password mereka.
2. **Proses Masuk**:
   - Jika memasukkan **Email**: Sistem langsung mencocokkan email dan password.
   - Jika memasukkan **Nomor HP**: Sistem akan mencari nomor HP tersebut di database koperasi terlebih dahulu. Setelah ditemukan, sistem menggunakan email bayangan terkait untuk mencocokkan password.
3. **Sukses**: Anggota berhasil masuk dan langsung diarahkan ke halaman utama untuk melihat kartu keanggotaan digital mereka.

---

## 4. Keamanan & Pesan Error yang Ramah

- **Perlindungan Informasi**: Jika terjadi masalah teknis di database, sistem sengaja menyembunyikan kode error pemrograman yang rumit agar tidak membingungkan pengguna dan menjaga keamanan sistem.
- **Bahasa yang Mudah Dipahami**: Semua pesan kesalahan disajikan dalam bahasa Indonesia yang ramah (misal: *"Email atau nomor HP salah"* atau *"Nomor HP belum terdaftar"*), sementara detail error teknis tetap dicatat di server untuk tim teknis.

---

## 5. Panduan untuk Pengelola Koperasi (Admin)

Agar pendaftaran instan ini dapat langsung digunakan oleh anggota tanpa hambatan:
- **Matikan Verifikasi Email** di pengaturan akun database Supabase Anda (*Authentication -> Providers -> Email -> hilangkan centang "Confirm email"*). Hal ini bertujuan agar anggota baru tidak perlu repot membuka email mereka untuk melakukan aktivasi akun sebelum bisa masuk.
