"use client";

import React, { useState, useMemo } from "react";
import { useUserStore } from "@/store/useUserStore";
import { signOutAction } from "@/server/actions/auth";

// Interface Definitions
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  initialStock: number;
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
  rating: number;
  status: "Buka" | "Tutup";
  coords: { x: number; y: number };
  color: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

// Dummy Cooperatives Data
const INITIAL_COOPERATIVES: Cooperative[] = [
  {
    id: "coop-1",
    name: "KUD Merah Putih Karanganyar",
    distance: 0.8,
    address: "Jl. Raya Karanganyar No. 45, Karanganyar",
    phone: "081234567890",
    rating: 4.8,
    status: "Buka",
    coords: { x: 140, y: 110 },
    color: "#CE1126",
  },
  {
    id: "coop-2",
    name: "Koperasi Tani Rejo Makmur",
    distance: 2.3,
    address: "Dusun Sukorejo, RT 02/RW 04, Karanganyar",
    phone: "089876543210",
    rating: 4.6,
    status: "Buka",
    coords: { x: 260, y: 220 },
    color: "#EAB308",
  },
];

// Dummy Products Data
const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Beras Cianjur Pandan Wangi",
    price: 14500,
    stock: 15,
    initialStock: 15,
    category: "Sembako",
    unit: "kg",
    icon: "🌾",
    coopId: "coop-1",
    coopName: "KUD Merah Putih Karanganyar",
  },
  {
    id: "prod-2",
    name: "Minyak Goreng Kita",
    price: 16000,
    stock: 48,
    initialStock: 48,
    category: "Sembako",
    unit: "Liter",
    icon: "🧪",
    coopId: "coop-1",
    coopName: "KUD Merah Putih Karanganyar",
  },
  {
    id: "prod-3",
    name: "Pupuk Urea Bersubsidi",
    price: 112500,
    stock: 120,
    initialStock: 120,
    category: "Pertanian",
    unit: "sak",
    icon: "🌱",
    coopId: "coop-1",
    coopName: "KUD Merah Putih Karanganyar",
  },
  {
    id: "prod-4",
    name: "Kopi Robusta Lereng Lawu",
    price: 25000,
    stock: 9,
    initialStock: 9,
    category: "Kopi & Teh",
    unit: "200g",
    icon: "☕",
    coopId: "coop-1",
    coopName: "KUD Merah Putih Karanganyar",
  },
  {
    id: "prod-5",
    name: "Gula Pasir Kristal Putih",
    price: 15500,
    stock: 60,
    initialStock: 60,
    category: "Sembako",
    unit: "kg",
    icon: "🍬",
    coopId: "coop-2",
    coopName: "Koperasi Tani Rejo Makmur",
  },
  {
    id: "prod-6",
    name: "Pakan Ternak Konsentrat",
    price: 8000,
    stock: 300,
    initialStock: 300,
    category: "Pertanian",
    unit: "kg",
    icon: "🌾",
    coopId: "coop-2",
    coopName: "Koperasi Tani Rejo Makmur",
  },
  {
    id: "prod-7",
    name: "Kerajinan Anyaman Bambu",
    price: 35000,
    stock: 5,
    initialStock: 5,
    category: "Kerajinan",
    unit: "pcs",
    icon: "🧺",
    coopId: "coop-2",
    coopName: "Koperasi Tani Rejo Makmur",
  },
  {
    id: "prod-8",
    name: "Teh Melati Wangi Desa",
    price: 6000,
    stock: 75,
    initialStock: 75,
    category: "Kopi & Teh",
    unit: "pak",
    icon: "🍵",
    coopId: "coop-2",
    coopName: "Koperasi Tani Rejo Makmur",
  },
];

export default function Home() {
  const user = useUserStore((state) => state.user);
  const customer = useUserStore((state) => state.customer);
  const isLoading = useUserStore((state) => state.isLoading);

  // States
  const [gpsActive, setGpsActive] = useState(true);
  const [selectedCoopId, setSelectedCoopId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">("pickup");
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState<{
    coopName: string;
    total: number;
    items: { name: string; qty: number }[];
  } | null>(null);

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

  // Categories list
  const categories = ["Semua", "Sembako", "Pertanian", "Kopi & Teh", "Kerajinan"];

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

  const deliveryFee = deliveryMethod === "delivery" ? 5000 : 0;
  const cartTotalAmount = cartSubtotal + deliveryFee;

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
      coopName: cart[0].product.coopName,
      total: cartTotalAmount,
      items: cart.map((item) => ({ name: item.product.name, qty: item.quantity })),
    });

    setCart([]);
    setIsCartOpen(false);
    setCheckoutSuccess(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#CE1126]"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Middleware will handle redirecting to /auth
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-red-500 selection:text-white flex flex-col relative overflow-x-hidden">
      {/* Top Banner (Merah Putih Decor) */}
      <div className="w-full h-1.5 flex fixed top-0 left-0 z-50">
        <div className="flex-1 bg-[#CE1126]" />
        <div className="flex-1 bg-white border-b border-slate-100" />
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-1.5 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#CE1126] to-[#A50E1E] flex items-center justify-center text-white shadow-md shadow-red-500/10">
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
                  d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                />
              </svg>
            </div>
            <span className="font-extrabold text-base text-slate-800 tracking-tight">
              Kopas<span className="text-[#CE1126]">Now</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-slate-600 hover:text-[#CE1126] hover:bg-red-50 rounded-xl transition-all duration-200 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5.5 h-5.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                />
              </svg>
              {cartTotalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#CE1126] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {cartTotalItems}
                </span>
              )}
            </button>

            {/* Profile Toggle Card */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-sm font-bold text-[#CE1126] hover:bg-[#CE1126] hover:text-white transition-all cursor-pointer shadow-sm"
            >
              {nama.charAt(0).toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Geolocations, Map, and Coops List */}
        <section className="lg:col-span-1 space-y-6 flex flex-col">
          {/* Geolocation Status Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Pencarian Hyperlocal
              </h2>
              <button
                onClick={() => setGpsActive(!gpsActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  gpsActive ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    gpsActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {gpsActive ? (
              <div className="flex items-start gap-3 bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5 animate-fade-in">
                <span className="relative flex h-3.5 w-3.5 mt-0.5">
                  <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </span>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-emerald-800">GPS Aktif & Akurat</p>
                  <p className="text-[11px] text-emerald-600 leading-normal">
                    Menampilkan koperasi & stok dalam radius 5 km (Karanganyar)
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
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-amber-800">GPS Dinonaktifkan</p>
                  <p className="text-[11px] text-amber-600 leading-normal">
                    Nyalakan GPS untuk menemukan produk segar dari koperasi terdekat Anda.
                  </p>
                  <button
                    onClick={() => setGpsActive(true)}
                    className="text-[11px] font-bold text-amber-800 underline hover:text-amber-950 block mt-1 cursor-pointer"
                  >
                    Aktifkan GPS Sekarang
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SVG Hyperlocal Map Mockup */}
          {gpsActive && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col animate-fade-in">
              <div className="px-5 py-3.5 border-b border-slate-55 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Peta Hyperlocal (PWA)</span>
                <span className="text-[10px] text-slate-400 font-mono">Radius 5 km</span>
              </div>
              <div className="bg-slate-100 h-52 relative overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Background Roads / Grid lines */}
                  <path d="M 0,150 Q 150,150 200,80 T 400,200" stroke="#CBD5E1" strokeWidth="8" fill="none" />
                  <path d="M 200,0 Q 180,120 180,180 T 300,300" stroke="#CBD5E1" strokeWidth="6" fill="none" />
                  <path d="M 0,260 C 150,220 200,280 400,240" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 4" fill="none" />

                  {/* Rivers */}
                  <path d="M 0,50 Q 100,80 150,40 T 400,100" stroke="#93C5FD" strokeWidth="4" fill="none" />

                  {/* Village Greenery areas */}
                  <rect x="20" y="20" width="80" height="60" rx="10" fill="#22C55E" fillOpacity="0.08" />
                  <rect x="250" y="30" width="100" height="80" rx="10" fill="#22C55E" fillOpacity="0.08" />
                  <rect x="50" y="190" width="90" height="80" rx="10" fill="#22C55E" fillOpacity="0.08" />

                  {/* Center Dot (User Location) */}
                  <g transform="translate(180, 160)">
                    <circle r="16" fill="#3B82F6" fillOpacity="0.15" className="animate-pulse-ring" />
                    <circle r="6" fill="#FFFFFF" />
                    <circle r="4.5" fill="#3B82F6" className="animate-pulse-dot" />
                  </g>

                  {/* Coop Pin 1 */}
                  <g transform="translate(140, 110)" className="cursor-pointer" onClick={() => setSelectedCoopId("coop-1")}>
                    <circle r="14" fill="#CE1126" fillOpacity="0.15" className={selectedCoopId === "coop-1" ? "animate-pulse-ring" : ""} />
                    <path d="M0 -12 C-5 -12 -9 -8 -9 0 C-9 6 0 14 0 14 C0 14 9 6 9 0 C9 -8 5 -12 0 -12 Z" fill="#CE1126" />
                    <circle cy="-1.5" r="3.5" fill="#FFFFFF" />
                  </g>

                  {/* Coop Pin 2 */}
                  <g transform="translate(260, 220)" className="cursor-pointer" onClick={() => setSelectedCoopId("coop-2")}>
                    <circle r="14" fill="#EAB308" fillOpacity="0.15" className={selectedCoopId === "coop-2" ? "animate-pulse-ring" : ""} />
                    <path d="M0 -12 C-5 -12 -9 -8 -9 0 C-9 6 0 14 0 14 C0 14 9 6 9 0 C9 -8 5 -12 0 -12 Z" fill="#EAB308" />
                    <circle cy="-1.5" r="3.5" fill="#FFFFFF" />
                  </g>
                </svg>

                {/* Map Floating Labels */}
                <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-md text-[9px] font-bold text-slate-500 shadow-xs border border-slate-100">
                  Desa Karanganyar
                </div>
                <div className="absolute bottom-2.5 right-2.5 bg-slate-900/90 text-white px-2 py-0.5 rounded-md text-[9px] font-medium flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full" />
                  Lokasi Anda
                </div>
              </div>
            </div>
          )}

          {/* Cooperatives List */}
          {gpsActive && (
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex-1 flex flex-col space-y-4 animate-fade-in">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Koperasi Terdekat
              </h3>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {/* All Coops Filter Toggle */}
                <button
                  onClick={() => setSelectedCoopId("all")}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                    selectedCoopId === "all"
                      ? "bg-red-50/50 border-red-200 shadow-xs text-slate-800"
                      : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-red-100 text-[#CE1126] flex items-center justify-center text-xs font-bold">
                      ALL
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Semua Koperasi</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Lihat seluruh stok produk desa</p>
                    </div>
                  </div>
                  {selectedCoopId === "all" && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#CE1126] shadow-xs shadow-red-500/30" />
                  )}
                </button>

                {INITIAL_COOPERATIVES.map((coop) => (
                  <button
                    key={coop.id}
                    onClick={() => setSelectedCoopId(coop.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col gap-2.5 cursor-pointer ${
                      selectedCoopId === coop.id
                        ? "bg-white border-red-500 shadow-md shadow-red-500/5 ring-1 ring-red-500/20"
                        : "bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full shadow-inner shrink-0"
                          style={{ backgroundColor: coop.color }}
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-800 leading-tight">{coop.name}</p>
                          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                            <span>📍 {coop.distance} km</span>
                            <span>•</span>
                            <span className="text-amber-500">★ {coop.rating}</span>
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {coop.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1 leading-normal border-t border-slate-50 pt-2 font-light">
                      {coop.address}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Search, Catalog, and Product Feed */}
        <section className="lg:col-span-2 space-y-6">
          
          {/* Search, Filter, and Categories Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            
            {/* Header / Title */}
            <div>
              <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Katalog Produk Desa</h2>
              <p className="text-xs text-slate-400 leading-normal mt-0.5">
                Stok real-time terintegrasi langsung dari KDMP.ID & Simkopdes
              </p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4.5 h-4.5"
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
                placeholder="Cari beras, pupuk, minyak atau lainnya..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#CE1126] focus:ring-2 focus:ring-red-100 rounded-xl text-slate-800 text-sm placeholder-slate-400 outline-none transition-all"
              />
            </div>

            {/* Horizontal Categories Filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-slate-800 text-white shadow-sm"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Catalog Grid */}
          {!gpsActive ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-100 text-center shadow-sm">
              <span className="text-4xl">📍</span>
              <h3 className="text-lg font-bold text-slate-800 mt-4">Aktifkan GPS Anda</h3>
              <p className="text-slate-400 mt-1 max-w-sm mx-auto text-sm leading-relaxed">
                Katalog produk hyperlocal didasarkan pada radius lokasi Anda. Aktifkan GPS untuk menampilkan produk.
              </p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-100 text-center shadow-sm">
              <span className="text-4xl">🔍</span>
              <h3 className="text-lg font-bold text-slate-800 mt-4">Produk Tidak Ditemukan</h3>
              <p className="text-slate-400 mt-1 max-w-sm mx-auto text-sm leading-relaxed">
                Tidak ada produk di sekitar Anda yang cocok dengan kriteria pencarian atau kategori Anda saat ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock <= 0;
                const isLowStock = product.stock > 0 && product.stock <= 10;
                
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                  >
                    {/* Top Content */}
                    <div className="p-4.5 space-y-3.5">
                      <div className="flex items-start justify-between">
                        <span className="text-3xl p-2 bg-slate-50 rounded-xl block shadow-inner">{product.icon}</span>
                        
                        {/* Live Stock Badge */}
                        {isOutOfStock ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                            Habis
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 animate-pulse">
                            Stok Terbatas ({product.stock})
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Stok Melimpah ({product.stock})
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                          {product.category}
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-800 tracking-tight leading-tight line-clamp-1">
                          {product.name}
                        </h4>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          🏠 <span className="font-semibold">{product.coopName}</span>
                        </span>
                      </div>
                    </div>

                    {/* Bottom Content / Pricing & Buy */}
                    <div className="px-4.5 py-3.5 bg-slate-50/70 border-t border-slate-50 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-medium">Harga</span>
                        <span className="text-sm font-bold text-slate-800">
                          Rp {product.price.toLocaleString("id-ID")}
                          <span className="text-[10px] text-slate-400 font-normal">/{product.unit}</span>
                        </span>
                      </div>

                      <button
                        onClick={() => addToCart(product)}
                        disabled={isOutOfStock}
                        className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                          isOutOfStock
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-[#CE1126] text-white hover:bg-[#A50E1E] hover:shadow-sm active:scale-95"
                        }`}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-3.5 h-3.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Beli
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Cart Sliding Panel Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-end animate-fade-in">
          {/* Overlay click closes cart */}
          <div className="absolute inset-0" onClick={() => setIsCartOpen(false)} />
          
          {/* Sliding Panel */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-slide-in">
            {/* Panel Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5.5 h-5.5 text-[#CE1126]"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                  />
                </svg>
                <h3 className="text-base font-bold text-slate-800">Keranjang Belanja</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Cart Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-slate-400 space-y-3">
                  <span className="text-5xl block">🛒</span>
                  <p className="text-sm font-semibold">Keranjang belanja Anda masih kosong</p>
                  <p className="text-xs font-light">Pilih produk di katalog untuk mulai membeli.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-2xl p-2 bg-white rounded-lg block shadow-sm shrink-0">{item.product.icon}</span>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-xs font-extrabold text-slate-800 truncate leading-tight">{item.product.name}</p>
                      <p className="text-[10px] text-slate-400 truncate leading-tight">Asal: {item.product.coopName}</p>
                      <p className="text-xs font-bold text-slate-700">Rp {item.product.price.toLocaleString("id-ID")}</p>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center bg-white rounded-lg border border-slate-100 shadow-xs">
                      <button
                        onClick={() => updateCartQty(item.product.id, -1)}
                        className="px-2 py-1 text-slate-500 hover:bg-slate-50 rounded-l-lg font-bold text-xs cursor-pointer"
                      >
                        -
                      </button>
                      <span className="px-2 text-xs font-bold text-slate-800">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQty(item.product.id, 1)}
                        className="px-2 py-1 text-slate-500 hover:bg-slate-50 rounded-r-lg font-bold text-xs cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="px-6 py-5 border-t border-slate-100 space-y-4 bg-slate-50/50">
                {/* Delivery Option Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Metode Penyaluran</label>
                  <div className="flex bg-slate-100/80 p-1 rounded-xl">
                    <button
                      onClick={() => setDeliveryMethod("pickup")}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        deliveryMethod === "pickup" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Ambil Sendiri
                    </button>
                    <button
                      onClick={() => setDeliveryMethod("delivery")}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                        deliveryMethod === "delivery" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Kirim ke Rumah (+Rp 5rb)
                    </button>
                  </div>
                </div>

                {/* Subtotal, delivery, and total bills */}
                <div className="space-y-1.5 text-xs font-medium text-slate-600 border-t border-slate-100/80 pt-3">
                  <div className="flex justify-between">
                    <span>Subtotal Produk</span>
                    <span>Rp {cartSubtotal.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{deliveryMethod === "delivery" ? "Delivery oleh Pengurus" : "Biaya Pick-up"}</span>
                    <span>Rp {deliveryFee.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-slate-800 font-extrabold border-t border-slate-100 pt-2 text-sm">
                    <span>Total Pembayaran</span>
                    <span className="text-[#CE1126]">Rp {cartTotalAmount.toLocaleString("id-ID")}</span>
                  </div>
                </div>

                {/* Checkout Trigger */}
                <button
                  onClick={handleCheckout}
                  className="w-full bg-[#CE1126] text-white py-3 px-4 font-bold text-xs rounded-xl hover:bg-[#A50E1E] transition-colors active:scale-98 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Proses Checkout (Simulasi)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Member Profile Modal Card */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Overlay click closes profile */}
          <div className="absolute inset-0" onClick={() => setIsProfileOpen(false)} />

          {/* Profile Card */}
          <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 animate-fade-in z-10 flex flex-col">
            {/* Merah Putih Flag Stripe */}
            <div className="w-full h-1 flex shrink-0">
              <div className="flex-1 bg-[#CE1126]" />
              <div className="flex-1 bg-white border-b border-slate-100" />
            </div>

            {/* Visual Digital Member Card */}
            <div className="p-6 pb-2">
              <div className="bg-gradient-to-br from-red-600 to-[#A50E1E] text-white p-5 rounded-2xl shadow-lg relative overflow-hidden space-y-6">
                {/* Diagonal strip background decor */}
                <div className="absolute -right-12 -top-12 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-red-400/20 rounded-full blur-2xl pointer-events-none" />
                
                {/* Card Header */}
                <div className="flex items-center justify-between border-b border-white/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🛡️</span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-200 leading-none">KOPASNOW</p>
                      <p className="text-[7px] text-white/80 leading-none font-semibold mt-0.5">Koperasi Merah Putih</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-extrabold bg-emerald-500 text-white shadow-sm uppercase">
                    Aktif
                  </span>
                </div>

                {/* Card Body / User Data */}
                <div className="space-y-3.5">
                  <div>
                    <span className="text-[8px] text-red-200 uppercase tracking-widest block font-bold">Nama Lengkap</span>
                    <span className="text-sm font-extrabold tracking-wide block">{nama}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[8px] text-red-200 uppercase tracking-widest block font-bold">No. Anggota</span>
                      <span className="text-[11px] font-mono font-bold block">{user.id.slice(0, 10).toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-red-200 uppercase tracking-widest block font-bold">Bergabung</span>
                      <span className="text-[11px] font-bold block truncate">{joinedDate}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer / Barcode mockup */}
                <div className="border-t border-white/20 pt-3 flex items-center justify-between">
                  <div>
                    <span className="text-[8px] text-red-200 uppercase tracking-widest block font-bold">E-Mail / Telp</span>
                    <span className="text-[10px] text-white/95 font-medium block truncate max-w-[150px]">{email || phone}</span>
                  </div>
                  
                  {/* Digital QR Code Mock */}
                  <div className="w-10 h-10 bg-white rounded-lg p-1.5 flex items-center justify-center shadow-inner">
                    <svg className="w-full h-full text-slate-800" viewBox="0 0 100 100" fill="currentColor">
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

            {/* Profile Info Details List */}
            <div className="p-6 pt-4 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs text-slate-500 space-y-2 font-medium">
                <div className="flex justify-between">
                  <span>Email Asli</span>
                  <span className="text-slate-700 font-semibold">{email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nomor HP</span>
                  <span className="text-slate-700 font-semibold">{phone}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-4 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  Tutup
                </button>
                <form action={signOutAction} className="flex-1">
                  <button
                    type="submit"
                    className="w-full bg-[#CE1126] hover:bg-[#A50E1E] text-white py-2.5 px-4 font-bold text-xs rounded-xl transition-all cursor-pointer text-center shadow-xs"
                  >
                    Keluar Akun
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Success Alert Overlay Modal */}
      {checkoutSuccess && lastOrderDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl border border-slate-100 animate-fade-in space-y-5">
            {/* Green animated checkmark badge */}
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-100 animate-pulse-dot shadow-inner">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={3}
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">Checkout Berhasil!</h3>
              <p className="text-xs text-emerald-600 font-semibold">
                Simulasi Terkirim ke Pengurus via WhatsApp
              </p>
            </div>

            {/* Order details display */}
            <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100 text-xs space-y-2.5">
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-400 font-medium">Asal Koperasi</span>
                <span className="font-bold text-slate-700 truncate max-w-[180px]">{lastOrderDetails.coopName}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Ringkasan Barang</span>
                <div className="max-h-24 overflow-y-auto space-y-1 font-medium text-slate-600">
                  {lastOrderDetails.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>• {item.name}</span>
                      <span className="font-bold text-slate-700">x{item.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between border-t border-slate-200/60 pt-2 font-bold text-slate-800">
                <span>Total Bayar</span>
                <span className="text-[#CE1126]">Rp {lastOrderDetails.total.toLocaleString("id-ID")}</span>
              </div>
            </div>

            {/* WA Notification message mockup details */}
            <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-left text-[10px] text-emerald-700 leading-normal flex items-start gap-2.5">
              <span className="text-lg leading-none shrink-0 mt-0.5">💬</span>
              <p className="font-medium">
                <strong>[Simulasi WA]</strong> Pesan notifikasi pemesanan otomatis berhasil di-push ke nomor pengurus koperasi (Fonnte Gateway). Pengurus akan segera memverifikasi dan menyiapkan pesanan Anda.
              </p>
            </div>

            <button
              onClick={() => setCheckoutSuccess(false)}
              className="w-full bg-[#CE1126] text-white py-3 px-4 font-bold text-xs rounded-xl hover:bg-[#A50E1E] transition-colors shadow-sm cursor-pointer"
            >
              Kembali Belanja
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-5 border-t border-slate-100 text-center text-[10px] text-slate-400 bg-white shrink-0 mt-6">
        &copy; 2026 KopasNow. Hak Cipta Dilindungi Undang-Undang.
      </footer>
    </div>
  );
}
