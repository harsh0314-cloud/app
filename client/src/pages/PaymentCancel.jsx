import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function PaymentCancel() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 text-red-600 rounded-full mb-6">
        <XCircle size={40} />
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-4">Payment Cancelled</h1>
      <p className="text-muted-foreground mb-8">
        Your order was not placed because the payment was cancelled. You can try again whenever you're ready.
      </p>
      <Link to="/cart" className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90">
        Return to Cart
      </Link>
    </div>
  );
}