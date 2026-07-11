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



  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col pb-20 md:pb-0">
      {/* TopNavBar */}
      <header className="w-full sticky top-0 z-40 bg-surface border-b border-outline-variant shadow-sm transition-all duration-200">
        <div className="flex items-center justify-between px-5 md:px-16 py-3 w-full max-w-screen-xl mx-auto">
          {/* Brand & Location Left */}
          <div className="flex items-center gap-4 md:gap-8 flex-1">
            <Link className="font-headline-md text-headline-md font-bold text-primary flex items-center gap-2" href="/">
              <span className="material-symbols-outlined" data-weight="fill">storefront</span>
              <span className="hidden md:inline">KopasNow</span>
            </Link>
            
            <LocationIndicator />
          </div>

          {/* Search Bar - Center (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <SearchBar className="w-full" />
          </div>
          {/* Right Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex gap-1 md:gap-2 relative">
              <Link
                href="/keranjang"
                aria-label={`Keranjang, ${totalCartItems} barang`}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-primary hover:bg-surface-variant rounded-full transition-colors relative"
              >
                <span className="material-symbols-outlined" aria-hidden>shopping_basket</span>
                {totalCartItems > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-error border-2 border-surface rounded-full"></span>
                )}
              </Link>
              <NotificationBell />
            </div>

            <div className="hidden md:flex gap-4 items-center ml-2 border-l border-outline-variant pl-4">
              <Link href="/" className="font-label-md text-label-md text-primary font-bold hover:bg-surface-variant transition-colors py-2 px-4 rounded-full">
                Beranda
              </Link>
              {user ? (
                <>
                  <Link href="/orders" className="font-label-md text-label-md text-secondary hover:bg-surface-variant transition-colors py-2 px-4 rounded-full">
                    Pesanan
                  </Link>
                  <Link href="/akun" className="font-label-md text-label-md text-secondary hover:bg-surface-variant transition-colors py-2 px-4 rounded-full flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary-fixed border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {nama.charAt(0).toUpperCase()}
                    </div>
                    Profil
                  </Link>
                </>
              ) : (
                <Link href="/auth" className="bg-primary text-on-primary font-label-md text-label-md hover:bg-surface-tint transition-colors py-2 px-6 rounded-full ml-2">
                  Masuk / Daftar
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden px-5 pb-3 w-full border-t border-outline-variant mt-2 pt-2">
          <SearchBar className="w-full" />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 w-full">
        <main className="flex-1 px-5 py-4 md:px-stack-lg md:py-stack-lg overflow-x-hidden max-w-screen-xl mx-auto w-full">
          {/* Welcome User - Mobile Only */}
          <div className="mb-6 md:hidden">
            {user ? (
              <p className="text-base text-secondary">Halo, <strong>{nama}</strong>!</p>
            ) : (
              <p className="text-base text-secondary">Halo, <strong>Tamu</strong>!</p>
            )}
            <h1 className="text-headline-md font-bold text-on-surface mt-1">Mau belanja apa hari ini?</h1>
          </div>

          {/* Hero Banner */}
          <section className="w-full rounded-xl overflow-hidden relative mb-6">
            <img className="w-full h-48 md:h-[400px] object-cover" src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80" alt="Belanja Mudah di Koperasi"/>
            <div className="absolute inset-0 bg-gradient-to-r from-on-background/80 to-transparent flex flex-col justify-center p-6 md:p-16">
              <h1 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-on-primary mb-2">Belanja Lebih Mudah</h1>
              <p className="font-body-lg text-body-md md:text-body-lg text-on-primary mb-6 max-w-md">Nikmati kemudahan belanja kebutuhan harian dari koperasi terdekat, langsung ke rumah Anda.</p>
              <button 
                onClick={() => {
                  const target = document.getElementById("rekomendasi-produk");
                  target?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-primary text-on-primary font-label-md text-label-md py-3 px-6 rounded-full w-fit hover:bg-surface-tint transition-colors cursor-pointer"
              >
                Belanja Sekarang
              </button>
            </div>
          </section>

          {/* Categories */}
          <section className="flex flex-col gap-3 mb-10">
            <h2 className="font-headline-md text-headline-md font-bold">Kategori Pilihan</h2>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => handleCategoryClick(cat.key)}
                    className="flex flex-col items-center gap-2 min-w-[80px] cursor-pointer group"
                  >
                    <div className={`w-16 h-16 rounded-full border border-outline-variant flex items-center justify-center transition-colors ${isActive ? "bg-primary-container/20 border-primary" : "bg-surface-container-low group-hover:bg-primary-container/10"}`}>
                      <span className={`material-symbols-outlined text-3xl ${isActive ? "text-primary font-bold" : "text-primary"}`}>{cat.icon}</span>
                    </div>
                    <span className={`font-label-sm text-label-sm text-center ${isActive ? "text-primary font-bold" : "text-on-surface"}`}>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Koperasi Terdekat (Split Layout Peta & Daftar) */}
          <section className="mb-section-gap">
            <div className="flex items-center justify-between gap-3 mb-stack-md flex-wrap">
              <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
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
                  className={`min-h-[40px] px-4 rounded-full text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    pickMode
                      ? "bg-primary text-on-primary border-primary"
                      : "bg-surface text-on-surface border-outline-variant hover:bg-surface-variant"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden>
                    {pickMode ? "close" : "add_location_alt"}
                  </span>
                  {pickMode ? "Batal" : "Tandai Peta"}
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
                        ? `Pusat pencarian: ${locationLabel}`
                        : locationSource === "manual"
                        ? "Titik yang Anda tandai"
                        : "Anda di sini"
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
                        className={`bg-surface-container-lowest border rounded-xl p-4 flex gap-4 transition-shadow cursor-pointer ${
                          isSelected
                            ? "border-primary shadow-[0_12px_40px_rgba(175,16,26,0.1)]"
                            : "border-outline-variant hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)]"
                        }`}
                      >
                        {/* Klik kartu menyorot titiknya di peta, bukan pindah halaman */}
                        <div
                          onClick={() => handleSelectKoperasi(koperasi.id)}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          className="flex gap-4 w-full text-left"
                        >
                          <div className="w-20 h-20 bg-surface-container-low rounded-lg border border-outline-variant flex-shrink-0 flex items-center justify-center overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={koperasiImage(koperasi.id, 128, 128)}
                              alt=""
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="flex flex-col justify-between flex-1">
                            <div>
                              <h3 className="font-label-md text-label-md font-bold">{koperasi.nama}</h3>
                              <p className="font-label-sm text-label-sm text-secondary flex items-center gap-1 mt-1">
                                <span className="material-symbols-outlined text-[14px]">directions_walk</span> 
                                {hasLocation && koperasi.distance > 0 ? formatDistance(koperasi.distance) : "Jarak tidak diketahui"}
                              </p>
                              <p className="text-secondary text-xs mt-1 line-clamp-1">{koperasi.alamat || "Alamat belum dicatat"}</p>
                            </div>
                            <div className="flex gap-2 mt-2 items-center justify-between">
                              <div className="flex gap-2">
                                {koperasi.status === "active" ? (
                                  <span className="bg-surface-variant text-on-surface px-2 py-1 rounded-md font-label-sm text-[10px]">Buka</span>
                                ) : (
                                  <span className="bg-surface-variant text-on-surface px-2 py-1 rounded-md font-label-sm text-[10px] opacity-70">Tutup</span>
                                )}
                                {isSelected && (
                                  <span className="bg-primary-container/10 text-primary px-2 py-1 rounded-md font-label-sm text-[10px]">Ditandai di peta</span>
                                )}
                              </div>
                              
                              <Link
                                href={`/koperasi/${koperasi.id}`}
                                className="border border-primary text-primary hover:bg-primary hover:text-on-primary transition-colors text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
                              >
                                Belanja
                                <span className="material-symbols-outlined text-[14px]" aria-hidden>arrow_forward</span>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>



          {/* Product Recommendations */}
          <section id="rekomendasi-produk" className="mb-section-gap animate-fade-in">
            <div className="flex items-center justify-between mb-stack-md">
              <h2 className="font-headline-md text-headline-md font-bold text-on-surface">Rekomendasi Produk</h2>
            </div>
            {isFetching ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-square bg-surface-container animate-pulse rounded-xl" />
                ))}
              </div>
            ) : recommendedProducts.length === 0 ? (
              <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-8 text-center flex flex-col items-center">
                <span className="material-symbols-outlined text-4xl text-secondary mb-2">shopping_bag</span>
                <p className="font-bold text-on-surface">Produk tidak ditemukan</p>
                <p className="text-secondary text-base mt-1">Belum ada produk di kategori ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {recommendedProducts.map((prod) => {
                  const priceNum = parseFloat(prod.harga_produk);
                  const coopName = koperasiList.find((k) => k.id === prod.koperasi_id)?.nama || "Koperasi Desa";

                  return (
                    <div
                      key={prod.id_produk}
                      className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] transition-shadow flex flex-col group"
                    >
                      <Link href={`/produk/${prod.id_produk}`} className="flex flex-col flex-1">
                        {prod.foto_url && (
                          <div className="h-32 bg-surface-container-low flex items-center justify-center overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              alt={prod.nama_produk}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              src={prod.foto_url}
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div className="p-3 flex flex-col gap-1 justify-between flex-1">
                          <h3 className="font-label-sm text-label-sm font-bold line-clamp-2 text-on-surface">
                            {prod.nama_produk}
                          </h3>
                          <p className="font-body-md text-body-md text-primary font-bold">
                            Rp {priceNum.toLocaleString("id-ID")}
                          </p>
                          <p className="text-[10px] text-secondary mt-1">{coopName}</p>
                        </div>
                      </Link>
                      <div className="px-3 pb-3">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleAddToCart(prod);
                          }}
                          aria-label={`Tambah ${prod.nama_produk} ke keranjang`}
                          className="mt-2 w-full py-1.5 border border-outline text-secondary font-label-sm text-label-sm rounded-full hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]" aria-hidden>add</span> Tambah
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
      <footer className="bg-surface-container-lowest border-t border-outline-variant w-full mt-auto">
        <div className="px-margin-page py-12 md:py-16 max-w-screen-xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
            {/* Brand Info */}
            <div className="flex flex-col gap-5">
              <span className="font-headline-sm text-headline-sm text-primary flex items-center gap-2 font-extrabold">
                <span className="material-symbols-outlined text-primary text-[32px]" data-weight="fill">storefront</span>
                KopasNow
              </span>
              <p className="text-body-md font-body-md text-secondary leading-relaxed pr-4">
                Platform yang mengutamakan kemudahan belanja kebutuhan harian dari koperasi terdekat secara cepat dan terpercaya.
              </p>
              <div className="flex items-center gap-3 mt-2">
                <a href="#" className="w-10 h-10 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center hover:bg-primary hover:text-on-primary hover:border-primary transition-all text-secondary">
                  <span className="material-symbols-outlined text-[20px]">public</span>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center hover:bg-primary hover:text-on-primary hover:border-primary transition-all text-secondary">
                  <span className="material-symbols-outlined text-[20px]">share</span>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center hover:bg-primary hover:text-on-primary hover:border-primary transition-all text-secondary">
                  <span className="material-symbols-outlined text-[20px]">mail</span>
                </a>
              </div>
            </div>
            
            {/* Contact */}
            <div>
              <h3 className="text-title-md font-title-md font-bold text-on-surface mb-5">Kontak & Lokasi</h3>
              <ul className="space-y-5 flex flex-col">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary shrink-0 mt-0.5">location_on</span>
                  <span className="text-body-md font-body-md text-secondary leading-relaxed">Jl. Merdeka No. 45, Jakarta Pusat, DKI Jakarta 10110</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary shrink-0 mt-0.5">call</span>
                  <span className="text-body-md font-body-md text-secondary">0812-3456-7890</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary shrink-0 mt-0.5">mail</span>
                  <span className="text-body-md font-body-md text-secondary">halo@kopasnow.id</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-outline-variant bg-surface-container-low">
          <div className="px-margin-page py-6 max-w-screen-xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <p className="text-body-sm font-body-sm text-secondary font-medium">© 2026 KopasNow. Memberdayakan Koperasi Merah Putih.</p>
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-3">
              <span className="text-body-sm font-body-sm text-secondary">Metode Pembayaran:</span>
              <span className="px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md text-label-sm font-label-sm text-secondary font-bold shadow-sm">Transfer</span>
              <span className="px-3 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-md text-label-sm font-label-sm text-secondary font-bold shadow-sm">COD</span>
            </div>
          </div>
        </div>
      </footer>

      <BottomNav />
    </div>
  );
}
