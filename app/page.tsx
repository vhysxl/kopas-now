"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useUserStore } from "@/store/useUserStore";
import { useCartStore, cartTotalItems } from "@/store/useCartStore";
import { useLocationStore } from "@/store/useLocationStore";
import { getKoperasiList } from "@/server/actions/getKoperasi";
import { getAllActiveProducts, type KopasnowProduct } from "@/server/actions/getProducts";
import { sortByDistance, getLocationName, formatDistance } from "@/utils/helper/geo";
import type { KoperasiLocation } from "@/utils/helper/geo";
import BottomNav from "@/components/kopasnow/BottomNav";
import LocationIndicator from "@/components/kopasnow/LocationIndicator";
import SearchBar from "@/components/kopasnow/SearchBar";
import NotificationBell from "@/components/kopasnow/NotificationBell";
import CartConflictDialog from "@/components/kopasnow/CartConflictDialog";
import { useAddToCart } from "@/hooks/useAddToCart";
import { displayName } from "@/utils/helper/account";
import { koperasiImage } from "@/utils/helper/koperasiImage";

// Dynamic import — Leaflet requires `window`, cannot SSR.
// Peta dimuat saat pengguna membuka peta (hemat kuota & RAM HP low-end).
const KoperasiMap = dynamic(
  () => import("@/components/kopasnow/KoperasiMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full rounded-2xl bg-surface-container flex items-center justify-center border border-surface-variant min-h-[300px]">
        <p className="text-base text-secondary font-medium animate-pulse">Sedang membuka peta...</p>
      </div>
    ),
  }
);

// Saat titik acuan diketahui, hanya koperasi dalam radius ini yang ditampilkan
const NEARBY_RADIUS_KM = 5;

const CATEGORIES = [
  { key: "sembako", label: "Sembako", icon: "shopping_basket", activeClass: "bg-primary-container text-on-primary-container" },
  { key: "alat tulis", label: "Alat Tulis", icon: "edit", activeClass: "bg-primary-container text-on-primary-container" },
  { key: "peralatan rumah", label: "Peralatan Rumah", icon: "home_repair_service", activeClass: "bg-primary-container text-on-primary-container" },
  { key: "segar", label: "Produk Segar", icon: "eco", activeClass: "bg-primary-container text-on-primary-container" },
  { key: "kesehatan", label: "Kesehatan", icon: "medical_services", activeClass: "bg-primary-container text-on-primary-container" },
  { key: "pertanian", label: "Pakan Ternak", icon: "pets", activeClass: "bg-primary-container text-on-primary-container" },
  { key: "promo", label: "Promo", icon: "local_offer", activeClass: "bg-tertiary-container text-on-tertiary-container" },
];

const matchCategory = (tags: string[] | null, catKey: string) => {
  if (!tags) return false;
  const lowerTagsForPromo = tags.map((t) => t.toLowerCase());

  if (catKey === "promo") {
    return lowerTagsForPromo.some((t) => t.includes("promo"));
  }
  const lowerTags = tags.map((t) => t.toLowerCase());

  if (catKey === "sembako") {
    return lowerTags.some((t) => t.includes("sembako"));
  }
  if (catKey === "alat tulis") {
    const keywords = ["tulis", "pensil", "pulpen", "penghapus", "penggaris", "kertas", "map", "spidol", "lem", "gunting", "alat tulis"];
    return lowerTags.some((t) => keywords.some((k) => t.includes(k)));
  }
  if (catKey === "peralatan rumah") {
    const keywords = ["sapu", "pel", "deterjen", "sabun cuci", "wajan", "panci", "pisau", "piring", "gelas", "sendok", "garpu", "wadah", "lampu", "kabel", "baterai", "senter", "kipas", "peralatan rumah"];
    return lowerTags.some((t) => keywords.some((k) => t.includes(k)));
  }
  if (catKey === "segar") {
    const keywords = ["segar", "buah", "sayuran", "daging", "ikan", "seafood", "ayam", "sapi", "telur"];
    return lowerTags.some((t) => keywords.some((k) => t.includes(k)));
  }
  if (catKey === "kesehatan") {
    const keywords = ["kesehatan", "sabun mandi", "sampo", "pasta", "sikat gigi", "masker", "sanitizer", "p3k", "obat", "minyak gosok", "popok", "tisu", "suplemen", "vitamin"];
    return lowerTags.some((t) => keywords.some((k) => t.includes(k)));
  }
  if (catKey === "pertanian") {
    const keywords = ["pertanian", "pakan", "pupuk", "hama", "bibit", "tanaman", "hewan"];
    return lowerTags.some((t) => keywords.some((k) => t.includes(k)));
  }

  return lowerTags.some((t) => t.includes(catKey));
};

export default function Home() {
  const user = useUserStore((state) => state.user);
  const customer = useUserStore((state) => state.customer);
  const isLoading = useUserStore((state) => state.isLoading);
  const cartItems = useCartStore((state) => state.items);
  const cartHydrated = useCartStore((state) => state._hasHydrated);

  // Titik acuan pengguna — satu sumber bersama lintas halaman
  const userLat = useLocationStore((s) => s.lat);
  const userLng = useLocationStore((s) => s.lng);
  const locationLabel = useLocationStore((s) => s.label);
  const locationSource = useLocationStore((s) => s.source);
  const setLocation = useLocationStore((s) => s.setLocation);
  const setLocationLabel = useLocationStore((s) => s.setLabel);

  const { addToCart, pending, confirmReplace, cancelReplace, cartKoperasiName } =
    useAddToCart();

  const [koperasiList, setKoperasiList] = useState<KoperasiLocation[]>([]);
  const [productsByKoperasi, setProductsByKoperasi] = useState<Record<string, KopasnowProduct[]>>({});
  const [allProducts, setAllProducts] = useState<KopasnowProduct[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Koperasi yang sedang disorot (marker kuning di peta)
  const [selectedKoperasiId, setSelectedKoperasiId] = useState<string | null>(null);
  // Pengguna memilih melihat semua koperasi, mengabaikan batas radius
  const [ignoreRadius, setIgnoreRadius] = useState(false);
  // Menekan peta memindahkan titik acuan, bukan memilih koperasi
  const [pickMode, setPickMode] = useState(false);

  const nama = displayName(user, customer);
  const totalCartItems = cartHydrated ? cartTotalItems(cartItems) : 0;

  // Fetch koperasi and products data on mount
  useEffect(() => {
    async function fetchData() {
      setIsFetching(true);
      const [koperasiResult, productsResult] = await Promise.all([
        getKoperasiList(),
        getAllActiveProducts(),
      ]);

      if (koperasiResult.error) {
        setError(koperasiResult.error);
      } else if (koperasiResult.data) {
        setKoperasiList(koperasiResult.data);
      }

      if (productsResult.data) {
        setAllProducts(productsResult.data);
        const grouped = productsResult.data.reduce((acc, product) => {
          if (!acc[product.koperasi_id]) {
            acc[product.koperasi_id] = [];
          }
          acc[product.koperasi_id].push(product);
          return acc;
        }, {} as Record<string, KopasnowProduct[]>);
        setProductsByKoperasi(grouped);
      }

      setIsFetching(false);
    }
    fetchData();
  }, []);

  // Titik acuan dipegang store bersama; aksi terakhir pengguna yang menang
  // (GPS, cari kota, atau geser penanda). Tanpa titik acuan, semua koperasi
  // ditampilkan tanpa urutan jarak.
  const effectiveLocation = useMemo<[number, number] | null>(
    () => (userLat !== null && userLng !== null ? [userLat, userLng] : null),
    [userLat, userLng]
  );
  const hasLocation = !!effectiveLocation;
  const isViewingOtherCity = locationSource === "city";

  // Urutkan dari yang terdekat begitu titik acuan diketahui
  const sortedList = useMemo(() => {
    if (effectiveLocation && koperasiList.length > 0) {
      return sortByDistance(koperasiList, effectiveLocation[0], effectiveLocation[1]);
    }
    return koperasiList.map((k) => ({ ...k, distance: 0 }));
  }, [koperasiList, effectiveLocation]);

  // Batasi ke koperasi dalam radius saat titik acuan diketahui
  const radiusList = useMemo(() => {
    if (!hasLocation || ignoreRadius) return sortedList;
    return sortedList.filter((k) => k.distance <= NEARBY_RADIUS_KM);
  }, [sortedList, hasLocation, ignoreRadius]);

  // Tidak ada koperasi dalam radius, padahal titik acuan sudah diketahui
  const noKoperasiInRadius =
    hasLocation && !ignoreRadius && sortedList.length > 0 && radiusList.length === 0;

  // Radius zona yang digambar di peta. Kalau koperasi terjauh dalam zona
  // masih di bawah batas, lingkarannya dirapatkan ke koperasi terjauh
  // (dilebihkan 100 m) supaya peta tidak ter-zoom out sia-sia.
  const zoneRadiusKm = useMemo(() => {
    if (!hasLocation || ignoreRadius) return undefined;
    if (radiusList.length === 0) return NEARBY_RADIUS_KM;
    const farthest = radiusList[radiusList.length - 1].distance;
    return Math.min(NEARBY_RADIUS_KM, farthest + 0.1);
  }, [hasLocation, ignoreRadius, radiusList]);

  // Dipanggil tombol "Posisi Saya" di peta. Menemukan posisi sendiri berarti
  // titik acuan baru, jadi sorotan koperasi ikut dilepas.
  const handleUserLocationChange = useCallback(
    async (lat: number, lng: number) => {
      setLocation({ lat, lng, source: "gps" });
      setSelectedKoperasiId(null);
      const locName = await getLocationName(lat, lng);
      if (locName) setLocationLabel(locName);
    },
    [setLocation, setLocationLabel]
  );

  // Menandai titik sendiri langsung di peta koperasi terdekat
  const handlePickPoint = useCallback(
    async (lat: number, lng: number) => {
      setLocation({ lat, lng, source: "manual" });
      setSelectedKoperasiId(null);
      setIgnoreRadius(false);
      setPickMode(false);

      const locName = await getLocationName(lat, lng);
      if (locName) setLocationLabel(locName);
    },
    [setLocation, setLocationLabel]
  );

  const handleSelectKoperasi = useCallback((id: string) => {
    setSelectedKoperasiId((prev) => (prev === id ? null : id));
  }, []);

  // Saring daftar koperasi (yang sudah dibatasi radius) berdasarkan kategori.
  // Pencarian kata kunci kini ditangani halaman /cari, bukan di beranda.
  const filteredList = useMemo(() => {
    if (!activeCategory) return radiusList;
    return radiusList.filter((k) => {
      const products = productsByKoperasi[k.id] || [];
      return products.some((p) => matchCategory(p.kategori_produk, activeCategory));
    });
  }, [radiusList, productsByKoperasi, activeCategory]);

  // Rekomendasi produk, disaring kategori saja
  const recommendedProducts = useMemo(() => {
    const list = activeCategory
      ? allProducts.filter((p) => matchCategory(p.kategori_produk, activeCategory))
      : allProducts;
    return list.slice(0, 8);
  }, [allProducts, activeCategory]);

  const handleCategoryClick = (categoryKey: string) => {
    setActiveCategory((prev) => (prev === categoryKey ? null : categoryKey));
  };

  // Tambahkan item ke keranjang. Konfirmasi ganti koperasi ditangani
  // CartConflictDialog, bukan window.confirm bawaan browser.
  const handleAddToCart = (product: KopasnowProduct) => {
    const coopName =
      koperasiList.find((k) => k.id === product.koperasi_id)?.nama || "Koperasi";
    addToCart(product, { id: product.koperasi_id, nama: coopName });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Middleware handles redirect
  }

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col pb-20 md:pb-0">
      {/* TopNavBar */}
      <header className="bg-surface text-primary font-body-md text-body-md w-full sticky top-0 z-50 border-b border-surface-variant shadow-sm transition-all duration-200">
        <div className="flex items-center justify-between px-margin-page py-stack-sm max-w-screen-xl mx-auto w-full">
          {/* Brand & Search Left */}
          <div className="flex items-center gap-stack-lg flex-1">
            <Link className="font-headline-md text-headline-md font-bold text-primary flex items-center gap-2" href="/">
              <span className="material-symbols-outlined" data-weight="fill">storefront</span>
              KopasNow
            </Link>
            {/* Search Bar */}
            <SearchBar className="hidden md:block flex-1 max-w-xl" />
          </div>
          {/* Right Actions */}
          <div className="flex items-center gap-stack-sm md:gap-stack-md">
            <LocationIndicator />
            <div className="flex gap-2">
              <Link
                href="/keranjang"
                aria-label={`Keranjang, ${totalCartItems} barang`}
                className="p-2 min-h-[48px] min-w-[48px] flex items-center justify-center text-secondary hover:text-primary transition-colors hover:bg-surface-container-low rounded-full relative"
              >
                <span className="material-symbols-outlined" aria-hidden>shopping_cart</span>
                {totalCartItems > 0 && (
                  <span className="absolute top-0 right-0 min-w-[20px] h-[20px] px-1 bg-primary text-on-primary text-xs font-bold rounded-full flex items-center justify-center">
                    {totalCartItems}
                  </span>
                )}
              </Link>
              <NotificationBell />
            </div>
            <Link href="/orders" className="hidden md:block bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg px-6 py-2 rounded-full transition-colors font-semibold">
              Pesanan Saya
            </Link>
            <Link href="/akun" className="hidden md:flex items-center gap-2 px-3 py-1.5 hover:bg-surface-container-low rounded-full">
              <div className="w-8 h-8 rounded-full bg-primary-fixed border border-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                {nama.charAt(0).toUpperCase()}
              </div>
              <span className="font-label-lg text-label-lg text-on-surface hidden lg:inline">{nama}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 w-full">
        <main className="flex-1 p-margin-page md:p-stack-lg overflow-x-hidden max-w-screen-xl mx-auto w-full">
          {/* Welcome User & Mobile Search */}
          <div className="mb-6 md:hidden">
            <p className="text-base text-secondary">Halo, <strong>{nama}</strong>!</p>
            <h1 className="text-headline-md text-headline-sm font-bold text-on-surface mt-1">Mau belanja apa hari ini?</h1>
            <div className="mt-3">
              <SearchBar placeholder="Cari beras, minyak, koperasi..." />
            </div>
          </div>

          {/* Hero Banner */}
          <section className="w-full rounded-xl overflow-hidden relative min-h-[220px] md:min-h-[300px] flex items-center mb-section-gap shadow-sm">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCIIVZ1tI8WsfkczYq-QWD1pWnqhTI8cNmcHF-WeVkY2dh6t_4sgYEOztqTvfymO9ugwI-1w1Lmq7zZQFBgnjgJzGGbNZGut8DZ-k_JiZkEbLccdPcDS_3VY6qtdPmK8V_o5yBGzV0tsr2cCcdqSyVG8kbLvHLZMMAlxVESA6d00ga6WfTsKS_6ZaNMc_ztVnB6SjOOw9fTsvGBA3lW3Z9Tmsgcj1d9H0rlUOtAwHzWwB1ttZsyDo2aQw')" }}></div>
            <div className="absolute inset-0 bg-gradient-to-r from-primary-container/90 to-transparent"></div>
            <div className="relative z-10 p-stack-lg md:p-12 max-w-2xl text-on-primary-container">
              <span className="bg-surface-container-lowest text-primary font-label-sm px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block text-xs font-bold">Spesial Agustus</span>
              <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold mb-3">Promo Merdeka!</h1>
              <p className="font-body-lg text-body-lg mb-5 opacity-95 text-sm md:text-base">Belanja kebutuhan pokok langsung dari Koperasi Desa terdekat. Dukung ekonomi desa, harga jujur dan bersahabat.</p>
              <button
                onClick={() => {
                  const target = document.getElementById("rekomendasi-produk");
                  target?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-surface-container-lowest text-primary hover:bg-surface font-label-lg px-8 py-3 rounded-full transition-colors shadow-sm text-sm font-bold animate-pulse-dot"
              >
                Belanja Sekarang
              </button>
            </div>
          </section>

          {/* Koperasi Terdekat (Split Layout Peta & Daftar) */}
          <section className="mb-section-gap">
            <div className="flex items-center justify-between gap-3 mb-stack-md flex-wrap">
              <h2 className="font-headline-md text-headline-md text-on-surface">
                {activeCategory
                  ? `Koperasi Kategori "${activeCategory.toUpperCase()}"`
                  : isViewingOtherCity && locationLabel
                  ? `Koperasi Terdekat dari ${locationLabel}`
                  : hasLocation
                  ? "Koperasi Terdekat dari Lokasi Anda"
                  : "Semua Koperasi"}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {hasLocation && (
                  <span className="text-secondary text-sm font-bold bg-surface-container px-3 py-1 rounded-full">
                    {ignoreRadius || !zoneRadiusKm
                      ? "Semua koperasi"
                      : `Dalam radius ${formatDistance(zoneRadiusKm)}`}
                  </span>
                )}
                {/* Menandai titik memakai peta di bawah — tidak membuka peta baru */}
                <button
                  onClick={() => setPickMode((v) => !v)}
                  aria-pressed={pickMode}
                  className={`min-h-[48px] px-4 rounded-full text-base font-bold flex items-center gap-1.5 transition-colors cursor-pointer border-2 ${
                    pickMode
                      ? "bg-primary text-on-primary border-primary"
                      : "bg-surface text-on-surface border-outline-variant hover:border-primary/40"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden>
                    {pickMode ? "close" : "add_location_alt"}
                  </span>
                  {pickMode ? "Batal menandai" : "Tandai titik sendiri"}
                </button>
              </div>
            </div>

            {pickMode && (
              <p className="text-base text-secondary bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-stack-md">
                Tekan peta di bawah, tepat di tempat Anda berada. Daftar koperasi akan
                langsung diurutkan dari titik itu.
              </p>
            )}

            {/* Tidak ada koperasi dalam radius — beri jalan keluar */}
            {noKoperasiInRadius && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 mb-stack-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-secondary text-base">
                  Tidak ada koperasi dalam radius {NEARBY_RADIUS_KM} km dari{" "}
                  <strong>{locationLabel || "lokasi Anda"}</strong>.
                </p>
                <button
                  onClick={() => setIgnoreRadius(true)}
                  className="px-5 min-h-[48px] bg-primary hover:bg-primary-container text-on-primary rounded-full text-base font-bold transition-colors cursor-pointer shrink-0"
                >
                  Tampilkan Semua Koperasi
                </button>
              </div>
            )}

            <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden flex flex-col lg:flex-row shadow-sm min-h-[350px]">
              {/* Map Side (Kiri di Desktop, Atas di Mobile) — peta selalu aktif */}
              <div className="w-full lg:w-1/2 h-64 lg:h-auto min-h-[300px] relative bg-surface-container-low">
                <div className="w-full h-full min-h-[300px]">
                  <KoperasiMap
                    koperasiList={radiusList}
                    userPosition={effectiveLocation}
                    positionLabel={
                      isViewingOtherCity && locationLabel
                        ? `📍 Pusat pencarian: ${locationLabel}`
                        : locationSource === "manual"
                        ? "📍 Titik yang Anda tandai"
                        : "📍 Anda di sini"
                    }
                    radiusKm={zoneRadiusKm}
                    selectedId={selectedKoperasiId}
                    onSelectKoperasi={handleSelectKoperasi}
                    onUserLocationChange={handleUserLocationChange}
                    pickMode={pickMode}
                    onPickPoint={handlePickPoint}
                  />
                </div>
              </div>

              {/* List Side (Kanan di Desktop, Bawah di Mobile) */}
              <div className="w-full lg:w-1/2 p-stack-md lg:p-stack-lg flex flex-col gap-stack-md overflow-y-auto max-h-[450px]">
                {isFetching ? (
                  <div className="flex flex-col gap-3 justify-center items-center h-full py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    <p className="text-secondary text-sm">Memuat daftar koperasi...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <span className="material-symbols-outlined text-4xl text-error mb-2">error</span>
                    <p className="font-bold text-on-surface">Gagal memuat koperasi</p>
                    <button onClick={() => window.location.reload()} className="mt-2 text-xs text-primary font-bold hover:underline">Coba Lagi</button>
                  </div>
                ) : filteredList.length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                    <span className="material-symbols-outlined text-4xl text-secondary mb-2">storefront</span>
                    <p className="font-headline-sm text-headline-sm text-on-surface">Koperasi tidak ditemukan</p>
                    <p className="text-secondary text-base mt-1">
                      Belum ada koperasi pada kategori ini di sekitar Anda.
                    </p>
                    {activeCategory && (
                      <button
                        onClick={() => setActiveCategory(null)}
                        className="mt-4 min-h-[48px] px-4 text-base text-primary font-bold hover:underline cursor-pointer"
                      >
                        Tampilkan Semua Kategori
                      </button>
                    )}
                  </div>
                ) : (
                  filteredList.slice(0, 5).map((koperasi) => {
                    const isSelected = koperasi.id === selectedKoperasiId;
                    return (
                      <div
                        key={koperasi.id}
                        className={`p-3 rounded-lg border transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-surface-variant hover:border-primary/30 hover:bg-surface-container-low"
                        }`}
                      >
                        {/* Klik kartu menyorot titiknya di peta, bukan pindah halaman */}
                        <button
                          type="button"
                          onClick={() => handleSelectKoperasi(koperasi.id)}
                          aria-pressed={isSelected}
                          className="flex gap-4 w-full text-left cursor-pointer"
                        >
                          <div
                            className={`w-16 h-16 rounded-lg shrink-0 overflow-hidden border ${
                              isSelected ? "border-primary" : "border-primary/20"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={koperasiImage(koperasi.id, 128, 128)}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <h3 className="font-headline-sm text-headline-sm text-on-surface line-clamp-1">{koperasi.nama}</h3>
                              {koperasi.status === "active" ? (
                                <span className="bg-tertiary-container/20 text-tertiary px-2 py-0.5 rounded-full text-sm font-bold shrink-0">Buka</span>
                              ) : (
                                <span className="bg-outline-variant text-secondary px-2 py-0.5 rounded-full text-sm font-bold shrink-0">Tutup</span>
                              )}
                            </div>
                            <p className="text-secondary text-base mt-1 line-clamp-1">{koperasi.alamat || "Alamat belum dicatat"}</p>
                            <div className="flex items-center gap-1 mt-2 text-on-surface-variant text-sm font-bold">
                              <span className="material-symbols-outlined text-[16px]" aria-hidden>location_on</span>
                              <span>{hasLocation && koperasi.distance > 0 ? formatDistance(koperasi.distance) : "Jarak tidak diketahui"}</span>
                              {isSelected && (
                                <>
                                  <span className="mx-1">•</span>
                                  <span className="text-primary">Ditandai di peta</span>
                                </>
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Pindah halaman hanya lewat tombol yang jelas */}
                        <Link
                          href={`/koperasi/${koperasi.id}`}
                          className="mt-3 w-full min-h-[48px] bg-primary hover:bg-primary-container text-on-primary rounded-full text-base font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]" aria-hidden>storefront</span>
                          Belanja di Sini
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          {/* Kategori */}
          <section className="mb-section-gap">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-stack-md text-center md:text-left">Kategori</h2>
            <div className="flex overflow-x-auto pb-4 gap-4 md:gap-8 hide-scrollbar md:flex-wrap justify-start md:justify-start">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => handleCategoryClick(cat.key)}
                    className="flex flex-col items-center gap-3 min-w-[80px] group focus:outline-none cursor-pointer"
                  >
                    <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-sm transition-all group-hover:scale-105 ${
                      isActive ? cat.activeClass : "bg-surface-container-high text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container"
                    }`}>
                      <span className="material-symbols-outlined text-3xl md:text-4xl" data-weight={isActive ? "fill" : undefined}>
                        {cat.icon}
                      </span>
                    </div>
                    <span className={`font-label-sm text-center text-xs group-hover:text-on-surface transition-all ${
                      isActive ? "text-on-surface font-bold" : "text-on-surface-variant font-medium"
                    }`}>
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Product Recommendations */}
          <section id="rekomendasi-produk" className="mb-section-gap animate-fade-in">
            <div className="flex items-center justify-between mb-stack-md">
              <h2 className="font-headline-md text-headline-md text-on-surface">Rekomendasi Produk</h2>
            </div>
            {isFetching ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter-grid md:gap-stack-md">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-square bg-surface-container animate-pulse rounded-xl animate-pulse" />
                ))}
              </div>
            ) : recommendedProducts.length === 0 ? (
              <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-8 text-center flex flex-col items-center">
                <span className="material-symbols-outlined text-4xl text-secondary mb-2">shopping_bag</span>
                <p className="font-bold text-on-surface">Produk tidak ditemukan</p>
                <p className="text-secondary text-base mt-1">Belum ada produk di kategori ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-gutter-grid md:gap-stack-md">
                {recommendedProducts.map((prod) => {
                  const priceNum = parseFloat(prod.harga_produk);
                  const coopName = koperasiList.find((k) => k.id === prod.koperasi_id)?.nama || "Koperasi Desa";

                  return (
                    <div
                      key={prod.id_produk}
                      className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden hover:shadow-md transition-all group flex flex-col"
                    >
                      {/* Menekan foto/nama membuka detail; tombol + tetap jalur cepat */}
                      <Link href={`/produk/${prod.id_produk}`} className="flex flex-col">
                        <div className="aspect-square w-full relative bg-surface-container-low overflow-hidden flex items-center justify-center">
                          {prod.foto_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt={prod.nama_produk}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              src={prod.foto_url}
                              loading="lazy"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-5xl text-on-surface-variant" aria-hidden>shopping_basket</span>
                          )}
                        </div>
                        <div className="px-3 pt-3">
                          <h3 className="text-on-surface line-clamp-2 mb-1 font-semibold text-base leading-snug">
                            {prod.nama_produk}
                          </h3>
                          <p className="text-secondary text-sm mb-3 font-medium">{coopName}</p>
                        </div>
                      </Link>
                      <div className="px-3 pb-3 mt-auto flex items-center justify-between gap-2">
                        <p className="font-headline-sm text-on-surface text-base font-bold">
                          Rp {priceNum.toLocaleString("id-ID")}
                        </p>
                        <button
                          onClick={() => handleAddToCart(prod)}
                          aria-label={`Tambah ${prod.nama_produk} ke keranjang`}
                          className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[24px]" aria-hidden>add</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Konfirmasi ganti koperasi (keranjang hanya boleh dari satu koperasi) */}
      {pending && (
        <CartConflictDialog
          currentKoperasiName={cartKoperasiName}
          nextKoperasiName={pending.koperasi.nama}
          productName={pending.product.nama_produk}
          onConfirm={confirmReplace}
          onCancel={cancelReplace}
        />
      )}

      {/* Footer */}
      <footer className="bg-on-surface text-primary-fixed font-label-sm text-label-sm w-full mt-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-stack-lg px-margin-page py-section-gap text-surface-bright max-w-screen-xl mx-auto">
          {/* Brand Info */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <span className="font-headline-sm text-headline-sm text-surface-bright flex items-center gap-2">
              <span className="material-symbols-outlined" data-weight="fill">storefront</span>
              KopasNow
            </span>
            <p className="text-surface-variant text-xs leading-relaxed">
              Platform digital untuk Koperasi Indonesia. Memberdayakan ekonomi lokal dengan teknologi modern.
            </p>
            <div className="flex gap-4 mt-2">
              <div className="w-8 h-8 rounded-full bg-surface-variant/20 flex items-center justify-center hover:bg-surface-variant/40 cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-[18px]">public</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-surface-variant/20 flex items-center justify-center hover:bg-surface-variant/40 cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-[18px]">share</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-8">
            <div className="flex flex-col gap-3">
              <h4 className="font-headline-sm text-surface-bright mb-2">Perusahaan</h4>
              <a className="text-surface-variant hover:text-surface-bright transition-all text-xs" href="#">Tentang Kami</a>
              <a className="text-surface-variant hover:text-surface-bright transition-all text-xs" href="#">Karir</a>
              <a className="text-surface-variant hover:text-surface-bright transition-all text-xs" href="#">Blog</a>
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="font-headline-sm text-surface-bright mb-2">Bantuan</h4>
              <a className="text-surface-variant hover:text-surface-bright transition-all text-xs" href="#">Syarat & Ketentuan</a>
              <a className="text-surface-variant hover:text-surface-bright transition-all text-xs" href="#">Kebijakan Privasi</a>
              <a className="text-surface-variant hover:text-surface-bright transition-all text-xs" href="#">Hubungi Kami</a>
            </div>
            <div className="flex flex-col gap-3 col-span-2 md:col-span-1">
              <h4 className="font-headline-sm text-surface-bright mb-2">Unduh Aplikasi</h4>
              <button className="bg-surface-variant/20 border border-surface-variant/30 rounded-lg px-4 py-2 flex items-center gap-2 hover:bg-surface-variant/40 transition-colors text-left w-full cursor-pointer">
                <span className="material-symbols-outlined">android</span>
                <div>
                  <span className="block text-[10px] text-surface-variant">Get it on</span>
                  <span className="block font-bold text-sm text-white">Google Play</span>
                </div>
              </button>
            </div>
          </div>
        </div>
        <div className="border-t border-surface-variant/20 px-margin-page py-6 max-w-screen-xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs">
          <p className="text-surface-variant">© 2026 KopasNow. Memberdayakan Ekonomi Desa Merah Putih.</p>
        </div>
      </footer>

      <BottomNav />
    </div>
  );
}
