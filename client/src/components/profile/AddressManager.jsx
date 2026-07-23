import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Trash2, Star, Pencil, X } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { EmptyState, SectionTitle } from './ProfileUI';

const EMPTY = {
  label: '', firstName: '', lastName: '', phone: '',
  addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'India',
};

const Field = ({ label, name, value, onChange, required, testid }) => (
  <div>
    <label className="block text-[11px] font-semibold uppercase tracking-luxe-sm text-muted-foreground mb-1">{label}{required && ' *'}</label>
    <input
      data-testid={testid}
      value={value}
      onChange={(e) => onChange(name, e.target.value)}
      className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-foreground outline-none"
    />
  </div>
);

export default function AddressManager() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // null = closed; {} = new; {id,...} = edit
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/users/addresses');
      setAddresses(res.data?.addresses || []);
    } catch (e) {
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const onField = (name, val) => setForm((f) => ({ ...f, [name]: val }));

  const openNew = () => setForm({ ...EMPTY });
  const openEdit = (a) => setForm({ ...a });
  const close = () => setForm(null);

  const save = async (e) => {
    e.preventDefault();
    const required = ['firstName', 'lastName', 'phone', 'addressLine1', 'city', 'state', 'postalCode', 'country'];
    for (const f of required) {
      if (!form[f] || String(form[f]).trim().length === 0) {
        toast.error('Please fill all required fields');
        return;
      }
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (form.id) {
        await api.patch(`/users/addresses/${form.id}`, payload);
        toast.success('Address updated');
      } else {
        await api.post('/users/addresses', payload);
        toast.success('Address added');
      }
      close();
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/users/addresses/${id}`);
      toast.success('Address removed');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to remove address');
    }
  };

  const setDefault = async (id) => {
    try {
      const res = await api.patch(`/users/addresses/${id}/default`);
      setAddresses(res.data?.addresses || []);
      toast.success('Default address updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update default');
    }
  };

  return (
    <div data-testid="address-manager">
      <div className="flex items-center justify-between mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
        <h2 className="font-display text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Saved Addresses</h2>
        {!form && (
          <button
            data-testid="add-address-btn"
            onClick={openNew}
            className="flex items-center gap-2 border border-foreground px-5 py-2.5 text-[11px] font-semibold uppercase tracking-luxe-sm transition-colors hover:bg-foreground hover:text-white"
          >
            <Plus size={14} /> Add Address
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {form && (
          <motion.form
            data-testid="address-form"
            onSubmit={save}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-white dark:bg-gray-800 border border-border rounded-2xl p-6 mb-8 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold">{form.id ? 'Edit Address' : 'New Address'}</h3>
              <button type="button" onClick={close} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Label (Home, Work)" name="label" value={form.label || ''} onChange={onField} testid="addr-label" />
              <Field label="Phone" name="phone" value={form.phone || ''} onChange={onField} required testid="addr-phone" />
              <Field label="First Name" name="firstName" value={form.firstName || ''} onChange={onField} required testid="addr-firstName" />
              <Field label="Last Name" name="lastName" value={form.lastName || ''} onChange={onField} required testid="addr-lastName" />
            </div>
            <Field label="Address Line 1" name="addressLine1" value={form.addressLine1 || ''} onChange={onField} required testid="addr-line1" />
            <Field label="Address Line 2" name="addressLine2" value={form.addressLine2 || ''} onChange={onField} testid="addr-line2" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="City" name="city" value={form.city || ''} onChange={onField} required testid="addr-city" />
              <Field label="State" name="state" value={form.state || ''} onChange={onField} required testid="addr-state" />
              <Field label="Postal Code" name="postalCode" value={form.postalCode || ''} onChange={onField} required testid="addr-postal" />
              <Field label="Country" name="country" value={form.country || ''} onChange={onField} required testid="addr-country" />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={!!form.isDefault} onChange={(e) => onField('isDefault', e.target.checked)} data-testid="addr-default-checkbox" />
              Set as default address
            </label>
            <button
              data-testid="save-address-btn"
              type="submit" disabled={saving}
              className="w-full py-3 bg-foreground text-white rounded-xl font-semibold uppercase tracking-luxe-sm text-[12px] hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? 'Saving...' : form.id ? 'Update Address' : 'Save Address'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading addresses...</div>
      ) : addresses.length === 0 && !form ? (
        <EmptyState icon={MapPin} title="No saved addresses" description="Add a shipping address for faster checkout." action="Add Address" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {addresses.map((a) => (
            <motion.div
              key={a.id}
              data-testid={`address-card-${a.id}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className={`relative border rounded-2xl p-5 bg-white dark:bg-gray-800 ${a.isDefault ? 'border-foreground' : 'border-border'}`}
            >
              {a.isDefault && (
                <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-luxe-sm bg-foreground text-white px-2.5 py-1 rounded-full">
                  <Star size={10} /> Default
                </span>
              )}
              {a.label && <p className="text-[11px] font-semibold uppercase tracking-luxe-sm text-muted-foreground mb-1">{a.label}</p>}
              <p className="font-semibold text-gray-900 dark:text-white">{a.firstName} {a.lastName}</p>
              <p className="text-sm text-muted-foreground mt-1">{a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ''}</p>
              <p className="text-sm text-muted-foreground">{a.city}, {a.state} {a.postalCode}</p>
              <p className="text-sm text-muted-foreground">{a.country}</p>
              <p className="text-sm text-muted-foreground mt-1">📞 {a.phone}</p>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                {!a.isDefault && (
                  <button data-testid={`set-default-${a.id}`} onClick={() => setDefault(a.id)} className="text-xs font-semibold text-foreground hover:underline flex items-center gap-1">
                    <Star size={13} /> Set Default
                  </button>
                )}
                <button data-testid={`edit-address-${a.id}`} onClick={() => openEdit(a)} className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <Pencil size={13} /> Edit
                </button>
                <button data-testid={`delete-address-${a.id}`} onClick={() => remove(a.id)} className="text-xs font-semibold text-red-500 hover:text-red-600 flex items-center gap-1 ml-auto">
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
