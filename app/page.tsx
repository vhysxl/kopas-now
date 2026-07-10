"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useUserStore } from "@/store/useUserStore";
import { useCartStore, cartTotalItems } from "@/store/useCartStore";
import { getKoperasiList } from "@/server/actions/getKoperasi";
import { getAllActiveProducts, type KopasnowProduct } from "@/server/actions/getProducts";
import { sortByDistance, getLocationName } from "@/utils/helper/geo";
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

const CATEGORIES = [
  { key: "sembako", label: "Sembako", icon: "shopping_basket", activeClass: "bg-primary-container text-on-primary-container" },
  { key: "alat tulis", label: "Alat Tulis", icon: "edit", activeClass: "bg-primary-container text-on-primary-container" },
  { key: "peralatan rumah", label: "Peralatan Rumah", icon: "home_repair_service", activeClass: "bg-primary-container text-on-primary-container" },
  { key: "segar", label: "Produk Segar", icon: "eco", activeClass: "bg-primary-container text-on-primary-container" },
  { key: "kesehatan", label: "Kesehatan", icon: "medical_services", activeClass: "bg-primary-container text-on-primary-container" },
  { key: "pertanian", label: "Pakan Ternak", icon: "pets", activeClass: "bg-primary-container text-on-primary-container" },
  { key: "promo", label: "Promo", icon: "local_offer", activeClass: "bg-tertiary-container text-on-tertiary-container" },
];

const matchCategory = (tags: string[] | null, catKey: string, productId: string) => {
  if (catKey === "promo") {
    const lastChar = productId.slice(-1);
    const code = lastChar.charCodeAt(0);
    const isMockDiscount = code % 2 === 0;
    const hasPromoTag = tags ? tags.map(t => t.toLowerCase()).some(t => t.includes("promo")) : false;
    return isMockDiscount || hasPromoTag;
  }

  if (!tags) return false;
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
  const [showMap, setShowMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Urutkan dari yang terdekat begitu lokasi pengguna diketahui
  const sortedList = useMemo(() => {
    if (userLocation && koperasiList.length > 0) {
      return sortByDistance(koperasiList, userLocation[0], userLocation[1]);
    }
    return koperasiList.map((k) => ({ ...k, distance: 0 }));
  }, [koperasiList, userLocation]);

  const handleUserLocationChange = useCallback(async (lat: number, lng: number) => {
    setUserLocation([lat, lng]);
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

  // Saring daftar koperasi berdasarkan kategori dan kata pencarian
  const filteredList = useMemo(() => {
    let list = sortedList;

    // Saring berdasarkan kategori aktif
    if (activeCategory) {
      list = list.filter((k) => {
        const products = productsByKoperasi[k.id] || [];
        return products.some((p) => matchCategory(p.kategori_produk, activeCategory, p.id_produk));
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
  }, [sortedList, productsByKoperasi, searchQuery, activeCategory]);

  // Saring rekomendasi produk
  const recommendedProducts = useMemo(() => {
    let list = allProducts;

    // Filter kategori
    if (activeCategory) {
      list = list.filter((p) => matchCategory(p.kategori_produk, activeCategory, p.id_produk));
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

  // Gambar representasi produk fungsional (fallback premium dari code.html)
  const getProductImage = (name: string, customUrl: string | null) => {
    const lower = name.toLowerCase();
    if (lower.includes("beras")) {
      return "https://lh3.googleusercontent.com/aida-public/AB6AXuDIPJ4HI0ZwpWO22quURds2NpQBIZWiyOF4ut5odR0uP2LfJDDD2r0kzorLrypKGyU3PFgtMulQb33SD4NDU-GW82JWUfmq7jA9QFJIELuDbXQspXLvohkyTR3N87rzMOJPb9f_SS_hFq0tEYaSAuiCzJTQ8gwUyRW_5V43FhH9hL-Ub6qFEaVChfxcR0aCSLrZ0tK98Y7J2SE07opROxvdjXv4fzu2tW-QLNgyTSfh9INkAA8zLtusQg";
    }
    if (lower.includes("minyak")) {
      return "https://lh3.googleusercontent.com/aida-public/AB6AXuC28MB746g5kp4-zQS00tNFmPSsZvPKia6DAK0ai8W7PVKvStrxiqgDruxPQJMbbecArJ_zflTIrUUyKJ-fFbtwgTWKb1E2vWb99A3YtdHd6x9KtzJ3VhDduNrAJBScZIG6P531_1oXV0AfhZ_Hnma8jBgPpvF_EsYzPbd5a2UrtY3A5fsYHtr4JXcYt08c_gJ7OR6THPWahfPRP7qlClm15IdQUWBx66up30F7r-IrE67mD33UFZdA-Q";
    }
    if (lower.includes("pupuk")) {
      return "https://lh3.googleusercontent.com/aida-public/AB6AXuAY9gQK8j7EQmeaWIbMsry1JjQdj1LRn8zAyGqguXXOKEr_gqA8jD-t7tuXRRVjAjGOcIGiTZ-hbfnNi58J2hzuWbmoutj3vCMs3STJdPzjrwIfPxZQPFyoqRVxgh1nq5h6gTeLIbZUVdhVjmLDzXyfXSnQn6rUqdNaB0k6mnDpHse45dkM0Ij_3c2pNOmJUC5gh9s2Npx4aaEjjrmKTEO4k6FY7mvPM5BVaLLay-Bw0lEQOkH13K8lJQ";
    }
    if (lower.includes("bibit") || lower.includes("biji") || lower.includes("tomat")) {
      return "https://lh3.googleusercontent.com/aida-public/AB6AXuAfJO-i6T8U8aPEQjyKzMSjBBo0vg_aOvoO7dGAx4ZvAb0Fn9ZjQP6KIPbJIO6mMu2QsgIs-pxosDEOjZjzKvEiTee-otZcSBkjvxUbWF8w4esT4KsX_XJBi-hNfmA3pTvI264lsHfz5oWtV5g6kGXtA6DBfI26qvOfMXDpcMXH04sTSZmmqybIxHJZom_glWKP3pbLz9R7dPsQFvE49zWyNs-KTH7OIlNQIqAKKtGeaOQNZNSZPCsyMA";
    }
    if (customUrl && !customUrl.includes("picsum.photos")) {
      return customUrl;
    }
    return `https://picsum.photos/400/400?sig=${encodeURIComponent(name)}`;
  };

  // Mock diskon 10% jika kode terakhir ID produk adalah genap
  const getMockDiscount = (productId: string) => {
    const lastChar = productId.slice(-1);
    const code = lastChar.charCodeAt(0);
    return code % 2 === 0 ? 10 : 0;
  };

  // Tambahkan item ke keranjang
  const handleAddToCart = (product: KopasnowProduct) => {
    const currentKoperasiId = useCartStore.getState().koperasiId;
    const currentKoperasiName = useCartStore.getState().koperasiName;
    const addItem = useCartStore.getState().addItem;
    const clearCart = useCartStore.getState().clear;

    const coopName = koperasiList.find((k) => k.id === product.koperasi_id)?.nama || "Koperasi";
    const discount = getMockDiscount(product.id_produk);
    const originalPrice = parseFloat(product.harga_produk);
    const finalPrice = discount > 0 ? originalPrice * (1 - discount / 100) : originalPrice;

    if (currentKoperasiId && currentKoperasiId !== product.koperasi_id) {
      const confirmClear = window.confirm(
        `Keranjang Anda saat ini berisi barang dari "${currentKoperasiName}". Apakah Anda ingin mengosongkan keranjang untuk membeli barang dari "${coopName}"?`
      );
      if (confirmClear) {
        clearCart();
        addItem(product.koperasi_id, coopName, {
          productId: product.id_produk,
          name: product.nama_produk,
          price: finalPrice,
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
        price: finalPrice,
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
              <span className="font-label-lg text-label-lg">{locationName ? locationName.slice(0, 18) : "Pilih Lokasi"}</span>
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
              <p className="font-body-lg text-body-lg mb-5 opacity-95 text-sm md:text-base">Dapatkan diskon hingga 45% untuk kebutuhan pokok dari Koperasi terdekat. Dukung ekonomi desa, nikmati harga hemat.</p>
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

          {/* Koperasi Terdekat (Split Layout Peta & Daftar) */}
          <section className="mb-section-gap">
            <div className="flex items-center justify-between mb-stack-md">
              <h2 className="font-headline-md text-headline-md text-on-surface">
                {activeCategory ? `Koperasi Kategori "${activeCategory.toUpperCase()}"` : "Koperasi Terdekat"}
              </h2>
              <button
                onClick={() => setShowMap((v) => !v)}
                className="text-primary font-label-lg hover:underline text-sm font-semibold cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">{showMap ? "map_off" : "map"}</span>
                {showMap ? "Tutup Peta" : "Lihat Peta"}
              </button>
            </div>

            <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden flex flex-col lg:flex-row shadow-sm min-h-[350px]">
              {/* Map Side (Kiri di Desktop, Atas di Mobile) */}
              <div className="w-full lg:w-1/2 h-64 lg:h-auto min-h-[300px] relative bg-surface-container-low">
                {!showMap ? (
                  <div className="w-full h-full relative group">
                    <img
                      alt="Map"
                      className="w-full h-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBj3tG8dhtlZPL8FInivdLxDfOmhrzttmnPHn4Dw_6Ibs13nidhX3XDBsJwaM-Cn8z-0Kx8mT44J0RPLAFZvL7VUB6PiObV4RPNSHlSbazuBJI9chg-M9PnanggtcKdnSSjXrePmbHrZ6_34JiP21gIfPvJi-opaLRO9PMS9dW9atQ7q6_4X77FVnO5TGVGbMOagmD4JtEHceOtXV1k0LqyU7OJ54QgvO0CDazEs--MeQKXrboXuLCGBw"
                    />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center transition-colors group-hover:bg-black/35">
                      <button
                        onClick={() => setShowMap(true)}
                        className="bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 font-bold cursor-pointer"
                      >
                        <span className="material-symbols-outlined">map</span>
                        Buka Peta Interaktif
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full min-h-[300px]">
                    <KoperasiMap
                      koperasiList={koperasiList}
                      userPosition={userLocation}
                      onUserLocationChange={handleUserLocationChange}
                    />
                  </div>
                )}
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
                  filteredList.slice(0, 5).map((koperasi, idx) => {
                    const storeImages = [
                      "https://lh3.googleusercontent.com/aida-public/AB6AXuCubzdPlybsGWQYiCtg0yLwPpxOFoxeRrtvu5si2q2tGqIradzyhl_S91QudFIrePb8fFjfbyT8txZHWimcXM_Ui4QpEe4Hjexm1R5S9UPUu1wQ1FSds5F9REM85CStbYwe0XPgSO59lx8nd_DYQT3EeCbQMSxXxX3Aa22vlG5xyl1wG97E5RSgPPKoSU8bcfzS8ExcVUXyWI-a2ZEOulJ7vilbkg2fWf8ROnrhRh85fdp8vZogIXYJjA",
                      "https://lh3.googleusercontent.com/aida-public/AB6AXuBb21L72yflcsTZCvWNfWT5J29qx415Dq9B3amvTz26-AI-O0VcEjnIYvschn1bzaIR55qKoARNhzThBm8DwPtXEEn7tXeGM-0k8KR--nW4Bzi1Fb-OtRqizyFZOPp0IUXKSxM-WsmDltDcqqfA78_FMaAwGzdZXaLOvRQcu0jtToGilHYo4dCK0R5inqqeJhjcDU4lxidZbtUFaiLEN10kwnuDXUXfMqyzcoZQVvHvhMu4rqbVSPmnig"
                    ];
                    const shopImg = storeImages[idx % storeImages.length];

                    return (
                      <div
                        key={koperasi.id}
                        className="p-3 rounded-lg border border-surface-variant hover:border-primary/30 hover:bg-surface-container-low transition-all"
                      >
                        <Link href={`/koperasi/${koperasi.id}`} className="flex gap-4 cursor-pointer">
                          <div className="w-16 h-16 rounded-lg bg-surface-variant shrink-0 overflow-hidden">
                            <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url('${shopImg}')` }}></div>
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h3 className="font-headline-sm text-headline-sm text-on-surface line-clamp-1">{koperasi.nama}</h3>
                              {koperasi.status === "active" ? (
                                <span className="bg-tertiary-container/20 text-tertiary font-label-sm px-2 py-0.5 rounded-full text-[10px] font-bold">Buka</span>
                              ) : (
                                <span className="bg-outline-variant text-secondary font-label-sm px-2 py-0.5 rounded-full text-[10px] font-bold">Tutup</span>
                              )}
                            </div>
                            <p className="text-secondary text-xs mt-1 line-clamp-1">{koperasi.alamat || "Jl. Desa Utama"}</p>
                            <div className="flex items-center gap-1 mt-2 text-on-surface-variant text-[11px] font-bold">
                              <span className="material-symbols-outlined text-[14px]">location_on</span>
                              <span>{koperasi.distance > 0 ? `${(koperasi.distance / 1000).toFixed(1)} km` : "Terdekat"}</span>
                              <span className="mx-1">•</span>
                              <span className="material-symbols-outlined text-[14px] text-tertiary">local_shipping</span>
                              <span className="text-tertiary">Gratis Ongkir</span>
                            </div>
                          </div>
                        </Link>
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
                  const discount = getMockDiscount(prod.id_produk);
                  const priceNum = parseFloat(prod.harga_produk);
                  const discountedPrice = priceNum * (1 - discount / 100);
                  const prodImg = getProductImage(prod.nama_produk, prod.foto_url);
                  const coopName = koperasiList.find((k) => k.id === prod.koperasi_id)?.nama || "Koperasi Desa";

                  return (
                    <div
                      key={prod.id_produk}
                      className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden hover:shadow-md transition-all group flex flex-col"
                    >
                      <div className="aspect-square w-full relative bg-surface-container-low overflow-hidden">
                        <img
                          alt={prod.nama_produk}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          src={prodImg}
                        />
                        {discount > 0 && (
                          <span className="absolute top-2 left-2 bg-error text-on-error font-label-sm px-2 py-1 rounded-full text-[10px] uppercase font-bold">
                            -{discount}%
                          </span>
                        )}
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <h3 className="font-body-md text-body-md text-on-surface line-clamp-2 mb-1 font-semibold text-sm leading-snug">
                          {prod.nama_produk}
                        </h3>
                        <p className="text-secondary text-xs mb-3 font-medium">{coopName}</p>
                        <div className="mt-auto flex items-center justify-between">
                          <div>
                            {discount > 0 ? (
                              <>
                                <p className="text-secondary line-through text-[11px]">Rp {priceNum.toLocaleString("id-ID")}</p>
                                <p className="font-headline-sm text-headline-sm text-tertiary text-sm">Rp {discountedPrice.toLocaleString("id-ID")}</p>
                              </>
                            ) : (
                              <p className="font-headline-sm text-headline-sm text-on-surface text-sm">Rp {priceNum.toLocaleString("id-ID")}</p>
                            )}
                          </div>
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
