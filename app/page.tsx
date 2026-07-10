"use client";

import { useEffect, useState, useCallback, useMemo, type FormEvent } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useUserStore } from "@/store/useUserStore";
import { useCartStore, cartTotalItems } from "@/store/useCartStore";
import { getKoperasiList } from "@/server/actions/getKoperasi";
import { getAllActiveProducts, type KopasnowProduct } from "@/server/actions/getProducts";
import { sortByDistance, getLocationName, geocodeCity, formatDistance } from "@/utils/helper/geo";
import type { KoperasiLocation } from "@/utils/helper/geo";
import BottomNav from "@/components/kopasnow/BottomNav";

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

const LOCATION_CONSENT_KEY = "kopasnow-izin-lokasi";
type LocationConsent = "unknown" | "granted" | "denied";

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

  const [koperasiList, setKoperasiList] = useState<KoperasiLocation[]>([]);
  const [productsByKoperasi, setProductsByKoperasi] = useState<Record<string, KopasnowProduct[]>>({});
  const [allProducts, setAllProducts] = useState<KopasnowProduct[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [locationConsent, setLocationConsent] = useState<LocationConsent>("unknown");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pencarian kota manual — selalu tersedia, termasuk saat GPS sudah aktif
  const [cityQuery, setCityQuery] = useState("");
  const [citySearchLocation, setCitySearchLocation] = useState<[number, number] | null>(null);
  const [citySearchLabel, setCitySearchLabel] = useState<string | null>(null);
  const [isGeocodingCity, setIsGeocodingCity] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);

  // Koperasi yang sedang disorot (marker kuning di peta)
  const [selectedKoperasiId, setSelectedKoperasiId] = useState<string | null>(null);
  // Pengguna memilih melihat semua koperasi, mengabaikan batas radius
  const [ignoreRadius, setIgnoreRadius] = useState(false);

  const nama = customer?.nama || user?.email?.split("@")[0] || "Anggota";
  const totalCartItems = cartHydrated ? cartTotalItems(cartItems) : 0;

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

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

  // Titik acuan jarak: kota yang diketik manual menang, karena itu pilihan
  // sadar pengguna untuk melihat daerah lain. Kalau tidak ada, pakai GPS.
  // Kalau dua-duanya kosong, semua koperasi ditampilkan tanpa urutan jarak.
  const effectiveLocation = citySearchLocation ?? userLocation;
  const hasLocation = !!effectiveLocation;
  const isViewingOtherCity = !!citySearchLocation;

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

  const handleUserLocationChange = useCallback(async (lat: number, lng: number) => {
    setUserLocation([lat, lng]);
    // Menemukan posisi sendiri berarti kembali ke lokasi sendiri:
    // batalkan pencarian kota supaya titik acuannya tidak tertahan di kota lain.
    setCitySearchLocation(null);
    setCitySearchLabel(null);
    setCityQuery("");
    const locName = await getLocationName(lat, lng);
    if (locName) {
      setLocationName(locName);
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("HP Anda tidak mendukung fitur lokasi.");
      return;
    }
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        localStorage.setItem(LOCATION_CONSENT_KEY, "granted");
        setLocationConsent("granted");
        handleUserLocationChange(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        localStorage.setItem(LOCATION_CONSENT_KEY, "denied");
        setLocationConsent("denied");
        setLocationError(
          "Lokasi belum menyala. Koperasi tetap bisa dilihat, tapi tidak urut dari yang terdekat."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [handleUserLocationChange]);

  const handleDeclineLocation = useCallback(() => {
    localStorage.setItem(LOCATION_CONSENT_KEY, "denied");
    setLocationConsent("denied");
  }, []);

  // Cari koperasi terdekat dari kota yang diketik manual.
  // Tersedia kapan saja, termasuk saat GPS aktif, supaya pengguna bisa
  // melihat koperasi di daerah lain (mis. kampung halaman).
  const handleCitySearch = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const query = cityQuery.trim();
    if (!query) return;

    setIsGeocodingCity(true);
    setCityError(null);
    const result = await geocodeCity(query);
    setIsGeocodingCity(false);

    if (!result) {
      setCitySearchLocation(null);
      setCitySearchLabel(null);
      setCityError(`Kota "${query}" tidak ditemukan. Coba nama kota lain, contoh: Cikarang.`);
      return;
    }

    setCitySearchLocation([result.lat, result.lng]);
    setCitySearchLabel(result.label);
    setSelectedKoperasiId(null);
    setIgnoreRadius(false);
  }, [cityQuery]);

  const handleClearCitySearch = useCallback(() => {
    setCityQuery("");
    setCitySearchLocation(null);
    setCitySearchLabel(null);
    setCityError(null);
    setSelectedKoperasiId(null);
    setIgnoreRadius(false);
  }, []);

  const handleSelectKoperasi = useCallback((id: string) => {
    setSelectedKoperasiId((prev) => (prev === id ? null : id));
  }, []);

  // Pulihkan keputusan izin lokasi; jika sudah pernah setuju,
  // langsung minta posisi tanpa menampilkan kartu persetujuan lagi
  useEffect(() => {
    async function restoreConsent() {
      const saved = localStorage.getItem(LOCATION_CONSENT_KEY) as LocationConsent | null;
      if (saved === "granted") {
        setLocationConsent("granted");
        requestLocation();
      } else if (saved === "denied") {
        setLocationConsent("denied");
      }
    }
    restoreConsent();
  }, [requestLocation]);

  // Saring daftar koperasi (yang sudah dibatasi radius) berdasarkan kategori dan pencarian
  const filteredList = useMemo(() => {
    let list = radiusList;

    // Saring berdasarkan kategori aktif
    if (activeCategory) {
      list = list.filter((k) => {
        const products = productsByKoperasi[k.id] || [];
        return products.some((p) => matchCategory(p.kategori_produk, activeCategory));
      });
    }

    // Saring berdasarkan kata kunci pencarian
    const query = searchQuery.trim().toLowerCase();
    if (!query) return list;

    return list.filter((k) => {
      if (k.nama.toLowerCase().includes(query)) return true;
      const products = productsByKoperasi[k.id] || [];
      return products.some((p) => p.nama_produk.toLowerCase().includes(query));
    });
  }, [radiusList, productsByKoperasi, searchQuery, activeCategory]);

  // Saring rekomendasi produk
  const recommendedProducts = useMemo(() => {
    let list = allProducts;

    // Filter kategori
    if (activeCategory) {
      list = list.filter((p) => matchCategory(p.kategori_produk, activeCategory));
    }

    // Filter pencarian
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter((p) => p.nama_produk.toLowerCase().includes(query));
    }

    return list.slice(0, 8);
  }, [allProducts, activeCategory, searchQuery]);

  const handleCategoryClick = (categoryKey: string) => {
    setActiveCategory((prev) => (prev === categoryKey ? null : categoryKey));
  };

  // Tambahkan item ke keranjang (harga selalu harga asli — tidak ada data diskon di database)
  const handleAddToCart = (product: KopasnowProduct) => {
    const currentKoperasiId = useCartStore.getState().koperasiId;
    const currentKoperasiName = useCartStore.getState().koperasiName;
    const addItem = useCartStore.getState().addItem;
    const clearCart = useCartStore.getState().clear;

    const coopName = koperasiList.find((k) => k.id === product.koperasi_id)?.nama || "Koperasi";
    const price = parseFloat(product.harga_produk);

    if (currentKoperasiId && currentKoperasiId !== product.koperasi_id) {
      const confirmClear = window.confirm(
        `Keranjang Anda saat ini berisi barang dari "${currentKoperasiName}". Apakah Anda ingin mengosongkan keranjang untuk membeli barang dari "${coopName}"?`
      );
      if (confirmClear) {
        clearCart();
        addItem(product.koperasi_id, coopName, {
          productId: product.id_produk,
          name: product.nama_produk,
          price,
          unit: product.satuan_produk || "pcs",
          photoUrl: product.foto_url,
          stock: product.stok_tersedia,
        });
        showToast(`Keranjang dikosongkan & ${product.nama_produk} ditambahkan!`);
      }
    } else {
      addItem(product.koperasi_id, coopName, {
        productId: product.id_produk,
        name: product.nama_produk,
        price,
        unit: product.satuan_produk || "pcs",
        photoUrl: product.foto_url,
        stock: product.stok_tersedia,
      });
      showToast(`Berhasil menambahkan ${product.nama_produk} ke keranjang!`);
    }
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
            <div className="hidden md:flex flex-1 max-w-xl relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface"
                placeholder="Cari produk atau koperasi..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          {/* Right Actions */}
          <div className="flex items-center gap-stack-sm md:gap-stack-md">
            <button
              onClick={requestLocation}
              className="flex items-center gap-1 text-secondary hover:text-primary transition-colors hover:bg-surface-container-low px-3 py-2 rounded-full hidden md:flex cursor-pointer"
            >
              <span className="material-symbols-outlined">location_on</span>
              <span className="font-label-lg text-label-lg">{(locationName || citySearchLabel || "Pilih Lokasi").slice(0, 18)}</span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
            <div className="flex gap-2">
              <Link href="/keranjang" className="p-2 text-secondary hover:text-primary transition-colors hover:bg-surface-container-low rounded-full relative">
                <span className="material-symbols-outlined">shopping_cart</span>
                {totalCartItems > 0 && (
                  <span className="absolute top-0 right-0 min-w-[18px] h-[18px] bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center">
                    {totalCartItems}
                  </span>
                )}
              </Link>
              <button className="p-2 text-secondary hover:text-primary transition-colors hover:bg-surface-container-low rounded-full">
                <span className="material-symbols-outlined">notifications</span>
              </button>
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
            <p className="text-sm text-secondary">Halo, <strong>{nama}</strong>!</p>
            <h1 className="text-headline-md text-headline-sm font-bold text-on-surface mt-1">Mau belanja apa hari ini?</h1>
            <div className="relative mt-3">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-primary text-on-surface"
                placeholder="Cari beras, minyak, koperasi..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
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

          {/* Kartu Persetujuan Lokasi */}
          {locationConsent === "unknown" && (
            <div className="bg-surface-container-lowest border-2 border-outline-variant rounded-xl p-5 mb-6 shadow-sm animate-fade-in">
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-primary text-3xl">location_on</span>
                <div className="flex-1">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Boleh kami tahu lokasi Anda?</h2>
                  <p className="text-secondary text-sm mt-1">
                    Supaya kami bisa menunjukkan koperasi yang paling dekat dari rumah Anda. Pilih <strong>Izinkan</strong> pada konfirmasi sistem.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-4 justify-end">
                <button
                  onClick={handleDeclineLocation}
                  className="px-5 py-2.5 bg-surface border border-outline rounded-full text-secondary font-label-lg text-sm transition-colors cursor-pointer"
                >
                  Nanti Saja
                </button>
                <button
                  onClick={requestLocation}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-container text-on-primary rounded-full font-label-lg text-sm transition-colors cursor-pointer"
                >
                  Ya, Izinkan
                </button>
              </div>
            </div>
          )}

          {/* Cari kota — tersedia kapan saja, termasuk saat GPS sudah aktif */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 mb-6 shadow-sm">
            {!userLocation && locationConsent === "denied" && locationError && (
              <p className="text-secondary text-sm mb-3 flex items-start gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">info</span>
                {locationError}
              </p>
            )}
            <form onSubmit={handleCitySearch} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">location_city</span>
                <input
                  type="text"
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  placeholder={
                    userLocation
                      ? "Lihat koperasi di kota lain, contoh: Bandung"
                      : "Cari koperasi terdekat dari kota Anda, contoh: Cikarang"
                  }
                  className="w-full bg-surface border border-outline-variant rounded-full py-2.5 pl-10 pr-4 focus:outline-none focus:border-primary text-on-surface text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={isGeocodingCity || !cityQuery.trim()}
                className="px-6 py-2.5 bg-primary hover:bg-primary-container text-on-primary rounded-full font-label-lg text-sm font-bold transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isGeocodingCity ? "Mencari..." : "Cari"}
              </button>
            </form>
            {cityError && (
              <p className="text-error text-sm mt-2">{cityError}</p>
            )}
            {citySearchLabel && !cityError && (
              <div className="flex items-center justify-between gap-2 mt-2">
                <p className="text-tertiary text-sm font-semibold">
                  Menampilkan koperasi terdekat dari <strong>{citySearchLabel}</strong>.
                </p>
                <button
                  onClick={handleClearCitySearch}
                  className="text-secondary text-xs font-bold hover:underline cursor-pointer shrink-0"
                >
                  {userLocation ? "Kembali ke lokasi saya" : "Hapus"}
                </button>
              </div>
            )}
          </div>

          {/* Koperasi Terdekat (Split Layout Peta & Daftar) */}
          <section className="mb-section-gap">
            <div className="flex items-center justify-between gap-3 mb-stack-md flex-wrap">
              <h2 className="font-headline-md text-headline-md text-on-surface">
                {activeCategory
                  ? `Koperasi Kategori "${activeCategory.toUpperCase()}"`
                  : isViewingOtherCity
                  ? `Koperasi Terdekat dari ${citySearchLabel}`
                  : userLocation
                  ? "Koperasi Terdekat dari Lokasi Anda"
                  : "Semua Koperasi"}
              </h2>
              {hasLocation && (
                <span className="text-secondary text-xs font-bold bg-surface-container px-3 py-1 rounded-full">
                  {ignoreRadius
                    ? "Semua koperasi"
                    : `Dalam radius ${NEARBY_RADIUS_KM} km`}
                </span>
              )}
            </div>

            {/* Tidak ada koperasi dalam radius — beri jalan keluar */}
            {noKoperasiInRadius && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 mb-stack-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-secondary text-sm">
                  Tidak ada koperasi dalam radius {NEARBY_RADIUS_KM} km dari{" "}
                  <strong>{citySearchLabel || locationName || "lokasi Anda"}</strong>.
                </p>
                <button
                  onClick={() => setIgnoreRadius(true)}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-container text-on-primary rounded-full text-sm font-bold transition-colors cursor-pointer shrink-0"
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
                      isViewingOtherCity
                        ? `📍 Pusat pencarian: ${citySearchLabel}`
                        : "📍 Anda di sini"
                    }
                    radiusKm={hasLocation && !ignoreRadius ? NEARBY_RADIUS_KM : undefined}
                    selectedId={selectedKoperasiId}
                    onSelectKoperasi={handleSelectKoperasi}
                    onUserLocationChange={handleUserLocationChange}
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
                    <p className="text-secondary text-sm mt-1">Coba sesuaikan kata pencarian atau bersihkan filter.</p>
                    {(activeCategory || searchQuery) && (
                      <button
                        onClick={() => {
                          setActiveCategory(null);
                          setSearchQuery("");
                        }}
                        className="mt-4 text-sm text-primary font-bold hover:underline"
                      >
                        Bersihkan Filter
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
                          <div className={`w-16 h-16 rounded-lg shrink-0 flex items-center justify-center border ${
                            isSelected ? "bg-primary text-on-primary border-primary" : "bg-primary-fixed border-primary/20"
                          }`}>
                            <span className={`text-lg font-bold ${isSelected ? "text-on-primary" : "text-primary"}`}>
                              {koperasi.nama.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <h3 className="font-headline-sm text-headline-sm text-on-surface line-clamp-1">{koperasi.nama}</h3>
                              {koperasi.status === "active" ? (
                                <span className="bg-tertiary-container/20 text-tertiary font-label-sm px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">Buka</span>
                              ) : (
                                <span className="bg-outline-variant text-secondary font-label-sm px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">Tutup</span>
                              )}
                            </div>
                            <p className="text-secondary text-xs mt-1 line-clamp-1">{koperasi.alamat || "Jl. Desa Utama"}</p>
                            <div className="flex items-center gap-1 mt-2 text-on-surface-variant text-[11px] font-bold">
                              <span className="material-symbols-outlined text-[14px]">location_on</span>
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

                        {/* Dynamic Products Search Hint inside card */}
                        {(() => {
                          const products = productsByKoperasi[koperasi.id] || [];
                          const query = searchQuery.trim().toLowerCase();
                          const matched = query ? products.filter((p) => p.nama_produk.toLowerCase().includes(query)) : [];
                          if (matched.length === 0) return null;
                          return (
                            <div className="mt-2.5 pt-2 border-t border-dashed border-surface-variant flex flex-wrap gap-1.5">
                              {matched.slice(0, 2).map((prod) => (
                                <span key={prod.id_produk} className="bg-primary/5 text-primary border border-primary/10 rounded-full px-2.5 py-0.5 text-[10px] font-bold">
                                  {prod.nama_produk} (Rp {parseInt(prod.harga_produk).toLocaleString("id-ID")})
                                </span>
                              ))}
                              {matched.length > 2 && (
                                <span className="text-[10px] text-secondary py-0.5 font-bold">+{matched.length - 2} produk lainnya</span>
                              )}
                            </div>
                          );
                        })()}

                        {/* Pindah halaman hanya lewat tombol yang jelas */}
                        <Link
                          href={`/koperasi/${koperasi.id}`}
                          className="mt-3 w-full min-h-[44px] bg-primary hover:bg-primary-container text-on-primary rounded-full text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">storefront</span>
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
                <p className="text-secondary text-sm mt-1">Belum ada produk di kategori ini atau kata pencarian Anda.</p>
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
                      <div className="aspect-square w-full relative bg-surface-container-low overflow-hidden flex items-center justify-center">
                        {prod.foto_url ? (
                          <img
                            alt={prod.nama_produk}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            src={prod.foto_url}
                          />
                        ) : (
                          <span className="material-symbols-outlined text-5xl text-on-surface-variant">shopping_basket</span>
                        )}
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <h3 className="font-body-md text-body-md text-on-surface line-clamp-2 mb-1 font-semibold text-sm leading-snug">
                          {prod.nama_produk}
                        </h3>
                        <p className="text-secondary text-xs mb-3 font-medium">{coopName}</p>
                        <div className="mt-auto flex items-center justify-between">
                          <p className="font-headline-sm text-headline-sm text-on-surface text-sm">
                            Rp {priceNum.toLocaleString("id-ID")}
                          </p>
                          <button
                            onClick={() => handleAddToCart(prod)}
                            className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[20px]">add</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 md:bottom-6 right-4 z-50 bg-[#1b1c1c] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in border border-surface-variant">
          <span className="material-symbols-outlined text-tertiary text-[20px]" data-weight="fill">check_circle</span>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
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
