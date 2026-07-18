import React, { useState } from 'react';
import { useApp } from './AppContext';
import { Product } from '../types';
import { Plus, Search, Edit3, Trash2, Package, X, Tag, AlertTriangle } from 'lucide-react';

export const InventoryView: React.FC = () => {
  const { db, saveProduct, deleteProduct, currentUser } = useApp();
  const isUserAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin' || currentUser?.role === 'Manager';

  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low'>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Engine Parts');
  const [compatibility, setCompatibility] = useState('Honda');
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(5);
  const [supplierName, setSupplierName] = useState('');
  const [location, setLocation] = useState('');

  if (!db) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-5 h-5 rounded-full border-2 border-t-red-600 border-slate-200 animate-spin" />
      <span className="text-sm text-slate-400 font-medium">Loading catalog…</span>
    </div>
  );

  const { products } = db;

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName(''); setPartNumber('');
    setBarcode(String(Date.now()).substring(3, 13));
    setCategory('Engine Parts'); setCompatibility('Honda');
    setPurchasePrice(0); setSellingPrice(0);
    setStock(0); setMinStock(5);
    setSupplierName('Honda Atlas Parts Ltd'); setLocation('Rack A, Shelf 1');
    setIsOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name); setPartNumber(p.partNumber); setBarcode(p.barcode);
    setCategory(p.category); setCompatibility(p.compatibility);
    setPurchasePrice(p.purchasePrice); setSellingPrice(p.sellingPrice);
    setStock(p.stock); setMinStock(p.minStock);
    setSupplierName(p.supplierName); setLocation(p.location);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !partNumber || !barcode) {
      alert('Product Name, Part Number and Barcode are required.');
      return;
    }
    const prod: Product = {
      id: editingProduct ? editingProduct.id : '',
      name, partNumber, barcode, category, compatibility,
      purchasePrice: Number(purchasePrice), sellingPrice: Number(sellingPrice),
      stock: Number(stock), minStock: Number(minStock), supplierName, location,
    };
    const ok = await saveProduct(prod);
    if (ok) { setIsOpen(false); setEditingProduct(null); }
    else alert('Error saving product.');
  };

  const handleDelete = async (id: string) => {
    if (!isUserAdmin) { alert('Only administrators can delete products.'); return; }
    const ok = await deleteProduct(id);
    if (ok) setConfirmDeleteId(null);
    else alert('Failed to delete.');
  };

  const filtered = products.filter(p => {
    const q = searchTerm.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) || p.partNumber.toLowerCase().includes(q) || p.barcode.includes(q);
    const matchStock = stockFilter === 'all' || p.stock <= p.minStock;
    return matchSearch && matchStock;
  });

  const inputCls = 'w-full px-3 py-2 text-xs border border-slate-200 bg-slate-50 rounded-lg outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 focus:bg-white transition-all';
  const labelCls = 'block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase tracking-wider';

  return (
    <div className="space-y-5">

      {/* ── PAGE HEADER ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Products</h1>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-lg text-sm font-bold shadow-sm shadow-red-600/20 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* ── SEARCH + FILTERS ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, part number or barcode..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200 text-xs font-semibold gap-0.5">
          <button
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${stockFilter === 'all' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setStockFilter('all')}
          >All</button>
          <button
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${stockFilter === 'low' ? 'bg-amber-50 text-amber-700 shadow-sm border border-amber-100' : 'text-slate-500 hover:text-amber-600'}`}
            onClick={() => setStockFilter('low')}
          >
            <AlertTriangle className="w-3 h-3" /> Low Stock
          </button>
        </div>
        <span className="text-xs text-slate-400 font-medium">{filtered.length} products</span>
      </div>

      {/* ── PRODUCTS TABLE ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1.4fr_1.2fr_0.8fr_0.9fr_0.7fr_0.8fr_0.7fr] gap-0 border-b border-slate-100 bg-slate-50 px-5 py-3">
          {['PRODUCT', 'PART NO / BARCODE', 'CATEGORY / BRAND', 'COST', 'SALE PRICE', 'STOCK', 'STATUS', 'ACTIONS'].map(h => (
            <span key={h} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</span>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
            <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-sm font-medium">No products found</p>
            <p className="text-xs">Try adjusting your search or add a new product</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(p => {
              const isLow = p.stock <= p.minStock;
              const isOut = p.stock === 0;
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[2fr_1.4fr_1.2fr_0.8fr_0.9fr_0.7fr_0.8fr_0.7fr] gap-0 items-center px-5 py-4 hover:bg-slate-50/70 transition-colors group"
                >
                  {/* Product name */}
                  <div className="pr-4">
                    <p className="font-bold text-slate-900 text-sm leading-tight">{p.name}</p>
                    {isLow && !isOut && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 mt-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" /> Low Stock
                      </span>
                    )}
                  </div>

                  {/* Part No / Barcode */}
                  <div>
                    <p className="text-xs font-bold text-slate-700 font-mono">{p.partNumber}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.barcode}</p>
                  </div>

                  {/* Category / Brand */}
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{p.category}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{p.compatibility || 'Honda'}</p>
                  </div>

                  {/* Cost */}
                  <div>
                    <span className="text-sm text-slate-600 font-medium">Rs. {p.purchasePrice.toLocaleString()}</span>
                  </div>

                  {/* Sale Price */}
                  <div>
                    <span className="text-sm font-bold text-red-600">Rs. {p.sellingPrice.toLocaleString()}</span>
                  </div>

                  {/* Stock qty */}
                  <div>
                    <span className={`text-base font-black tabular-nums ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-teal-600'}`}>
                      {p.stock}
                    </span>
                  </div>

                  {/* Status badge */}
                  <div>
                    {isOut ? (
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
                        Out of Stock
                      </span>
                    ) : isLow ? (
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                        In Stock
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                      title="Edit product"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {confirmDeleteId === p.id ? (
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                      >
                        Sure?
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (!isUserAdmin) { alert('Only administrators can delete products.'); return; }
                          setConfirmDeleteId(p.id);
                          setTimeout(() => setConfirmDeleteId(null), 4000);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                        title="Delete product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── ADD / EDIT MODAL ── */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-100 flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Tag className="w-4 h-4 text-red-600" />
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="overflow-y-auto flex-1">
              <div className="p-6 grid grid-cols-2 gap-4 text-xs">

                <div className="col-span-2">
                  <label className={labelCls}>Product Name</label>
                  <input type="text" required placeholder="e.g. Honda CD70 Brake Shoe Set"
                    className={inputCls} value={name} onChange={e => setName(e.target.value)} />
                </div>

                <div>
                  <label className={labelCls}>Honda Part Number (OEM)</label>
                  <input type="text" required placeholder="e.g. 43125-086-030"
                    className={`${inputCls} font-mono`} value={partNumber} onChange={e => setPartNumber(e.target.value)} />
                </div>

                <div>
                  <label className={labelCls}>Barcode (EAN)</label>
                  <input type="text" required placeholder="EAN-13 digits"
                    className={`${inputCls} font-mono`} value={barcode} onChange={e => setBarcode(e.target.value)} />
                </div>

                <div>
                  <label className={labelCls}>Category</label>
                  <select className={inputCls} value={category} onChange={e => setCategory(e.target.value)}>
                    {['Engine Parts','Lubricants','Electrical','Brakes','Transmission','Filters','Fuel System','Cables & Instruments','Body & Plastics'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Brand / Compatibility</label>
                  <input type="text" placeholder="e.g. Honda / CD-70, CG-125"
                    className={inputCls} value={compatibility} onChange={e => setCompatibility(e.target.value)} />
                </div>

                <div>
                  <label className={labelCls}>Cost Price (Rs.)</label>
                  <input type="number" required min={0}
                    className={`${inputCls} font-mono`} value={purchasePrice} onChange={e => setPurchasePrice(Math.max(0, Number(e.target.value)))} />
                </div>

                <div>
                  <label className={labelCls}>Sale Price (Rs.)</label>
                  <input type="number" required min={0}
                    className={`${inputCls} font-mono`} value={sellingPrice} onChange={e => setSellingPrice(Math.max(0, Number(e.target.value)))} />
                </div>

                <div>
                  <label className={labelCls}>Stock Quantity</label>
                  <input type="number" required min={0}
                    className={`${inputCls} font-mono`} value={stock} onChange={e => setStock(Math.max(0, Number(e.target.value)))} />
                </div>

                <div>
                  <label className={labelCls}>Min Stock Threshold</label>
                  <input type="number" required min={0}
                    className={`${inputCls} font-mono`} value={minStock} onChange={e => setMinStock(Math.max(0, Number(e.target.value)))} />
                </div>

                <div>
                  <label className={labelCls}>Supplier</label>
                  <input type="text" placeholder="e.g. Honda Atlas Parts Ltd"
                    className={inputCls} value={supplierName} onChange={e => setSupplierName(e.target.value)} />
                </div>

                <div>
                  <label className={labelCls}>Storage Location</label>
                  <input type="text" placeholder="e.g. Rack B, Shelf 2"
                    className={inputCls} value={location} onChange={e => setLocation(e.target.value)} />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer transition-all">
                  Cancel
                </button>
                <button type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-red-600/20 cursor-pointer transition-all">
                  {editingProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
