import React, { useState, useMemo } from 'react';
import { useApp } from './AppContext';
import { Customer } from '../types';
import { Plus, Pencil, Trash2, Search, X, Users, CreditCard, AlertCircle } from 'lucide-react';

// ─── Customer Modal ───────────────────────────────────────────────────────────
interface CustomerModalProps {
  initial?: Customer;
  onClose: () => void;
  onSave: (data: Partial<Customer>) => Promise<boolean>;
  title: string;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ initial, onClose, onSave, title }) => {
  const [name,     setName]     = useState(initial?.name ?? '');
  const [phone,    setPhone]    = useState(initial?.phone ?? '');
  const [address,  setAddress]  = useState(initial?.address ?? '');
  const [bikeModel,setBike]     = useState(initial?.bikeModel ?? '');
  const [credit,   setCredit]   = useState(initial?.creditBalance ?? 0);
  const [saving,   setSaving]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Customer name is required.');
    if (!phone.trim()) return alert('Phone number is required.');
    setSaving(true);
    const ok = await onSave({ name: name.trim(), phone: phone.trim(), address: address.trim(), bikeModel: bikeModel.trim(), creditBalance: credit });
    setSaving(false);
    if (ok) onClose();
    else alert('Failed to save customer. Please try again.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Muhammad Salman"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone <span className="text-red-500">*</span></label>
              <input
                type="text" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="03XX-XXXXXXX"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Bike Model</label>
              <input
                type="text" value={bikeModel} onChange={e => setBike(e.target.value)}
                placeholder="e.g. CD-70, CG-125"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Address</label>
              <input
                type="text" value={address} onChange={e => setAddress(e.target.value)}
                placeholder="e.g. Gulberg III, Lahore"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Credit Balance (Rs.)</label>
              <input
                type="number" min="0" value={credit || ''}
                onChange={e => setCredit(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-all cursor-pointer">
              {saving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main CustomersView ───────────────────────────────────────────────────────
export const CustomersView: React.FC = () => {
  const { db, saveCustomer, updateCustomer, deleteCustomer } = useApp();

  const [search,    setSearch]    = useState('');
  const [showAdd,   setShowAdd]   = useState(false);
  const [editCust,  setEditCust]  = useState<Customer | null>(null);

  if (!db) return <div className="p-8 text-slate-400 text-sm">Loading customers...</div>;

  const { customers, invoices } = db;

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const totalCustomers = customers.length;
  const withCredit = customers.filter(c => (c.creditBalance ?? 0) > 0).length;
  const totalCredit = customers.reduce((s, c) => s + (c.creditBalance ?? 0), 0);

  // ─── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() =>
    customers.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.bikeModel || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.address || '').toLowerCase().includes(search.toLowerCase())
    ),
    [customers, search]
  );

  // ─── Purchase count per customer ───────────────────────────────────────────
  const purchaseCount = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach(inv => { if (inv.customerId) map[inv.customerId] = (map[inv.customerId] || 0) + 1; });
    return map;
  }, [invoices]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleDelete = async (c: Customer) => {
    if (!confirm(`Delete customer "${c.name}"? This cannot be undone.`)) return;
    await deleteCustomer(c.id);
  };

  const handleSaveNew = async (data: Partial<Customer>): Promise<boolean> => {
    return saveCustomer({ id: '', name: '', phone: '', address: '', bikeModel: '', ...data });
  };

  const handleUpdate = async (data: Partial<Customer>): Promise<boolean> => {
    if (!editCust) return false;
    return updateCustomer(editCust.id, data);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-500">Manage customers and credit balances</p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold">Total Customers</p>
            <p className="text-2xl font-bold text-slate-800">{totalCustomers}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold">Customers with Credit</p>
            <p className="text-2xl font-bold text-slate-800">{withCredit}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-semibold">Total Credit Outstanding</p>
            <p className="text-xl font-bold text-red-600 font-mono">Rs. {totalCredit.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400/20 shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Phone</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Address</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bike</th>
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Credit Balance</th>
              <th className="px-5 py-3.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400 text-sm">
                  {search ? `No customers matching "${search}".` : 'No customers yet. Click "+ Add Customer" to get started.'}
                </td>
              </tr>
            )}
            {filtered.map(c => {
              const credit = c.creditBalance ?? 0;
              const orders = purchaseCount[c.id] || 0;
              return (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="font-bold text-sm text-slate-800">{c.name}</p>
                      {orders > 0 && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{orders} order{orders !== 1 ? 's' : ''}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs font-mono text-slate-600">{c.phone}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-600">{c.address || <span className="text-slate-300">—</span>}</td>
                  <td className="px-5 py-3.5">
                    {c.bikeModel
                      ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">{c.bikeModel}</span>
                      : <span className="text-slate-300 text-xs">—</span>
                    }
                  </td>
                  <td className="px-5 py-3.5">
                    {credit > 0
                      ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700 font-mono">Rs. {credit.toLocaleString()}</span>
                      : <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">No Balance</span>
                    }
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setEditCust(c)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all cursor-pointer"
                        title="Edit customer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all cursor-pointer"
                        title="Delete customer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showAdd && (
        <CustomerModal
          title="Add Customer"
          onClose={() => setShowAdd(false)}
          onSave={handleSaveNew}
        />
      )}
      {editCust && (
        <CustomerModal
          initial={editCust}
          title="Edit Customer"
          onClose={() => setEditCust(null)}
          onSave={handleUpdate}
        />
      )}
    </div>
  );
};
