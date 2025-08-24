import React, { useState, useEffect } from 'react';
import { Order, orderService } from '../../services/api';

interface OrdersDisplayProps {
  onClose: () => void;
}

const OrdersDisplay: React.FC<OrdersDisplayProps> = ({ onClose }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'delivered' | 'cancelled'>('all');

  useEffect(() => {
    loadOrders();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = filter === 'all' ? {} : { status: filter };
      const response = await orderService.getOrders(params);
      if (response.success && response.orders) {
        setOrders(response.orders);
      } else {
        setError('Failed to load orders');
      }
    } catch (err) {
      setError('Error loading orders');
      console.error('Orders loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;

    try {
      const response = await orderService.cancelOrder(orderId, 'Cancelled by user');
      if (response.success) {
        alert('Order cancelled successfully');
        loadOrders();
      } else {
        alert('Failed to cancel order: ' + response.message);
      }
    } catch (err) {
      console.error('Cancel order error:', err);
      alert('Error cancelling order');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f39c12';
      case 'confirmed': return '#3498db';
      case 'preparing': return '#9b59b6';
      case 'ready': return '#27ae60';
      case 'delivered': return '#2ecc71';
      case 'cancelled': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canCancelOrder = (order: Order) => {
    return ['pending', 'confirmed'].includes(order.status);
  };

  if (loading) {
    return (
      <div className="orders-overlay">
        <div className="orders-modal">
          <div className="loading-center">
            <div className="loading large"></div>
            <p>Loading your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-overlay">
        <div className="orders-modal">
          <div className="error-center">
            <p>{error}</p>
            <button onClick={onClose} className="btn btn-primary">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-overlay">
      <div className="orders-modal">
        <div className="orders-header">
          <h2>My Orders</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="orders-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Orders
          </button>
          <button 
            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button 
            className={`filter-btn ${filter === 'confirmed' ? 'active' : ''}`}
            onClick={() => setFilter('confirmed')}
          >
            Confirmed
          </button>
          <button 
            className={`filter-btn ${filter === 'delivered' ? 'active' : ''}`}
            onClick={() => setFilter('delivered')}
          >
            Delivered
          </button>
          <button 
            className={`filter-btn ${filter === 'cancelled' ? 'active' : ''}`}
            onClick={() => setFilter('cancelled')}
          >
            Cancelled
          </button>
        </div>
        
        <div className="orders-content">
          {orders.length === 0 ? (
            <div className="no-orders">
              <p>No orders found</p>
              <p className="text-muted">Place your first order from today's menu!</p>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map(order => (
                <div key={order.orderId} className="order-card">
                  <div className="order-header">
                    <div className="order-id">
                      <h4>Order #{order.orderId}</h4>
                      <span className="order-date">{formatDate(order.createdAt)}</span>
                    </div>
                    <div className="order-status">
                      <span 
                        className="status-badge" 
                        style={{ backgroundColor: getStatusColor(order.status) }}
                      >
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="order-details">
                    <div className="order-info">
                      <p><strong>Meal Type:</strong> {order.mealType}</p>
                      <p><strong>Delivery Date:</strong> {formatDate(order.deliveryDate)}</p>
                      <p><strong>Order For:</strong> {order.orderFor}</p>
                    </div>
                    
                    <div className="order-items">
                      <h5>Items:</h5>
                      {order.items.map((item, index) => (
                        <div key={index} className="order-item">
                          <span>{item.menuItemName} × {item.quantity}</span>
                          <span>Rs. {item.totalPrice.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {order.specialInstructions && (
                      <div className="special-instructions">
                        <p><strong>Special Instructions:</strong> {order.specialInstructions}</p>
                      </div>
                    )}
                  </div>

                  <div className="order-footer">
                    <div className="order-total">
                      <strong>Total: Rs. {order.totalAmount.toFixed(2)}</strong>
                    </div>
                    <div className="order-actions">
                      {canCancelOrder(order) && (
                        <button 
                          onClick={() => handleCancelOrder(order.orderId)}
                          className="btn btn-outline btn-sm"
                        >
                          Cancel Order
                        </button>
                      )}
                      <span className={`payment-status ${order.paymentStatus}`}>
                        Payment: {order.paymentStatus}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrdersDisplay;