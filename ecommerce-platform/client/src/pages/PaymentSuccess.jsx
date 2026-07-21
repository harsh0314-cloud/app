import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function PaymentSuccess() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 text-green-600 rounded-full mb-6">
        <CheckCircle size={40} />
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-4">Payment Successful!</h1>
      <p className="text-muted-foreground mb-8">
        Thank you for your purchase! Your order is being processed and will be shipped soon.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link to="/orders" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90">
          View My Orders
        </Link>
        <Link to="/products" className="px-6 py-3 border border-border rounded-xl font-medium text-foreground hover:bg-muted">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}