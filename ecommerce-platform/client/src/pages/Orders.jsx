import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders/my-orders')
      .then((res) => setOrders(res.data.orders))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-muted-foreground">Loading orders...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-8">My Orders</h1>
      
      {orders.length === 0 ? (
        <div className="text-center py-20 bg-muted/50 rounded-2xl border border-border">
          <h2 className="text-xl font-semibold text-foreground mb-2">No orders yet</h2>
          <p className="text-muted-foreground mb-4">When you place an order, it will appear here.</p>
          <Link to="/products" className="text-primary font-medium hover:underline">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Order Header */}
              <div className="bg-muted/50 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Order Number</p>
                  {/* UPDATED: Wrapped in a Link to the Order Details page */}
                  <Link to={`/orders/${order.id}`} className="font-bold text-foreground hover:underline">
                    {order.orderNumber}
                  </Link>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium text-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-bold text-primary text-lg">₹{parseFloat(order.total).toFixed(2)}</p>
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Order Items List */}
              <div className="p-6 divide-y divide-border">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <img 
                      src={item.image || 'https://via.placeholder.com/80'} 
                      alt={item.name} 
                      className="w-16 h-16 object-cover rounded-lg bg-muted"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-foreground">₹{parseFloat(item.price).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}