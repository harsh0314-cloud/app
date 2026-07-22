import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { DollarSign, ShoppingBag, Users, ChevronRight, Package, Mail, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const navigate = useNavigate(); // ADDED THIS LINE
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0, users: 0 });
  const [activeTab, setActiveTab] = useState(null); // 'revenue', 'orders', 'customers'
  const [data, setData] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Fetch Summary Stats
  useEffect(() => {
    api.get('/admin/stats')
      .then((res) => setStats({
        totalOrders: res.data?.stats?.totalOrders || 0,
        totalRevenue: res.data?.stats?.totalRevenue || 0,
        users: res.data?.stats?.totalUsers || 0
      }))
      .catch((err) => console.error("Stats error:", err.message));
  }, []);

  // Fetch Detailed Data on Card Click
  const handleTabClick = async (tab) => {
    if (activeTab === tab) {
      setActiveTab(null); // Toggle off if clicked again
      return;
    }
    
    setActiveTab(tab);
    setLoadingData(true);
    
    try {
      let endpoint = '/admin/orders'; // Revenue and Orders use the same data source
      if (tab === 'customers') endpoint = '/admin/customers';
      
      const res = await api.get(endpoint);
      setData(res.data.orders || res.data.customers || []);
    } catch (err) {
      console.error("Data fetch error:", err.message);
    } finally {
      setLoadingData(false);
    }
  };

  // Helper function to format currency to INR
  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;

  const statCards = [
    { title: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'bg-green-100 text-green-700', tabKey: 'revenue' },
    { title: 'Total Orders', value: stats.totalOrders, icon: ShoppingBag, color: 'bg-blue-100 text-blue-700', tabKey: 'orders' },
    { title: 'Customers', value: stats.users, icon: Users, color: 'bg-purple-100 text-purple-700', tabKey: 'customers' },
  ];

  // Helper to display correct payment method text
    const getPaymentMethodText = (order) => {
    if (order.paymentMethod === 'RAZORPAY') return 'Paid via Razorpay';
    if (order.paymentMethod === 'STRIPE') return 'Paid via Stripe';
    return 'Cash on Delivery';
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      
      {/* Interactive Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, i) => (
          <div 
            key={i} 
            onClick={() => handleTabClick(card.tabKey)}
            className={`bg-white dark:bg-gray-800 rounded-xl border-2 p-6 flex items-center justify-between cursor-pointer transition-all duration-200 hover:shadow-lg ${
              activeTab === card.tabKey ? 'border-blue-500 shadow-lg' : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${card.color}`}>
                <card.icon size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              </div>
            </div>
            <ChevronRight size={20} className={`text-gray-400 transition-transform ${activeTab === card.tabKey ? 'rotate-90 text-blue-500' : ''}`} />
          </div>
        ))}
      </div>

      {/* Dynamic Content Area */}
      <AnimatePresence mode="wait">
        {activeTab && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">{activeTab === 'revenue' ? 'Revenue Breakdown' : `${activeTab} Details`}</h2>
              <span className="text-sm text-gray-500">{data.length} records found</span>
            </div>

            {/* Content Body */}
            <div className="p-6">
              {loadingData ? (
                <div className="flex justify-center py-12 text-gray-500">Loading data...</div>
              ) : (
                <>
                  {/* --- REVENUE TAB --- */}
                  {activeTab === 'revenue' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
                          <tr>
                            <th className="pb-3 pr-4">Order ID</th>
                            <th className="pb-3 pr-4">Customer</th>
                            <th className="pb-3 pr-4">Date</th>
                            <th className="pb-3 pr-4">Status</th>
                            <th className="pb-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {data.map(order => (
                            <tr key={order.id} className="text-sm text-gray-700 dark:text-gray-300">
                              {/* ADDED ONCLICK AND CURSOR-POINTER HERE */}
                              <td 
                                onClick={() => navigate(`/orders/${order.id}`)} 
                                className="py-4 pr-4 font-medium text-blue-600 cursor-pointer hover:underline"
                              >
                                {order.orderNumber}
                              </td>
                              <td className="py-4 pr-4">{order.user?.firstName} {order.user?.lastName}</td>
                              <td className="py-4 pr-4 text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                              <td className="py-4 pr-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${order.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="py-4 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(order.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                                  {/* --- ORDERS TAB --- */}
                  {activeTab === 'orders' && (
                    <div className="space-y-6">
                      {data.map(order => (
                        <div key={order.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              {/* ADDED ONCLICK AND CURSOR-POINTER HERE */}
                              <p 
                                onClick={() => navigate(`/orders/${order.id}`)} 
                                className="font-bold text-gray-900 dark:text-white cursor-pointer hover:underline"
                              >
                                {order.orderNumber}
                              </p>
                              <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${order.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {order.status}
                            </span>
                          </div>
                          
                          {/* Customer & Delivery Details */}
                          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-600 dark:text-gray-400">
                              <div>
                                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-500 mb-1">Customer Details</p>
                                <p className="font-medium text-gray-900 dark:text-white">{order.address?.firstName} {order.address?.lastName}</p>
                                <p>{order.address?.phone}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-500 mb-1">Delivery Address</p>
                                <p>{order.address?.addressLine1}</p>
                                <p>{order.address?.city}, {order.address?.state} - {order.address?.postalCode}</p>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <span className={`text-xs font-bold uppercase ${order.payment?.status === 'COMPLETED' ? 'text-green-600' : 'text-blue-600'}`}>
                               💳 {getPaymentMethodText(order)}
                              </span>
                            </div>
                          </div>

                          {/* Ordered Items */}
                          <div className="space-y-3">
                            {order.items.map(item => (
                              <div key={item.id} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                                <img src={item.image || 'https://via.placeholder.com/80'} alt={item.name} className="w-12 h-12 rounded-md object-cover" />
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</p>
                                  <p className="text-xs text-gray-500">Qty: {item.quantity} • {formatCurrency(item.price)} each</p>
                                </div>
                                <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(item.subtotal)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* --- CUSTOMERS TAB --- */}
                  {activeTab === 'customers' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.map(customer => (
                        <div key={customer.id} className="flex items-center gap-4 border border-gray-200 dark:border-gray-700 p-4 rounded-lg hover:shadow-md transition-shadow">
                          <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-lg">
                            {customer.firstName[0]}{customer.lastName[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white truncate">{customer.firstName} {customer.lastName}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <Mail size={12} /> <span className="truncate">{customer.email}</span>
                            </div>
                            {customer.phone && (
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <Phone size={12} /> <span>{customer.phone}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`inline-block w-3 h-3 rounded-full ${customer.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <p className="text-[10px] text-gray-500 mt-1 capitalize">{customer.isActive ? 'Active' : 'Inactive'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Default fallback when nothing is clicked */}
      {!activeTab && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <Package size={20} />
            <p>Click on a metric card above to view detailed breakdowns.</p>
          </div>
        </div>
      )}
    </div>
  );
}