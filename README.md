This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Portal kepala sekolah

Buat akun kepala sekolah pertama dari terminal interaktif:

```bash
npm run setup:principal
```

Buat akun admin sekolah yang terpisah:

```bash
npm run setup:admin
```

Pastikan tabel akun sudah dibuat dengan menjalankan `database/schema.sql` pada
database SPMB terlebih dahulu.

Perintah ini menggunakan variabel koneksi database `DB_HOST`, `DB_USER`,
`DB_PASSWORD`, `DB_NAME`, dan `DB_PORT` yang sama dengan aplikasi. Perintah
memuat konfigurasi `.env.local`/`.env` Next.js, lalu meminta nama dan email
serta kata sandi tanpa menampilkannya di terminal. Perintah juga menambahkan
kolom peran dan tabel sesi jika database lama belum memilikinya. Login tersedia
di `/kepala-sekolah/login` untuk kepala sekolah dan `/admin/login` untuk admin.

Akun murid, kepala sekolah, dan admin memiliki peran terpisah. Sesi admin dan
kepala sekolah disimpan pada cookie `HttpOnly` serta tabel sesi masing-masing,
berlaku selama delapan jam, dan dihapus saat logout.

Sesi murid juga disimpan pada cookie `HttpOnly` dan tabel `student_sessions`.
Setelah login, siswa diarahkan ke `/siswa`. Dashboard menampilkan status
pendaftaran, program pilihan, dan pengumuman terbaru. Halaman
`/siswa/pendaftaran`, `/siswa/ujian`, `/siswa/pengumuman`, dan `/siswa/profil`
juga tersedia setelah login. Jalankan `database/schema.sql` untuk membuat
tabel sesi murid dan ujian.

## Dashboard dan pengelolaan admin

Untuk memperbarui database lama, jalankan kembali `database/schema.sql` pada
database SPMB yang sama. Skema ini menambahkan tabel jurusan, pendaftaran/status
seleksi, pengumuman, dan pengaturan, serta membuat data pendaftaran awal untuk
akun siswa yang sudah ada. Proses pembuatan akun baru juga membuat data
pendaftaran dalam transaksi yang sama.

Jalankan kembali `database/schema.sql` setelah memperbarui aplikasi untuk
membuat tabel ujian. Untuk mengisi bank awal berisi 50 soal literasi, numerasi,
bahasa Inggris, dan dasar komputer, jalankan `npm run seed:exam` setelah skema
tersedia. Perintah ini hanya mengisi bank yang masih kosong; soal yang sudah
ada tidak diubah. Admin tetap dapat mengelola soal dan mengatur waktu buka/tutup
di `/admin/ujian`. Setiap akun siswa hanya dapat memulai satu percobaan; waktu
ujian mengikuti pengaturan dan nilai muncul setelah jawaban dikirim atau waktu
habis. Soal dan kunci jawaban dikunci setelah percobaan pertama dimulai.

Setelah login, menu `/admin` menyediakan:

- `/admin/pendaftar` untuk mencari dan melihat akun calon siswa.
- `/admin/ujian` untuk memasukkan soal pilihan ganda, mengatur jadwal ujian
  resmi 60 menit, membuka/menutup ujian, dan melihat nilai siswa.
- `/admin/seleksi` untuk menetapkan jurusan dan status menunggu verifikasi,
  terverifikasi, lolos, atau tidak lolos.
- `/admin/pengumuman` untuk membuat, mengubah, menerbitkan, dan menghapus
  pengumuman. Pengumuman yang diterbitkan tampil pada portal SPMB publik.
- `/admin/jurusan` untuk mengelola kode, nama, daya tampung, deskripsi, dan
  status aktif jurusan. Jurusan aktif tersedia di formulir pendaftaran;
  pendaftaran dan penetapan jurusan oleh admin mengikuti daya tampung.
- `/admin/laporan` untuk melihat rekap status/kapasitas dan mengunduh CSV
  pendaftar.
- `/admin/pengaturan` untuk mengatur tahun ajaran, rentang tanggal pendaftaran,
  dan kontak sekolah. Rentang tanggal yang diisi membatasi pembuatan akun baru.

Semua halaman pengelolaan dan endpoint perubahan data memerlukan sesi admin
yang valid.

## Portal kepala sekolah

Setelah login di `/kepala-sekolah/login`, kepala sekolah diarahkan ke dashboard
ringkasan penerimaan. Portal menyediakan halaman `/kepala-sekolah/pendaftar`,
`/kepala-sekolah/seleksi`, `/kepala-sekolah/pengumuman`,
`/kepala-sekolah/jurusan`, `/kepala-sekolah/laporan`, dan
`/kepala-sekolah/pengaturan`. Halaman-halaman tersebut bersifat baca saja;
perubahan data penerimaan tetap dilakukan melalui akun admin. Laporan dapat
dicetak atau disimpan sebagai PDF dari dialog cetak browser.

## Reset kata sandi melalui email

Fitur **Lupa kata sandi?** mengirim kode enam digit ke email akun. Kode berlaku
15 menit dan hanya dapat dicoba lima kali. Setelah kode diverifikasi, pengguna
dapat menetapkan kata sandi baru.

Salin pengaturan SMTP berikut ke `.env.local` dan isi dari penyedia email Anda.
`SMTP_FROM` adalah alamat pengirim yang telah diizinkan oleh penyedia tersebut.

```dotenv
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

Jalankan `database/schema.sql` pada database SPMB untuk membuat tabel
`password_reset_codes`. Pengiriman kode tidak aktif sebelum pengaturan SMTP
diisi.
