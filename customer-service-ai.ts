import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
    apiKey: process.env['GEMINI_API_KEY'],
});

// ═══════════════════════════════════════════════════════════════
//  APP KNOWLEDGE BASE — Rangkuman detail KopasNow dalam JSON
// ═══════════════════════════════════════════════════════════════
const APP_KNOWLEDGE = {
    app: {
        nama: "KopasNow",
        versi: "0.1.0 (MVP Hackathon)",
        tagline: "Koperasi Desa, Sekarang Bisa Digital",
        jenis: "Progressive Web App (PWA) — mobile-first",
        deskripsi: "KopasNow adalah aplikasi discovery hyperlocal yang menghubungkan masyarakat dengan Koperasi Desa/Kelurahan Merah Putih (KDMP) terdekat. Konsumen bisa menemukan koperasi dalam radius 5 km, melihat katalog produk real-time, berbelanja, dan memilih ambil sendiri (pickup) atau diantar ke rumah (delivery).",
        masalah_yang_disasar: "Lebih dari 83.000 koperasi desa berdiri, tapi mayoritas masih inward-looking. Masyarakat tidak punya kanal untuk mengetahui koperasi terdekat, produk yang dijual, dan ketersediaan stok. Transaksi masih mengandalkan kunjungan fisik dan informasi mulut ke mulut.",
        solusi: "Lapisan discovery hyperlocal di atas sistem koperasi yang sudah ada. KopasNow bukan marketplace baru, melainkan etalase digital yang menghubungkan stok koperasi ke konsumen di sekitarnya.",
        target_pengguna: [
            "Masyarakat umum (konsumen) — mencari produk kebutuhan sehari-hari dari koperasi terdekat",
            "Pengurus koperasi — mengelola katalog, menerima pesanan, konfirmasi/ditolak"
        ]
    },

    fitur_utama: {
        discovery_geolokasi: {
            deskripsi: "Menampilkan koperasi terdekat berdasarkan lokasi GPS pengguna dalam radius 5 km, diurutkan dari yang paling dekat.",
            radius_km: 5,
            teknologi: "PostGIS (ST_DWithin + ST_Distance) + Leaflet.js untuk peta interaktif",
            fitur_peta: [
                "Marker koperasi di peta",
                "Zona radius (lingkaran) di sekitar titik acuan pengguna",
                "Tombol 'Posisi Saya' untuk menggunakan GPS terkini",
                "Mode 'Pick Location' untuk menggeser titik acuan secara manual",
                "Pencarian kota untuk melihat koperasi di kota lain",
                "Reverse geocoding via OpenStreetMap Nominatim"
            ]
        },
        katalog_produk: {
            deskripsi: "Setiap koperasi memiliki katalog produk dengan foto, harga, stok real-time, deskripsi, dan kategori.",
            kategori: [
                { key: "sembako", label: "Sembako", icon: "shopping_basket" },
                { key: "alat_tulis", label: "Alat Tulis", icon: "edit" },
                { key: "peralatan_rumah", label: "Peralatan Rumah", icon: "home_repair_service" },
                { key: "segar", label: "Produk Segar", icon: "eco" },
                { key: "kesehatan", label: "Kesehatan", icon: "medical_services" },
                { key: "pertanian", label: "Pakan Ternak", icon: "pets" },
                { key: "promo", label: "Promo", icon: "local_offer" }
            ],
            detail_produk: [
                "Foto produk (besar)",
                "Nama produk",
                "Harga dalam Rupiah (format: Rp XX.XXX / satuan)",
                "Ketersediaan stok real-time",
                "Deskripsi produk",
                "Info koperasi penjual (nama, alamat, jarak)",
                "Tombol tambah ke keranjang"
            ]
        },
        pencarian: {
            deskripsi: "Pencarian universal untuk produk dan koperasi dengan tab filter.",
            tab_filter: ["Semua", "Koperasi", "Produk"],
            cara_kerja: "Ketik kata kunci di search bar → tekan Enter → hasil muncul dengan tab untuk memfilter. Tanpa Enter, muncul dropdown saran 'Cari Koperasi' dan 'Cari Produk'."
        },
        keranjang_belanja: {
            deskripsi: "Keranjang belanja yang tersimpan di localStorage (persist via Zustand).",
            aturan_penting: "Satu keranjang HANYA boleh berisi barang dari SATU koperasi. Jika pengguna menambah produk dari koperasi berbeda, akan muncul dialog konfirmasi untuk mengganti keranjang.",
            fitur: [
                "Tambah/kurang jumlah produk",
                "Hapus item",
                "Total harga otomatis",
                "Badge jumlah item di navigasi bawah",
                "Persist di localStorage (tidak hilang saat refresh)"
            ]
        },
        checkout: {
            deskripsi: "Proses pemesanan dengan pilihan metode pengiriman dan pembayaran.",
            metode_pengiriman: {
                pickup: {
                    label: "Ambil Sendiri",
                    deskripsi: "Pembeli mengambil langsung di koperasi. Tidak perlu alamat, tidak ada ongkir."
                },
                delivery: {
                    label: "Diantar ke Rumah",
                    deskripsi: "Kurir koperasi mengantar ke alamat pembeli.",
                    batas_maksimum_km: 5,
                    ongkir: {
                        gratis: "Jarak 0-1 km dari koperasi = GRATIS",
                        berbayar: "Jarak >1 km = Rp 3.000 per km (dibulatkan ke atas)",
                        contoh: "Jarak 2,3 km → dibulatkan 3 km → ongkir Rp 9.000",
                        di_luar_radius: "Jika alamat >5 km dari koperasi, pesanan ditolak dan disarankan pilih 'Ambil Sendiri' atau belanja di koperasi lebih dekat."
                    },
                    alamat: {
                        input: "Tulis alamat manual + tandai titik di peta (AddressPicker)",
                        autocomplete: "Saran alamat dari Nominatim (OpenStreetMap) saat mengetik",
                        validasi: "Alamat minimal 10 karakter + titik peta harus ditandai"
                    }
                }
            },
            metode_pembayaran: ["COD (Bayar di Tempat)", "TRANSFER (Transfer Bank)"],
            konfirmasi_order: "Pesanan dikirim → status 'Menunggu' → pengurus koperasi menghubungi via WhatsApp untuk konfirmasi."
        },
        pesanan: {
            deskripsi: "Halaman riwayat pesanan pengguna yang sudah login.",
            status_transaksi: ["Menunggu", "Dikonfirmasi", "Ditolak", "Selesai"],
            fitur: [
                "Daftar semua transaksi pengguna",
                "Detail per transaksi (items, total, status, metode bayar)",
                "Nomor pesanan unik",
                "Filter/tab berdasarkan status"
            ]
        },
        autentikasi: {
            deskripsi: "Sistem login/daftar tanpa kata sandi menggunakan OTP WhatsApp.",
            alur: [
                "1. Pengguna memasukkan nomor WhatsApp (format 08xx, 10-14 digit)",
                "2. Sistem kirim kode OTP 6 digit via WhatsApp (Fonnte gateway)",
                "3. Jika nomor baru → diminta isi nama → akun dibuat otomatis",
                "4. Jika nomor sudah terdaftar → langsung masuk",
                "5. OTP berlaku 5 menit, bisa kirim ulang setelah 2 menit"
            ],
            alternatif: "Login dengan kata sandi juga tersedia (email/phone + password)",
            catatan_teknis: {
                email_bayangan: "Nomor HP yang didaftarkan otomatis dibuatkan email bayangan: 0812xxx@phone.kopasnow.com — ini membuat fitur login HP 100% gratis tanpa biaya SMS OTP.",
                verifikasi_email_dimatikan: "Admin harus mematikan 'Confirm email' di Supabase Auth agar anggota baru tidak perlu verifikasi email."
            }
        },
        akun_pengguna: {
            deskripsi: "Halaman profil anggota koperasi.",
            info_ditampilkan: [
                "Nama lengkap",
                "Nomor HP / WhatsApp",
                "Tanggal bergabung",
                "Status keanggotaan (Anggota Aktif)",
                "Tombol 'Lihat Pesanan Saya'",
                "Tombol 'Keluar dari Akun'"
            ]
        },
        notifikasi: {
            deskripsi: "Sistem notifikasi bell di header untuk memberi tahu perubahan status pesanan.",
            realtime: "Menggunakan Supabase Realtime — dashboard staff dan client otomatis terupdate tanpa refresh."
        }
    },

    navigasi: {
        bottom_nav: {
            deskripsi: "Navigasi bawah (mobile) dengan 4 tab utama.",
            tab: [
                { label: "Beranda", icon: "home", path: "/" },
                { label: "Cari", icon: "search", path: "/cari" },
                { label: "Pesanan", icon: "receipt_long", path: "/orders" },
                { label: "Akun", icon: "person", path: "/akun" }
            ]
        },
        halaman: {
            "/": "Beranda — peta koperasi terdekat + katalog produk + filter kategori",
            "/cari": "Pencarian universal (produk & koperasi)",
            "/koperasi/[id]": "Detail koperasi + katalog produk koperasi tersebut",
            "/produk/[id]": "Detail produk individual (foto, harga, stok, deskripsi, koperasi penjual)",
            "/keranjang": "Keranjang belanja + checkout",
            "/orders": "Riwayat pesanan pengguna (butuh login)",
            "/orders/[id]": "Detail pesanan individual",
            "/akun": "Profil & pengaturan akun pengguna",
            "/auth": "Halaman login/daftar"
        }
    },

    arsitektur_teknis: {
        frontend: "Next.js 16 (App Router) + React 19 + Tailwind CSS 4",
        backend: "Supabase (Postgres + PostGIS + Auth + Realtime)",
        state_management: "Zustand 5 (dengan persist ke localStorage)",
        peta: "Leaflet.js + React-Leaflet (OpenStreetMap, gratis tanpa API key)",
        cache: "Redis (cache stok dengan TTL)",
        notifikasi_wa: "Fonnte (WhatsApp Gateway)",
        validasi: "Valibot",
        hosting: "Vercel",
        database_tables: {
            kopasnow_koperasi: "Data koperasi (nama, alamat, lokasi GPS, status, admin_phone)",
            kopasnow_products: "Katalog produk (nama, harga, stok, foto, kategori, koperasi_id)",
            kopasnow_customers: "Data pelanggan (user_id, nama, email, phone)",
            kopasnow_online_transactions_header: "Header transaksi online",
            kopasnow_online_transactions_detail: "Detail item per transaksi",
            kopasnow_otp: "Tabel OTP untuk verifikasi login/reset password"
        },
        keamanan: {
            rls: "Row Level Security (RLS) — isolasi data per koperasi",
            admin_client: "Service role client untuk bypass RLS (backend only)",
            masking_error: "Error teknis disembunyikan dari pengguna, pesan error dalam bahasa Indonesia"
        }
    },

    aturan_bisnis: {
        satu_koperasi_per_keranjang: "Pengguna hanya bisa belanja dari 1 koperasi per transaksi. Jika ingin belanja di koperasi lain, keranjang lama harus dikosongkan dulu.",
        stok_realtime: "Stok ditampilkan real-time. Saat checkout berhasil, stok otomatis dikurangi.",
        batas_delivery: "Maksimum 5 km dari koperasi. Di luar itu, pesanan delivery ditolak.",
        ongkir_otomatis: "Ongkir dihitung otomatis di server (bukan di client). Angka yang dilihat pembeli sama persis dengan yang ditagihkan.",
        konfirmasi_dual_jalur: "Admin bisa konfirmasi pesanan via APP atau via WhatsApp (balas YA/TIDAK). Sistem anti double-confirm.",
        metode_pembayaran: "COD (bayar di tempat) dan TRANSFER (transfer bank)."
    },

    desain_ui: {
        tema_warna: {
            primary: "#CE1126 (Merah — warna bendera Indonesia)",
            background: "#F6F6F6 (Abu-abu muda)",
            surface: "Putih (#FFFFFF) dengan border abu-abu muda",
            accent: "Emerald (hijau) untuk status aktif/tersedia"
        },
        identitas_visual: "Garis bendera Merah Putih di bagian atas setiap halaman (fixed, z-50)",
        desain_prinsip: [
            "Mobile-first",
            "Touch-friendly (min 48px tap target)",
            "Loading skeleton untuk UX yang smooth",
            "Bahasa Indonesia yang ramah dan mudah dipahami",
            "Rounded corners (2xl = 16px)",
            "Shadow minimal, border tipis"
        ]
    },

    faq: {
        cara_belanja: "1) Buka app → GPS aktif → lihat koperasi terdekat di peta atau list. 2) Pilih koperasi → browse katalog. 3) Tambah produk ke keranjang. 4) Buka keranjang → pilih 'Ambil Sendiri' atau 'Diantar'. 5) Pesan → pengurus hubungi via WhatsApp.",
        cara_daftar: "Buka halaman /auth → masukkan nomor WhatsApp → terima kode OTP via WhatsApp → masukkan kode → jika baru, isi nama → selesai, langsung masuk.",
        ongkir: "Gratis untuk jarak 0-1 km dari koperasi. Selebihnya Rp 3.000/km (dibulatkan ke atas). Maksimum jarak antar 5 km.",
        batas_keranjang: "Satu keranjang hanya bisa berisi produk dari 1 koperasi. Jika ingin belanja di koperasi lain, keranjang lama akan diganti (ada konfirmasi dulu).",
        pembayaran: "Bisa bayar di tempat (COD) atau transfer bank.",
        pesanan_dibatalkan: "Jika pesanan ditolak pengurus, status berubah jadi 'Ditolak'. Pengguna bisa hubungi koperasi langsung via WhatsApp.",
        lupa_password: "Gunakan login OTP via WhatsApp (tanpa password). Atau gunakan fitur 'Lupa Password' di halaman login.",
        koperasi_tidak_ada: "Jika tidak ada koperasi dalam radius 5 km, coba cari kota lain melalui fitur pencarian lokasi, atau perbesar radius dengan tombol 'Lihat Semua'."
    }
};

// ═══════════════════════════════════════════════════════════════
//  SYSTEM PROMPT — Inject knowledge base ke AI
// ═══════════════════════════════════════════════════════════════
const SYSTEM_PROMPT = `
Kamu adalah **CS KopasNow** — asisten customer service AI untuk aplikasi KopasNow.

## IDENTITAS
- Nama: CS KopasNow
- Bahasa: Indonesia (formal tapi ramah, seperti customer service bank digital)
- Tone: Hangat, membantu, sabar, tidak bertele-tele
- Emoji: Gunakan secukupnya (🙏, ✅, 📦, 🛒) — jangan berlebihan

## PENGETAHUAN APP
Berikut adalah rangkuman lengkap aplikasi KopasNow yang harus kamu jadikan referensi untuk menjawab pertanyaan user:

${JSON.stringify(APP_KNOWLEDGE, null, 2)}

## ATURAN MENJAWAB
1. **Selalu jawab berdasarkan knowledge base di atas.** Jika pertanyaan di luar scope, katakan dengan sopan bahwa kamu hanya bisa membantu seputar KopasNow.
2. **Gunakan bahasa Indonesia** yang mudah dipahami, hindari jargon teknis kecuali user bertanya hal teknis.
3. **Berikan langkah-langkah konkret** jika user bertanya cara melakukan sesuatu (contoh: cara belanja, cara daftar).
4. **Sebutkan angka pasti** untuk ongkir, radius, dll — jangan kira-kira.
5. **Jika user melaporkan bug/error**, minta detail (screenshot, langkah yang dilakukan) dan sarankan hubungi tim teknis jika perlu.
6. **Jangan mengarang fitur** yang tidak ada di knowledge base.
7. **Jika pertanyaan ambigu**, tanya klarifikasi dulu sebelum menjawab.
8. **Format jawaban**: gunakan bullet points atau numbered list untuk langkah-langkah. Jangan terlalu panjang — maksimal 5-7 kalimat untuk jawaban sederhana.
9. **Untuk pertanyaan tentang pesanan spesifik**, minta user menyebutkan nomor pesanan.
10. **Salam pembuka**: "Halo! Saya CS KopasNow 🙏 Ada yang bisa saya bantu?"
11. **Jika user bertanya di luar topik app** (cuaca, politik, dll), arahkan kembali: "Maaf, saya hanya bisa membantu seputar KopasNow. Ada yang bisa saya bantu terkait aplikasi?"

## CONTOH JAWABAN

**User**: "Cara belanjanya gimana?"
**CS**: "Mudah sekali! 🛒
1. Buka KopasNow → GPS aktif → lihat koperasi terdekat
2. Pilih koperasi → browse katalog produk
3. Tekan '+ Keranjang' pada produk yang diinginkan
4. Buka keranjang → pilih Ambil Sendiri atau Diantar
5. Tekan 'Pesan Sekarang' → pengurus koperasi akan hubungi via WhatsApp ✅"

**User**: "Ongkirnya berapa?"
**CS**: "Ongkir KopasNow:
• 0-1 km dari koperasi: GRATIS ✅
• >1 km: Rp 3.000/km (dibulatkan ke atas)
• Maksimum jarak antar: 5 km
Contoh: jarak 2,3 km → ongkir Rp 9.000 📦"

**User**: "Keranjang saya kok kosong?"
**CS**: "Keranjang KopasNow hanya bisa berisi produk dari 1 koperasi. Jika Anda menambah produk dari koperasi lain, keranjang lama akan diganti (ada konfirmasi dulu). Coba cek apakah Anda baru belanja di koperasi berbeda? 🙏"
`.trim();

// ═══════════════════════════════════════════════════════════════
//  CHAT HISTORY — Simpan konteks percakapan
// ═══════════════════════════════════════════════════════════════
interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

let chatHistory: ChatMessage[] = [];
const MAX_HISTORY = 20; // Simpan 20 pesan terakhir untuk konteks

// ═══════════════════════════════════════════════════════════════
//  MAIN — Gemini Interactions API
// ═══════════════════════════════════════════════════════════════
const generationConfig = {
    max_output_tokens: 65536,
    thinkingLevel: 'medium' as const,
};

async function main() {
    console.log("🚀 CS KopasNow AI Customer Service");
    console.log("═══════════════════════════════════════════");
    console.log("Ketik pertanyaan Anda (atau 'exit' untuk keluar)\n");

    // Tampilkan salam pembuka
    const greeting = "Halo! Saya CS KopasNow 🙏 Ada yang bisa saya bantu terkait aplikasi KopasNow?";
    console.log(`CS: ${greeting}\n`);
    chatHistory.push({ role: 'model', text: greeting });

    // Loop untuk chat interaktif
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const askQuestion = () => {
        readline.question('You: ', async (userInput: string) => {
            const input = userInput.trim();

            if (input.toLowerCase() === 'exit') {
                console.log("\n👋 Terima kasih! Sampai jumpa.");
                readline.close();
                process.exit(0);
            }

            if (!input) {
                askQuestion();
                return;
            }

            try {
                // Build conversation context
                const conversationContext = chatHistory
                    .map(msg => `${msg.role === 'user' ? 'User' : 'CS'}: ${msg.text}`)
                    .join('\n\n');

                const fullPrompt = `${SYSTEM_PROMPT}\n\n## RIWAYAT PERCAKAPAN\n${conversationContext}\n\n## PERTANYAAN USER SEKARANG\nUser: ${input}`;

                const interaction = await ai.interactions.create({
                    model: 'models/gemini-3.5-flash',
                    input: fullPrompt,
                    generation_config: generationConfig,
                });

                const response = interaction.output_text || "Maaf, saya tidak bisa merespons saat ini.";

                console.log(`\nCS: ${response}\n`);

                // Update chat history
                chatHistory.push({ role: 'user', text: input });
                chatHistory.push({ role: 'model', text: response });

                // Trim history jika terlalu panjang
                if (chatHistory.length > MAX_HISTORY) {
                    chatHistory = chatHistory.slice(-MAX_HISTORY);
                }

            } catch (error) {
                console.error("\n❌ Error:", error);
                console.log("CS: Maaf, terjadi kesalahan teknis. Silakan coba lagi.\n");
            }

            askQuestion();
        });
    };

    askQuestion();
}

// ═══════════════════════════════════════════════════════════════
//  ALTERNATIVE: Non-interactive mode (single question)
// ═══════════════════════════════════════════════════════════════
async function askSingleQuestion(question: string): Promise<string> {
    const fullPrompt = `${SYSTEM_PROMPT}\n\n## PERTANYAAN USER\nUser: ${question}`;

    const interaction = await ai.interactions.create({
        model: 'models/gemini-3.5-flash',
        input: fullPrompt,
        generation_config: generationConfig,
    });

    return interaction.output_text || "Maaf, saya tidak bisa merespons saat ini.";
}

// ═══════════════════════════════════════════════════════════════
//  EXPORT & RUN
// ═══════════════════════════════════════════════════════════════
export { askSingleQuestion, APP_KNOWLEDGE, SYSTEM_PROMPT };

// Run interactive mode jika dijalankan langsung
if (require.main === module) {
    main().catch(console.error);
}
