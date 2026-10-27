import mysql from "mysql2/promise";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const questions = [
  ["Berapakah hasil dari 125 + 278?", "393", "403", "413", "503", "B"],
  ["Tiga perempat dari 64 adalah ...", "42", "46", "48", "52", "C"],
  ["Perbandingan siswa laki-laki dan perempuan adalah 2 : 3. Jika jumlah seluruh siswa 40 orang, berapa jumlah siswa perempuan?", "16", "20", "24", "30", "C"],
  ["Harga sebuah tas Rp150.000 mendapat diskon 20%. Berapa harga tas setelah diskon?", "Rp100.000", "Rp120.000", "Rp125.000", "Rp130.000", "B"],
  ["Tentukan angka berikutnya: 5, 9, 13, 17, ...", "19", "20", "21", "22", "C"],
  ["Dua jam 45 menit sama dengan ... menit.", "145", "155", "165", "175", "C"],
  ["Rata-rata nilai 70, 80, dan 90 adalah ...", "75", "80", "85", "90", "B"],
  ["Berapakah 15% dari 200?", "30", "35", "40", "45", "A"],
  ["Empat pekerja menyelesaikan pekerjaan dalam 6 hari. Dengan kecepatan sama, 8 pekerja menyelesaikannya dalam ...", "2 hari", "3 hari", "4 hari", "12 hari", "B"],
  ["Sebuah persegi panjang memiliki panjang 12 cm dan lebar 7 cm. Luasnya adalah ...", "19 cm²", "38 cm²", "84 cm²", "168 cm²", "C"],
  ["Tentukan angka berikutnya: 2, 6, 12, 20, ...", "24", "28", "29", "30", "D"],
  ["Harga 5 buku tulis adalah Rp75.000. Berapa harga 8 buku tulis dengan harga satuan yang sama?", "Rp120.000", "Rp125.000", "Rp130.000", "Rp150.000", "A"],
  ["Jumlah sudut dalam sebuah segitiga adalah 180°. Jika dua sudutnya 55° dan 65°, sudut ketiga adalah ...", "50°", "60°", "65°", "70°", "B"],
  ["Dua perlima dari 60 adalah ...", "18", "20", "24", "30", "C"],
  ["Sebuah kegiatan dimulai pukul 08.15 dan berlangsung selama 2 jam 35 menit. Kegiatan berakhir pukul ...", "10.50", "10.40", "10.45", "11.00", "A"],
  ["Sebuah kendaraan menempuh 120 km dalam 3 jam. Kecepatan rata-ratanya adalah ...", "30 km/jam", "40 km/jam", "45 km/jam", "60 km/jam", "B"],
  ["Di dalam kotak ada 4 bola merah dan 6 bola biru. Peluang mengambil bola biru adalah ...", "2/5", "1/2", "3/5", "3/4", "C"],
  ["Luas persegi dengan panjang sisi 9 cm adalah ...", "18 cm²", "36 cm²", "72 cm²", "81 cm²", "D"],
  ["Berapakah hasil dari 2 pangkat 5?", "32", "25", "16", "10", "A"],
  ["Jika 3x + 5 = 20, nilai x adalah ...", "3", "4", "5", "6", "C"],
  ["Bacalah kalimat berikut: “Membawa botol minum sendiri dapat mengurangi penggunaan plastik sekali pakai.” Gagasan utama kalimat tersebut adalah ...", "Botol minum hanya digunakan di rumah", "Botol minum sendiri membantu mengurangi sampah plastik", "Plastik sekali pakai mudah dibawa", "Semua minuman harus disimpan di botol", "B"],
  ["Kata yang memiliki makna sama dengan “cermat” adalah ...", "Teliti", "Cepat", "Ramah", "Tegas", "A"],
  ["Lawan kata “boros” adalah ...", "Mahal", "Hemat", "Banyak", "Penuh", "B"],
  ["Penulisan kalimat dengan tanda baca yang tepat adalah ...", "Ibu berkata “Belajarlah dengan tekun”.", "Ibu berkata, “Belajarlah dengan tekun.”", "Ibu berkata “Belajarlah dengan tekun.”", "Ibu berkata: belajarlah dengan tekun.", "B"],
  ["Kata baku yang tepat adalah ...", "Resiko", "Apotik", "Aktifitas", "Praktik", "D"],
  ["Bacalah: “Perpustakaan sekolah menambah koleksi buku sains. Siswa dapat meminjam buku tersebut setiap hari setelah jam pelajaran.” Apa yang dapat disimpulkan?", "Buku sains hanya boleh dibaca guru", "Siswa dapat meminjam buku sains setelah pelajaran", "Perpustakaan hanya buka pada pagi hari", "Koleksi buku sains sudah dihapus", "B"],
  ["Kata penghubung yang tepat untuk melengkapi kalimat “Rani sudah belajar dengan tekun, ... ia tetap berlatih soal” adalah ...", "Karena", "Namun", "Sehingga", "Agar", "B"],
  ["Kalimat yang paling efektif adalah ...", "Para siswa-siswa sedang mengikuti ujian.", "Semua para peserta hadir tepat waktu.", "Peserta ujian hadir tepat waktu.", "Peserta ujian semuanya hadir bersama-sama.", "C"],
  ["Makna kata “inovasi” adalah ...", "Peniruan terhadap kebiasaan lama", "Pembaruan atau pengenalan hal yang baru", "Pengumpulan barang bekas", "Penyimpanan data tertulis", "B"],
  ["Bacalah: “Tanaman di halaman sekolah dirawat bersama setiap Jumat. Kegiatan ini membuat lingkungan lebih teduh dan nyaman.” Manfaat kegiatan tersebut adalah ...", "Halaman menjadi lebih teduh dan nyaman", "Siswa tidak perlu belajar di kelas", "Semua tanaman dapat dipindahkan", "Kegiatan sekolah berlangsung lebih singkat", "A"],
  ["Bahasa Inggris dari kata “meminjam” adalah ...", "Lend", "Borrow", "Bring", "Buy", "B"],
  ["Pilih bentuk kata kerja yang tepat: “She ... to school every day.”", "Go", "Going", "Goes", "Gone", "C"],
  ["Bentuk jamak dari “child” adalah ...", "Childs", "Childes", "Childrens", "Children", "D"],
  ["Pada kalimat “The test starts at 8 a.m.”, ujian dimulai pukul ...", "Delapan pagi", "Delapan malam", "Sepuluh pagi", "Sepuluh malam", "A"],
  ["Lawan kata bahasa Inggris “hot” adalah ...", "Warm", "Cold", "Tall", "Fast", "B"],
  ["Lengkapi kalimat: “I am interested ... computers.”", "At", "On", "In", "For", "C"],
  ["Pilih kata yang tepat: “They ... playing football now.”", "Is", "Am", "Be", "Are", "D"],
  ["Arti kalimat “Please close the door.” adalah ...", "Tolong buka jendela", "Tolong tutup pintu", "Silakan masuk ke ruangan", "Jangan mengunci pintu", "B"],
  ["Bacalah: “Rina walks to school because her house is near the school.” Mengapa Rina berjalan kaki ke sekolah?", "Ia tinggal dekat sekolah", "Ia tidak memiliki jadwal sekolah", "Ia pergi bersama temannya", "Ia ingin membeli sepatu", "A"],
  ["Jawaban yang tepat untuk pertanyaan “How are you?” adalah ...", "My name is Rani.", "I am twelve years old.", "I am fine, thank you.", "I live in Bandung.", "C"],
  ["Apa fungsi utama protokol DHCP dalam jaringan komputer lokal?", "Menerjemahkan nama domain menjadi alamat IP", "Membagikan alamat IP secara otomatis kepada perangkat", "Mengamankan data dengan enkripsi", "Menghubungkan dua jaringan nirkabel", "B"],
  ["Layanan DNS terutama digunakan untuk ...", "Menerjemahkan nama domain menjadi alamat IP", "Membagikan alamat IP otomatis", "Menyimpan berkas cadangan", "Mengirim pesan elektronik", "A"],
  ["HTTPS digunakan pada situs web untuk ...", "Mempercepat kinerja papan ketik", "Mengatur ukuran layar", "Mengamankan komunikasi antara browser dan situs", "Menghapus virus dari komputer", "C"],
  ["Perangkat yang digunakan untuk memasukkan teks ke komputer adalah ...", "Monitor", "Speaker", "Proyektor", "Papan ketik", "D"],
  ["Memori RAM umumnya digunakan untuk ...", "Menyimpan data sementara saat komputer bekerja", "Mencetak dokumen ke kertas", "Menghubungkan komputer ke listrik", "Menyimpan berkas secara permanen tanpa daya", "A"],
  ["Konektor yang umum digunakan pada kabel jaringan Ethernet adalah ...", "USB-C", "RJ45", "HDMI", "VGA", "B"],
  ["Kata sandi yang lebih kuat adalah ...", "namasiswa", "12345678", "Sekolah2026!", "password", "C"],
  ["Mengapa berkas penting perlu dicadangkan (backup)?", "Agar ukuran layar bertambah", "Agar komputer selalu menyala", "Agar kata sandi mudah ditebak", "Agar data dapat dipulihkan jika berkas asli hilang atau rusak", "D"],
  ["Ikon penjepit kertas pada aplikasi email biasanya digunakan untuk ...", "Melampirkan berkas", "Menghapus akun", "Mengubah kata sandi", "Membalas semua pesan", "A"],
  ["Perangkat yang umum digunakan untuk menghubungkan beberapa jaringan yang berbeda adalah ...", "Papan ketik", "Router", "Mikrofon", "Pemindai", "B"],
].map(([question_text, option_a, option_b, option_c, option_d, correct_option], index) => ({
  question_text,
  option_a,
  option_b,
  option_c,
  option_d,
  correct_option,
  sort_order: index + 1,
}));

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "spmb",
  port: Number(process.env.DB_PORT || 3306),
});

try {
  const [existingRows] = await db.execute("SELECT COUNT(*) AS total FROM spmb_exam_questions");
  if (Number(existingRows[0].total) > 0) {
    console.log("Bank soal sudah berisi soal. Seed awal tidak dijalankan agar data yang ada tidak berubah.");
  } else {
    await db.beginTransaction();
    for (const question of questions) {
      await db.execute(
        `INSERT INTO spmb_exam_questions
           (question_text, option_a, option_b, option_c, option_d, correct_option, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          question.question_text,
          question.option_a,
          question.option_b,
          question.option_c,
          question.option_d,
          question.correct_option,
          question.sort_order,
        ],
      );
    }
    await db.commit();
    console.log(`${questions.length} soal SPMB berhasil ditambahkan.`);
  }
} catch (error) {
  await db.rollback();
  console.error("Gagal menambahkan bank soal SPMB:", error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
