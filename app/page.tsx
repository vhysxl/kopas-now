"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useUserStore } from "@/store/useUserStore";
import { signOutAction } from "@/server/actions/auth";
import { getKoperasiList } from "@/server/actions/getKoperasi";
import { getAllActiveProducts, type KopasnowProduct } from "@/server/actions/getProducts";
import { sortByDistance, getLocationName, formatDistance, type KoperasiLocation } from "@/utils/helper/geo";

// Dynamic import for Map component (requires window, cannot SSR)
const KoperasiMap = dynamic(
  () => import("@/components/kopasnow/KoperasiMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center border border-slate-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#CE1126] mx-auto mb-2"></div>
          <p className="text-xs text-slate-400 font-medium">Memuat peta...</p>
        </div>
   </div>
    ),
  }
);

// Interface Definitions
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  unit: string;
  icon: string;
  coopId: string;
  coopName: string;
}

interface Cooperative {
  id: string;
  name: string;
  distance: number;
address: string;
  phone: string;
  status: "active" | "inactive";
  lat: number;
  lng: number;
  kode_koperasi: string;
}

interface CartItem {
  product: Product;
quantity: number;
}

// Helper function to get icon based on product name/category
function getProductIcon(name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('beras') || lowerName.includes('padi')) return '🌾';
  if (lowerName.includes('minyak')) return '🍶';
  if (lowerName.includes('pupuk')) return '🌱';
  if (lowerName.includes('kopi')) return '☕';
  if (lowerName.includes('gula')) return '🧂';
  if (lowerName.includes('pakan')) return '🌽';
  if (lowerName.includes('anyaman') || lowerName.includes('kerajinan')) return '🧺';
  if (lowerName.includes('teh')) return '🍵';
  return '📦';
}

// Helper function to categorize products
function categorizeProduct(name: string, description?: string): string {
  const text = `${name} ${description || ''}`.toLowerCase();
  if (text.includes('beras') || text.includes('minyak') || text.includes('gula')) return 'Sembako';
  if (text.includes('pupuk') || text.includes('pakan')) return 'Pertanian';
  if (text.includes('kopi') || text.includes('teh')) return 'Kopi & Teh';
  if (text.includes('kerajinan') || text.includes('anyaman')) return 'Kerajinan';
  return 'Lainnya';
}

// Carousel Promo Banners
const BANNERS = [
  {
    id: 1,
    title: "KopasOne VIP Member",
    subtitle: "Dapatkan Gratis Ongkir & potongan harga khusus s/d 10% untuk produk kerajinan desa.",
    cta: "Gabung KopasOne",
    bg: "from-[#111111] via-[#1F1F1F] to-[#000000] border border-amber-500/20 text-white",
    badge: "KopasOne VIP",
    badgeBg: "bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black",
    tagline: "★ BENEFIT ANGGOTA UTAMA",
  },
  {
    id: 2,
    title: "Bahan Pangan Segar Desa",
    subtitle: "Sembako kualitas terbaik disalurkan langsung dari Kelompok Tani setempat ke rumah Anda.",
    cta: "Belanja Sembako",
    bg: "from-[#06C167] to-[#049B52] text-white",
    badge: "Harga Subsidi",
    badgeBg: "bg-white text-[#06C167] font-black",
    tagline: "🌱 DUKUNG PETANI LOKAL",
  },
];

export default function Home() {
  const user = useUserStore((state) => state.user);
  const customer = useUserStore((state) => state.customer);
  const isLoading = useUserStore((state) => state.isLoading);

  // Supabase Data States
  const [koperasiList, setKoperasiList] = useState<KoperasiLocation[]>([]);
  const [cooperatives, setCooperatives] = useState<Cooperative[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // States
  const [gpsActive, setGpsActive] = useState(true);
  const [selectedCoopId, setSelectedCoopId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">("delivery");
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState<{
    coopId: string;
    coopName: string;
    total: number;
    items: { name: string; qty: number }[];
  } | null>(null);

  // Promo Code States
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [promoError, setPromoError] = useState("");

  // Banner Slideshow State
  const [currentBanner, setCurrentBanner] = useState(0);

  // Rider Animation State
  const [riderProgress, setRiderProgress] = useState(0);

  // Fetch koperasi and products data from Supabase on mount
  useEffect(() => {
    async function fetchData() {
      setIsFetching(true);
      const [koperasiResult, productsResult] = await Promise.all([
        getKoperasiList(),
        getAllActiveProducts(),
      ]);

      if (koperasiResult.error) {
        setFetchError(koperasiResult.error);
      } else if (koperasiResult.data) {
        setKoperasiList(koperasiResult.data);
     
        // Convert to Cooperative format for existing UI
        const coops: Cooperative[] = koperasiResult.data.map((k) => ({
          id: k.id,
  name: k.nama,
     distance: 0,
          address: k.alamat || '',
          phone: k.admin_phone || '',
    status: k.status as "active" | "inactive",
          lat: k.lat,
 lng: k.lng,
       kode_koperasi: k.kode_koperasi,
        }));
     setCooperatives(coops);
}

if (productsResult.data) {
        // Convert Supabase products to Product format
        const convertedProducts: Product[] = productsResult.data.map((p: KopasnowProduct) => ({
          id: p.id_produk,
       name: p.nama_produk,
  price: parseFloat(p.harga_produk),
          stock: p.stok_tersedia,
       category: categorizeProduct(p.nama_produk, p.deskripsi_produk || ''),
 unit: p.satuan_produk,
    icon: getProductIcon(p.nama_produk),
          coopId: p.koperasi_id,
          coopName: koperasiResult.data?.find((k) => k.id === p.koperasi_id)?.nama || 'Koperasi',
        }));
        setProducts(convertedProducts);
      }
      
    setIsFetching(false);
    }
    fetchData();
  }, []);

  // Sort cooperatives by distance when user location changes
  useEffect(() => {
    if (userLocation && koperasiList.length > 0) {
      const sorted = sortByDistance(koperasiList, userLocation[0], userLocation[1]);
      const coops: Cooperative[] = sorted.map((k) => ({
id: k.id,
 name: k.nama,
   distance: k.distance,
     address: k.alamat || '',
        phone: k.admin_phone || '',
        status: k.status as "active" | "inactive",
        lat: k.lat,
        lng: k.lng,
        kode_koperasi: k.kode_koperasi,
      }));
      setCooperatives(coops);
    }
  }, [userLocation, koperasiList]);

  const handleUserLocationChange = useCallback(async (lat: number, lng: number) => {
    setUserLocation([lat, lng]);
    const locName = await getLocationName(lat, lng);
    if (locName) {
      setLocationName(locName);
    }
  }, []);

  // Auto-rotate banners
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev === BANNERS.length - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Rider Progress Animation logic when checkout is successful
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (checkoutSuccess) {
      setRiderProgress(0);
      interval = setInterval(() => {
        setRiderProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 1;
        });
      }, 150);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [checkoutSuccess]);

  // Layout calculations
  const nama = customer?.nama || user?.user_metadata?.nama || "Anggota Koperasi";
  const email = customer?.email || user?.email || "-";
  const phone = customer?.phone || user?.user_metadata?.phone || "-";
  const joinedDate = customer?.created_at
    ? new Date(customer.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Baru saja bergabung";

  // Categories list with Emojis & Styles for Uber-style Circles
  const categories = [
    { name: "Semua", icon: "🛍️", bg: "bg-slate-100 text-slate-800" },
    { name: "Sembako", icon: "🌾", bg: "bg-amber-100 text-amber-700" },
    { name: "Pertanian", icon: "🌱", bg: "bg-emerald-100 text-emerald-700" },
    { name: "Kopi & Teh", icon: "☕", bg: "bg-orange-100 text-orange-700" },
    { name: "Kerajinan", icon: "🧺", bg: "bg-indigo-100 text-indigo-700" },
  ];

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchCoop = selectedCoopId === "all" || product.coopId === selectedCoopId;
      const matchCategory = selectedCategory === "Semua" || product.category === selectedCategory;
      const matchSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCoop && matchCategory && matchSearch;
    });
  }, [products, selectedCoopId, selectedCategory, searchQuery]);

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prevCart;
        return prevCart.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prevCart) => {
      return prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.product.stock) return item;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const cartTotalItems = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cart]);

  // Determine delivery fee based on selected store
  const currentStore = useMemo(() => {
    if (cart.length === 0) return null;
  const firstItemCoopId = cart[0].product.coopId;
    return cooperatives.find((c) => c.id === firstItemCoopId) || null;
  }, [cart, cooperatives]);

  const deliveryFee = useMemo(() => {
    if (deliveryMethod === "pickup" || cart.length === 0) return 0;
    // Calculate delivery fee based on distance (if available)
    if (currentStore && currentStore.distance > 0) {
      // Rp 5000 base + Rp 1000 per km
    return 5000 + Math.floor(currentStore.distance * 1000);
    }
    return 5000; // Default delivery fee
  }, [deliveryMethod, currentStore, cart]);

  // Service Fee typical of Uber Mart
  const serviceFee = cart.length > 0 ? 2000 : 0;

  // Promo Calculation
  const discountAmount = useMemo(() => {
    if (appliedPromo && cartSubtotal > 0) {
      return Math.round(cartSubtotal * 0.1); // 10% discount
    }
    return 0;
  }, [appliedPromo, cartSubtotal]);

  const cartTotalAmount = Math.max(0, cartSubtotal + deliveryFee + serviceFee - discountAmount);

  const handleApplyPromo = () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (code === "KOPASONE" || code === "DISKON10") {
      setAppliedPromo(code);
      setPromoError("");
    } else {
      setPromoError("Kode promo tidak valid");
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo("");
    setPromoCodeInput("");
    setPromoError("");
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    // Deduct stock locally
    setProducts((prevProducts) => {
      return prevProducts.map((p) => {
        const cartItem = cart.find((item) => item.product.id === p.id);
        if (cartItem) {
          return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
        }
        return p;
      });
    });

    // Save checkout details for success screen
    setLastOrderDetails({
      coopId: cart[0].product.coopId,
      coopName: cart[0].product.coopName,
      total: cartTotalAmount,
      items: cart.map((item) => ({ name: item.product.name, qty: item.quantity })),
    });

    setCart([]);
    setIsCartOpen(false);
    setCheckoutSuccess(true);
  };

  // Compute rider coordinates along route (simplified for now)
  const riderCoords = useMemo(() => {
    // Simplified animation - can be enhanced with actual coordinates later
    return { x: 180 + (riderProgress * 0.5), y: 160 - (riderProgress * 0.3) };
  }, [riderProgress]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#06C167]"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Middleware handles redirect
  }

  return (
    <div className="min-h-screen bg-[#F6F6F6] font-sans selection:bg-[#06C167] selection:text-white flex flex-col relative overflow-x-hidden text-black">
      {/* Top Banner (Merah Putih Decor & Uber Green Accent Line) */}
      <div className="w-full h-1 flex fixed top-0 left-0 z-50">
        <div className="w-1/3 bg-[#CE1126]" />
        <div className="w-1/3 bg-white" />
        <div className="w-1/3 bg-[#06C167]" />
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-1 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo & Delivery Toggle */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1 cursor-pointer" onClick={() => setSelectedCoopId("all")}>
              <span className="text-2xl font-black tracking-tight text-black">Kopas</span>
              <span className="text-2xl font-black tracking-tight text-[#06C167]">Now</span>
              <span className="bg-[#06C167] text-white px-1.5 py-0.5 rounded-sm font-bold text-[9px] uppercase tracking-wider ml-1">
                Mart
              </span>
            </div>

            {/* Delivery vs Pickup Toggle (Uber Eats Style) */}
            <div className="hidden sm:flex bg-[#F3F3F3] p-1 rounded-full border border-gray-100">
              <button
                onClick={() => setDeliveryMethod("delivery")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                  deliveryMethod === "delivery"
                    ? "bg-black text-white shadow-sm"
                    : "text-gray-500 hover:text-black"
                }`}
              >
                Kirim
              </button>
              <button
                onClick={() => setDeliveryMethod("pickup")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                  deliveryMethod === "pickup"
                    ? "bg-black text-white shadow-sm"
                    : "text-gray-500 hover:text-black"
                }`}
              >
                Ambil
              </button>
            </div>
          </div>

     {/* Hyperlocal Address Selector */}
        <div className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F3F3F3] hover:bg-[#EAEAEA] transition-all cursor-pointer text-xs font-bold text-black">
            <span className="text-sm">📍</span>
            <span className="truncate max-w-[200px]">
       {gpsActive ? (locationName || "Mendeteksi lokasi...") : "GPS Dinonaktifkan"}
            </span>
          <svg
   className="w-3 h-3 text-gray-500 shrink-0"
     fill="none"
     stroke="currentColor"
        strokeWidth="2.5"
     viewBox="0 0 24 24"
   >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
 </div>

          {/* Right Header Navigation */}
          <div className="flex items-center gap-3">
            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-full transition-all duration-200 cursor-pointer flex items-center gap-2 text-xs font-bold"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                />
              </svg>
              <span>Keranjang</span>
              {cartTotalItems > 0 && (
                <span className="w-5 h-5 bg-[#06C167] text-white text-[10px] font-black rounded-full flex items-center justify-center border border-black animate-scale-in">
                  {cartTotalItems}
                </span>
              )}
            </button>

            {/* Profile Avatar Trigger */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-black hover:bg-neutral-800 transition-all cursor-pointer shadow-sm"
            >
              {nama.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Geolocations & Stores List */}
        <section className="lg:col-span-1 space-y-6 flex flex-col">
          
          {/* Geolocation Status Card */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Pencarian Hyperlocal
              </h2>
              <button
                onClick={() => setGpsActive(!gpsActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  gpsActive ? "bg-[#06C167]" : "bg-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    gpsActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {gpsActive ? (
              <div className="flex items-start gap-3 bg-emerald-50/40 border border-emerald-100 rounded-xl p-3.5 animate-fade-in">
                <span className="relative flex h-3.5 w-3.5 mt-0.5">
                  <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#06C167]"></span>
                </span>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-emerald-900">GPS Aktif & Akurat</p>
                  <p className="text-[11px] text-emerald-600 leading-normal">
                    Menampilkan produk dari koperasi dalam radius 5 km
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-amber-50/50 border border-amber-100 rounded-xl p-3.5 animate-fade-in">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4 text-amber-600 mt-0.5 shrink-0"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-amber-900">GPS Dinonaktifkan</p>
                  <p className="text-[11px] text-amber-600 leading-normal">
                    Nyalakan GPS untuk menemukan toko koperasi lokal terdekat.
                  </p>
                  <button
                    onClick={() => setGpsActive(true)}
                    className="text-[11px] font-black text-[#06C167] underline hover:text-emerald-700 block cursor-pointer"
                  >
                    Aktifkan GPS Sekarang
                  </button>
                </div>
              </div>
            )}
          </div>

      {/* Real Leaflet Map */}
          {gpsActive && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden flex flex-col animate-fade-in">
           <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
    <span className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Peta Koperasi</span>
      <span className="text-[10px] text-gray-400 font-mono">
      {locationName || "Mendeteksi lokasi..."}
        </span>
      </div>
          <div className="h-64 relative">
                {isFetching ? (
 <div className="w-full h-full flex items-center justify-center bg-slate-100">
        <div className="text-center">
  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#CE1126] mx-auto mb-2"></div>
            <p className="text-xs text-slate-400 font-medium">Memuat peta...</p>
            </div>
                  </div>
            ) : fetchError ? (
     <div className="w-full h-full flex items-center justify-center bg-red-50">
        <p className="text-xs text-red-600">{fetchError}</p>
        </div>
 ) : (
      <KoperasiMap
          koperasiList={koperasiList}
  onUserLocationChange={handleUserLocationChange}
                  selectedId={selectedMapId}
 />
    )}
    </div>
      </div>
  )}

          {/* Cooperatives/Stores List */}
          {gpsActive && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex-1 flex flex-col space-y-4">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                Pilih Toko Koperasi
              </h3>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] lg:max-h-none">
                {/* Store 1: All Stores */}
                <button
                  onClick={() => setSelectedCoopId("all")}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                    selectedCoopId === "all"
                      ? "bg-slate-900 border-slate-900 shadow-sm text-white"
                      : "bg-white border-gray-100 text-gray-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                      selectedCoopId === "all" ? "bg-[#06C167] text-white" : "bg-gray-100 text-black"
                    }`}>
                      ALL
                    </span>
                    <div>
                      <p className={`text-xs font-extrabold leading-none ${selectedCoopId === "all" ? "text-white" : "text-black"}`}>
                        Semua Koperasi
                      </p>
                      <p className={`text-[10px] mt-1 ${selectedCoopId === "all" ? "text-gray-300" : "text-gray-400"}`}>
                        Lihat produk dari semua toko
                      </p>
                    </div>
                  </div>
                  {selectedCoopId === "all" && (
                    <span className="w-2 h-2 rounded-full bg-[#06C167] shadow-sm" />
                  )}
                </button>

        {/* Individual Store Listings (Uber Store Cards style) */}
    {isFetching ? (
    <div className="space-y-3">
        {[1, 2].map((i) => (
        <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse border border-gray-200" />
 ))}
        </div>
       ) : cooperatives.length === 0 ? (
         <div className="text-center py-8 text-gray-400">
          <p className="text-xs">Tidak ada koperasi ditemukan</p>
  </div>
 ) : (
    cooperatives.slice(0, 10).map((coop, idx) => {
           const isSelected = selectedCoopId === coop.id;
          const gradients = [
               "bg-gradient-to-r from-red-500 to-rose-700",
    "bg-gradient-to-r from-amber-500 to-emerald-600",
  "bg-gradient-to-r from-blue-500 to-cyan-600",
      "bg-gradient-to-r from-purple-500 to-pink-600",
             ];
      return (
  <button
        key={coop.id}
     onClick={() => setSelectedCoopId(coop.id)}
        className={`w-full text-left rounded-xl border overflow-hidden transition-all duration-200 cursor-pointer flex flex-col ${
     isSelected
         ? "border-black bg-white ring-1 ring-black shadow-md"
              : "border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm"
    }`}
      >
              {/* Banner Cover representation (Styled CSS Gradient) */}
      <div className={`h-14 w-full relative ${gradients[idx % gradients.length]} flex items-end p-2`}>
   {/* Shadow overlay */}
         <div className="absolute inset-0 bg-black/10" />
        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-wider bg-white/90 text-black shadow-sm">
  {coop.kode_koperasi}
      </span>
          </div>

 {/* Store Card Info */}
      <div className="p-3.5 space-y-2">
     <div className="flex items-start justify-between gap-1">
         <p className="text-xs font-black text-black leading-tight line-clamp-1">{coop.name}</p>
  <span className="px-1.5 py-0.5 rounded-sm text-[9px] font-black bg-emerald-50 text-emerald-700 shrink-0 border border-emerald-100">
         {coop.status === 'active' ? 'Buka' : 'Tutup'}
       </span>
            </div>

         {/* Store Metadata */}
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
  {coop.distance > 0 && (
        <>
       <span>{coop.distance.toFixed(1)} km</span>
      <span>•</span>
  </>
            )}
                 <span>{coop.phone || 'No Phone'}</span>
                  </div>

  <p className="text-[10px] text-gray-400 line-clamp-1 pt-1.5 border-t border-gray-50">
    {coop.address || 'Alamat tidak tersedia'}
          </p>
      </div>
  </button>
          );
       })
    )}
       </div>
            </div>
          )}
        </section>

        {/* Right Column: Banners, Categories, Search, Product Feed */}
        <section className="lg:col-span-3 space-y-6">
          
          {/* Promo Slider Banner */}
          <div className={`rounded-2xl p-6 sm:p-8 bg-gradient-to-r ${BANNERS[currentBanner].bg} transition-all duration-500 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[180px] sm:min-h-[200px]`}>
            {/* Visual background rings */}
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/5 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-xl pointer-events-none" />

            {/* Top row */}
            <div className="space-y-2.5 relative z-10">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-widest ${BANNERS[currentBanner].badgeBg}`}>
                  {BANNERS[currentBanner].badge}
                </span>
                <span className="text-[9px] font-black tracking-wider opacity-80 uppercase">
                  {BANNERS[currentBanner].tagline}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight max-w-md">
                {BANNERS[currentBanner].title}
              </h2>
              <p className="text-xs sm:text-sm opacity-90 max-w-lg leading-relaxed font-medium">
                {BANNERS[currentBanner].subtitle}
              </p>
            </div>

            {/* Bottom Row */}
            <div className="flex items-center justify-between gap-4 mt-6 relative z-10">
              <button className="px-5 py-2.5 bg-white text-black hover:bg-gray-100 rounded-full text-xs font-extrabold shadow-md transition-all active:scale-95 cursor-pointer">
                {BANNERS[currentBanner].cta}
              </button>

              {/* Slider Dots */}
              <div className="flex gap-1.5">
                {BANNERS.map((banner, idx) => (
                  <button
                    key={banner.id}
                    onClick={() => setCurrentBanner(idx)}
                    className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                      currentBanner === idx ? "bg-white w-4" : "bg-white/40 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Search bar & Store Status Title */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-black tracking-tight">Katalog Belanja Desa</h2>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-normal font-medium">
                  Persediaan bahan makanan segar & kebutuhan harian real-time dari unit usaha desa.
                </p>
              </div>

              {/* Search input container */}
              <div className="relative w-full sm:w-72 shrink-0">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400 pointer-events-none">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.602 10.602z"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Cari beras, minyak, pupuk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#F3F3F3] border border-transparent focus:border-black focus:bg-white rounded-full text-black text-xs font-medium placeholder-gray-400 outline-none transition-all"
                />
              </div>
            </div>

            {/* Circular Uber-style Categories (Horizontal Scroll) */}
            <div className="flex gap-4 overflow-x-auto py-2 scrollbar-none border-t border-gray-50 pt-4 justify-start sm:justify-start">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className="flex flex-col items-center text-center shrink-0 cursor-pointer group"
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-200 ${
                      isActive
                        ? "bg-[#06C167] text-white shadow-md shadow-emerald-500/10 border-2 border-black scale-105"
                        : "bg-[#F3F3F3] text-black hover:bg-gray-200 border-2 border-transparent"
                    } group-hover:scale-105 active:scale-95`}>
                      {cat.icon}
                    </div>
                    <span className={`text-[10px] mt-2 font-bold tracking-tight ${
                      isActive ? "text-black font-extrabold" : "text-gray-500 group-hover:text-black"
                    }`}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Feed Grid */}
          {!gpsActive ? (
            <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center shadow-xs">
              <span className="text-4xl">📍</span>
              <h3 className="text-base font-extrabold text-black mt-4">Aktifkan GPS Anda</h3>
              <p className="text-gray-400 mt-1.5 max-w-sm mx-auto text-xs leading-relaxed font-medium">
                Pencarian hyperlocal mendeteksi ketersediaan barang di sekitar Anda. Aktifkan GPS untuk menampilkan daftar produk.
              </p>
              <button
                onClick={() => setGpsActive(true)}
                className="mt-4 px-4 py-2 bg-black text-white hover:bg-neutral-800 text-xs font-bold rounded-full cursor-pointer transition-all"
              >
                Nyalakan GPS
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center shadow-xs">
              <span className="text-4xl animate-bounce inline-block">🔍</span>
              <h3 className="text-base font-extrabold text-black mt-4">Produk Tidak Ditemukan</h3>
              <p className="text-gray-400 mt-1.5 max-w-sm mx-auto text-xs leading-relaxed font-medium">
                Maaf, tidak ada produk di toko ini yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= 10;
                
                // Check if already in cart to display counter on product card (Uber UX)
                const cartItem = cart.find((item) => item.product.id === product.id);

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden"
                  >
                    {/* Upper Container / Visual Emoji and Badges */}
                    <div className="p-4.5 space-y-4">
                      {/* Image Frame Container (Styled light gray frame like Uber eats) */}
                      <div className="w-full aspect-square bg-[#F6F6F6] rounded-xl flex items-center justify-center text-5xl relative shadow-inner select-none">
                        {product.icon}

                        {/* Top floaters */}
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-white text-black shadow-sm">
                          {product.category}
                        </span>

                        {isOutOfStock ? (
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                            Habis
                          </span>
                        ) : isLowStock ? (
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100 animate-pulse">
                            Sisa {product.stock}
                          </span>
                        ) : (
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Stok {product.stock}
                          </span>
                        )}
                      </div>

                      {/* Product Metadata */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-[#06C167] font-black uppercase tracking-widest block">
                          {product.coopName.toUpperCase()}
                        </span>
                        <h4 className="text-sm font-black text-black leading-snug line-clamp-2 min-h-[40px]">
                          {product.name}
                        </h4>
                        <span className="text-[10px] text-gray-400 block font-medium">
                          Satuan: 1 {product.unit}
                        </span>
                      </div>
                    </div>

                    {/* Lower Container / Price and Add button */}
                    <div className="px-4.5 py-3.5 bg-slate-50/50 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 font-extrabold uppercase leading-none mb-1">Harga</span>
                        <span className="text-sm font-black text-black">
                          Rp {product.price.toLocaleString("id-ID")}
                          <span className="text-[10px] text-gray-500 font-medium">/{product.unit}</span>
                        </span>
                      </div>

                      {/* Counter or Buy Button */}
                      {cartItem ? (
                        <div className="flex items-center bg-[#06C167] text-white h-8 px-2 rounded-full text-xs font-black shadow-sm transition-all animate-scale-in">
                          <button
                            onClick={() => updateCartQty(product.id, -1)}
                            className="w-5 h-5 flex items-center justify-center hover:bg-black/10 rounded-full transition-all text-white font-bold cursor-pointer text-sm"
                          >
                            -
                          </button>
                          <span className="min-w-5 text-center text-xs font-extrabold">{cartItem.quantity}</span>
                          <button
                            onClick={() => updateCartQty(product.id, 1)}
                            className="w-5 h-5 flex items-center justify-center hover:bg-black/10 rounded-full transition-all text-white font-bold cursor-pointer text-sm"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          disabled={isOutOfStock}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm ${
                            isOutOfStock
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-[#06C167] text-white hover:bg-[#05A357] hover:scale-105 active:scale-95"
                          }`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={3}
                            stroke="currentColor"
                            className="w-4 h-4"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Floating Bottom Cart Notification (Like Uber mobile app experience) */}
      {!isCartOpen && cartTotalItems > 0 && (
        <div className="fixed bottom-6 inset-x-4 max-w-xl mx-auto z-45 animate-fade-in">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-black text-white hover:bg-neutral-900 px-6 py-4 rounded-xl shadow-2xl flex items-center justify-between border border-neutral-800 cursor-pointer transition-all duration-300 hover:scale-101"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 bg-[#06C167] text-white text-xs font-black rounded-full flex items-center justify-center">
                {cartTotalItems}
              </span>
              <div className="text-left">
                <p className="text-xs font-bold leading-none">Lihat Keranjang Belanja</p>
                <p className="text-[10px] text-gray-400 mt-1 font-medium truncate max-w-[200px] sm:max-w-none">
                  Dari {cart[0].product.coopName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-black">Rp {cartTotalAmount.toLocaleString("id-ID")}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-4 h-4 text-[#06C167]"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </button>
        </div>
      )}

      {/* Cart Sliding Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 flex justify-end animate-fade-in">
          {/* Backdrop Overlay closes cart */}
          <div className="absolute inset-0" onClick={() => setIsCartOpen(false)} />
          
          {/* Drawer Body */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-slide-in text-black">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">🛒</span>
                <h3 className="text-base font-black text-black">Keranjang Belanja</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-slate-50 cursor-pointer transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-20 text-gray-400 space-y-3">
                  <span className="text-6xl block select-none">🛒</span>
                  <p className="text-sm font-extrabold text-black">Keranjang belanja kosong</p>
                  <p className="text-xs max-w-xs mx-auto text-gray-400 leading-relaxed font-medium">
                    Masukkan produk segar dari katalog koperasi desa untuk melakukan pesanan.
                  </p>
                </div>
              ) : (
                <>
                  {/* Merchant badge */}
                  <div className="bg-[#F6F6F6] rounded-xl p-3 flex items-center gap-2 border border-gray-100">
                    <span className="text-sm">🏠</span>
                    <div>
                      <p className="text-[10px] text-gray-400 font-extrabold uppercase leading-none">MEMBELI DARI</p>
                      <p className="text-xs font-black mt-1 text-black">{cart[0].product.coopName}</p>
                    </div>
                  </div>

                  {/* Cart Items List */}
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center gap-4 p-3 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-all shadow-xs"
                      >
                        <span className="text-2xl p-2 bg-[#F6F6F6] rounded-lg shrink-0 select-none">
                          {item.product.icon}
                        </span>

                        <div className="flex-1 min-w-0 space-y-0.5">
                          <p className="text-xs font-black text-black truncate leading-snug">{item.product.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold">Rp {item.product.price.toLocaleString("id-ID")} / {item.product.unit}</p>
                        </div>

                        {/* Direct Qty Modifier */}
                        <div className="flex items-center bg-[#F3F3F3] rounded-full border border-gray-100 shadow-inner">
                          <button
                            onClick={() => updateCartQty(item.product.id, -1)}
                            className="px-2.5 py-1 text-gray-600 hover:text-black rounded-l-full font-extrabold text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-black text-black min-w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQty(item.product.id, 1)}
                            className="px-2.5 py-1 text-gray-600 hover:text-black rounded-r-full font-extrabold text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Option Selector (Pill Toggle in cart drawer) */}
                  <div className="space-y-2 border-t border-gray-100 pt-4">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                      Metode Penyaluran
                    </label>
                    <div className="flex bg-[#F3F3F3] p-1 rounded-full border border-gray-100">
                      <button
                        onClick={() => setDeliveryMethod("pickup")}
                        className={`flex-1 py-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
                          deliveryMethod === "pickup"
                            ? "bg-white text-black shadow-sm"
                            : "text-gray-500 hover:text-black"
                        }`}
                      >
                        Ambil Sendiri
                      </button>
                      <button
                        onClick={() => setDeliveryMethod("delivery")}
                        className={`flex-1 py-2 text-xs font-bold rounded-full transition-all cursor-pointer ${
                          deliveryMethod === "delivery"
                            ? "bg-white text-black shadow-sm"
                            : "text-gray-500 hover:text-black"
                        }`}
                      >
                        Kirim ke Rumah
                      </button>
                    </div>
                  </div>

                  {/* Promo Code Code Section */}
                  <div className="space-y-2 border-t border-gray-100 pt-4">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                      Kode Promo (Simulasi)
                    </label>
                    {appliedPromo ? (
                      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">🏷️</span>
                          <span className="text-xs font-bold text-emerald-800">
                            Promo Aktif: <strong className="font-extrabold">{appliedPromo}</strong> (Hemat 10%)
                          </span>
                        </div>
                        <button
                          onClick={handleRemovePromo}
                          className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Contoh: KOPASONE atau DISKON10"
                            value={promoCodeInput}
                            onChange={(e) => setPromoCodeInput(e.target.value)}
                            className="flex-1 bg-[#F3F3F3] border border-transparent focus:border-black rounded-lg px-3 py-2 text-xs font-bold outline-none"
                          />
                          <button
                            onClick={handleApplyPromo}
                            className="bg-black hover:bg-neutral-800 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-all"
                          >
                            Gunakan
                          </button>
                        </div>
                        {promoError && <p className="text-[10px] text-red-650 font-bold">{promoError}</p>}
                        <p className="text-[9px] text-gray-400 leading-normal">
                          Tips: Gunakan kode <strong className="text-gray-650">KOPASONE</strong> atau <strong className="text-gray-650">DISKON10</strong> untuk mendapatkan diskon 10%.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer Summary & Checkout */}
            {cart.length > 0 && (
              <div className="px-6 py-5 border-t border-gray-100 space-y-4 bg-slate-50/50">
                {/* Receipt Details */}
                <div className="space-y-2 text-xs font-bold text-gray-500">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-black">Rp {cartSubtotal.toLocaleString("id-ID")}</span>
                  </div>
                  {deliveryMethod === "delivery" && (
                    <div className="flex justify-between">
                      <span>Ongkos Kirim Kurir</span>
                      <span className="text-black">Rp {deliveryFee.toLocaleString("id-ID")}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Biaya Layanan</span>
                    <span className="text-black">Rp {serviceFee.toLocaleString("id-ID")}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-extrabold">
                      <span>Diskon Promo</span>
                      <span>-Rp {discountAmount.toLocaleString("id-ID")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-black font-black border-t border-gray-200/60 pt-3 text-sm">
                    <span>Total Tagihan</span>
                    <span className="text-[#06C167] text-base">
                      Rp {cartTotalAmount.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* Submit Checkout */}
                <button
                  onClick={handleCheckout}
                  className="w-full bg-[#06C167] hover:bg-[#05A357] text-white py-4 px-5 font-black text-xs rounded-full transition-all duration-200 shadow-md active:scale-98 flex items-center justify-between cursor-pointer"
                >
                  <span>Pesan Sekarang (Simulasi)</span>
                  <span>Rp {cartTotalAmount.toLocaleString("id-ID")}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Member Profile Modal Card (Styled like premium VIP Black Card) */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop overlay */}
          <div className="absolute inset-0" onClick={() => setIsProfileOpen(false)} />

          {/* Profile Card body */}
          <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100 animate-fade-in z-10 flex flex-col">
            {/* Top accent branding line */}
            <div className="w-full h-1 bg-[#06C167]" />

            <div className="p-6 pb-2">
              {/* Premium VIP black card container */}
              <div className="bg-gradient-to-br from-[#111111] via-[#242424] to-[#000000] text-white p-5 rounded-2xl shadow-xl relative overflow-hidden space-y-6 border border-amber-500/20 select-none">
                {/* Shiny glow patterns */}
                <div className="absolute -right-12 -top-12 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-[#06C167]/20 rounded-full blur-2xl pointer-events-none" />
                
                {/* Card Title */}
                <div className="flex items-center justify-between border-b border-white/15 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">★</span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 leading-none">
                        KOPASONE
                      </p>
                      <p className="text-[7px] text-gray-400 font-extrabold tracking-wider leading-none mt-1">
                        ANGGOTA KOPERASI DIGITAL
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sm text-[8px] font-black bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-sm uppercase tracking-wider">
                    VIP GOLD
                  </span>
                </div>

                {/* Card Info fields */}
                <div className="space-y-4">
                  <div>
                    <span className="text-[8px] text-gray-400 uppercase tracking-widest block font-extrabold leading-none mb-1">
                      Nama Anggota
                    </span>
                    <span className="text-sm font-black tracking-wide block text-white">{nama}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[8px] text-gray-400 uppercase tracking-widest block font-extrabold leading-none mb-1">
                        Nomor Anggota
                      </span>
                      <span className="text-xs font-mono font-bold block text-amber-200">
                        {user.id.slice(0, 10).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[8px] text-gray-400 uppercase tracking-widest block font-extrabold leading-none mb-1">
                        Mulai Bergabung
                      </span>
                      <span className="text-xs font-bold block text-white truncate">{joinedDate}</span>
                    </div>
                  </div>
                </div>

                {/* Card Barcode/Details footer */}
                <div className="border-t border-white/15 pt-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[8px] text-gray-400 uppercase tracking-widest block font-extrabold leading-none mb-1">
                      KONTAK / E-MAIL
                    </span>
                    <span className="text-[10px] text-gray-200 font-semibold block truncate max-w-[170px]">
                      {email || phone}
                    </span>
                  </div>
                  
                  {/* QR Code element mock */}
                  <div className="w-10 h-10 bg-white rounded p-1 flex items-center justify-center shadow-inner">
                    <svg className="w-full h-full text-black" viewBox="0 0 100 100" fill="currentColor">
                      <rect width="25" height="25" />
                      <rect x="75" width="25" height="25" />
                      <rect y="75" width="25" height="25" />
                      <rect x="35" y="35" width="30" height="30" />
                      <rect x="15" y="55" width="10" height="10" />
                      <rect x="55" y="15" width="10" height="10" />
                      <rect x="75" y="75" width="15" height="15" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile actions detail list */}
            <div className="p-6 pt-4 space-y-4 text-xs font-bold">
              <div className="bg-[#F6F6F6] rounded-xl p-4 border border-gray-100 text-gray-500 space-y-2.5">
                <div className="flex justify-between">
                  <span>Surel Terdaftar</span>
                  <span className="text-black font-extrabold">{email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nomor Telpon</span>
                  <span className="text-black font-extrabold">{phone}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="flex-1 bg-[#F3F3F3] hover:bg-gray-200 text-black py-3 rounded-full transition-all cursor-pointer text-center"
                >
                  Tutup
                </button>
                <form action={signOutAction} className="flex-1">
                  <button
                    type="submit"
                    className="w-full bg-[#CE1126] hover:bg-red-700 text-white py-3 rounded-full transition-all cursor-pointer text-center font-bold"
                  >
                    Keluar Akun
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Success Screen with Real-time Scooter Animation map (Uber style tracking) */}
      {checkoutSuccess && lastOrderDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 text-center shadow-2xl border border-gray-100 animate-fade-in space-y-5 text-black">
            
            {/* Header info */}
            <div className="space-y-1">
              <div className="w-12 h-12 bg-emerald-50 text-[#06C167] rounded-full flex items-center justify-center mx-auto border border-emerald-100 shadow-inner">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                  stroke="currentColor"
                  className="w-6 h-6 animate-pulse"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-base font-black text-black tracking-tight mt-2">Pesanan Sedang Diproses</h3>
              <p className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-wider">
                Pengantaran Hyperlocal Real-Time
              </p>
            </div>

            {/* Interactive Live Tracking Map with Rider Scooter emoji animation */}
            <div className="bg-[#E5E9F0] h-44 rounded-2xl relative overflow-hidden shadow-inner border border-gray-200">
              <svg className="w-full h-full" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Background Roads / Map outline */}
                <path d="M 0,150 Q 150,150 200,80 T 400,200" stroke="#CBD5E1" strokeWidth="8" fill="none" />
                <path d="M 200,0 Q 180,120 180,180 T 300,300" stroke="#CBD5E1" strokeWidth="6" fill="none" />
                
    {/* Store Pin (Origin) */}
<g transform="translate(140, 110)">
                  <circle r="12" fill="#06C167" fillOpacity="0.2" className="animate-pulse" />
                  <circle r="7" fill="#06C167" />
                  <text y="3" fontSize="8" fontWeight="bold" fill="white" textAnchor="middle">S</text>
                </g>

                {/* User Location (Destination) */}
                <g transform="translate(180, 160)">
                  <circle r="12" fill="#3B82F6" fillOpacity="0.2" />
                  <circle r="7" fill="#3B82F6" />
                  <text y="3" fontSize="8" fontWeight="bold" fill="white" textAnchor="middle">H</text>
                </g>

 {/* Path Dotted Rider track */}
             {lastOrderDetails && (
            <path
     d="M 140 110 L 180 160"
         stroke="#000000"
    strokeWidth="2.5"
          strokeDasharray="4 4"
     fill="none"
         />
       )}

                {/* Animated Rider Scooter Emoji */}
                <g transform={`translate(${riderCoords.x}, ${riderCoords.y})`} className="transition-all duration-150">
                  <circle r="11" fill="white" shadow-md="true" />
                  <text y="4" fontSize="11" textAnchor="middle" className="animate-bounce">🛵</text>
                </g>
              </svg>

              {/* Float Map Overlay Progress */}
              <div className="absolute top-2 left-2 bg-black/90 text-white px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                <span className="w-1.5 h-1.5 bg-[#06C167] rounded-full animate-ping" />
                <span>KURIR: {riderProgress}% TRANSIT</span>
              </div>
            </div>

            {/* Dynamic Status Progress Tracker based on riderProgress */}
            <div className="text-left bg-slate-50 border border-gray-100 p-4 rounded-2xl text-xs font-bold space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-400">Asal Toko</span>
                <span className="text-black font-extrabold">{lastOrderDetails.coopName}</span>
              </div>

              {/* Step indicator */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[#06C167] text-[10px]">✓</span>
                  <span className="text-gray-500 leading-none">Pesanan diterima pengurus koperasi</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={riderProgress >= 30 ? "text-[#06C167] text-[10px]" : "text-gray-300 text-[10px]"}>
                    {riderProgress >= 30 ? "✓" : "○"}
                  </span>
                  <span className={`${riderProgress >= 30 ? "text-gray-700" : "text-gray-450"} leading-none`}>
                    Belanjaan selesai disiapkan dan dikemas
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={riderProgress > 30 && riderProgress < 100 ? "text-[#06C167] text-[10px] animate-ping" : riderProgress >= 100 ? "text-[#06C167] text-[10px]" : "text-gray-300 text-[10px]"}>
                    {riderProgress > 30 && riderProgress < 100 ? "●" : riderProgress >= 100 ? "✓" : "○"}
                  </span>
                  <span className={`${riderProgress > 30 ? "text-black" : "text-gray-450"} leading-none`}>
                    {riderProgress >= 100
                      ? "Kurir (Pak Bambang) sudah sampai di rumah Anda!"
                      : "Kurir sedang berkendara menuju alamat Anda"}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-[#06C167] h-full transition-all duration-150"
                  style={{ width: `${riderProgress}%` }}
                />
              </div>

              {/* Bill Details */}
              <div className="flex justify-between border-t border-gray-150 pt-2.5 font-black text-black">
                <span>Total Bayar</span>
                <span className="text-[#06C167]">Rp {lastOrderDetails.total.toLocaleString("id-ID")}</span>
              </div>
            </div>

            {/* WA Notification simulation details */}
            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-left text-[10px] text-emerald-800 leading-normal flex items-start gap-2.5 font-medium">
              <span className="text-base leading-none">💬</span>
              <p>
                <strong>[Simulasi Notifikasi]</strong> Struk pembelian digital telah dikirim ke nomor WhatsApp pengurus Koperasi dan Kurir via Fonnte Gateway API.
              </p>
            </div>

            <button
              onClick={() => setCheckoutSuccess(false)}
              className="w-full bg-black hover:bg-neutral-800 text-white py-3.5 font-bold text-xs rounded-full transition-all cursor-pointer"
            >
              Tutup & Belanja Lagi
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 border-t border-gray-100 text-center text-[10px] text-gray-400 bg-white shrink-0 mt-8 font-medium">
        &copy; 2026 KopasNow. Semua hak cipta dilindungi undang-undang.
      </footer>
    </div>
  );
}
