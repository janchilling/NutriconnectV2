import React, { useState, useEffect } from 'react';
import { MenuItem, menuService, orderService, CreateOrderRequest } from '../../services/api';

interface MenuDisplayProps {
  onClose: () => void;
}

const MenuDisplay: React.FC<MenuDisplayProps> = ({ onClose }) => {
  const [menu, setMenu] = useState<{ [key: string]: MenuItem[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [ordering, setOrdering] = useState(false);
  const [paymentOption, setPaymentOption] = useState<'now' | 'later' | null>(null);

  useEffect(() => {
    loadTodaysMenu();
  }, []);

  const loadTodaysMenu = async () => {
    try {
      setLoading(true);
      const response = await menuService.getTodaysMenu();
      if (response.success && response.menu) {
        setMenu(response.menu);
      } else {
        setError('Failed to load menu');
      }
    } catch (err) {
      setError('Error loading menu');
      console.error('Menu loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (itemId: string) => {
    setCart(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId] -= 1;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const getCartTotal = () => {
    let total = 0;
    Object.entries(cart).forEach(([itemId, quantity]) => {
      const item = findItemById(itemId);
      if (item) {
        total += item.price * quantity;
      }
    });
    return total;
  };

  const findItemById = (itemId: string): MenuItem | null => {
    for (const categoryItems of Object.values(menu)) {
      const item = categoryItems.find(item => item.id === itemId);
      if (item) return item;
    }
    return null;
  };

  const handlePlaceOrder = async (paymentType: 'now' | 'later') => {
    if (Object.keys(cart).length === 0) return;

    try {
      setOrdering(true);
      const items = Object.entries(cart).map(([menuItemId, quantity]) => ({
        menuItemId,
        quantity
      }));

      const orderData: CreateOrderRequest = {
        orderFor: 'self',
        items,
        deliveryDate: new Date().toISOString().split('T')[0],
        mealType: 'lunch',
        specialInstructions: `Payment: ${paymentType === 'now' ? 'Pay Now' : 'Pay Later'}`
      };

      const response = await orderService.createOrder(orderData);
      if (response.success) {
        if (paymentType === 'now') {
          // Redirect to payment or handle payment flow
          alert(`Order placed successfully! Proceeding to payment for Rs. ${getCartTotal().toFixed(2)}`);
          // Here you would typically redirect to payment service or open payment modal
        } else {
          alert('Order placed successfully! Payment will be processed later.');
        }
        setCart({});
        setPaymentOption(null);
        onClose();
      } else {
        alert('Failed to place order: ' + response.message);
      }
    } catch (err) {
      console.error('Order error:', err);
      alert('Error placing order');
    } finally {
      setOrdering(false);
    }
  };

  const getDietaryBadges = (item: MenuItem) => {
    const badges = [];
    if (item.isVegetarian) badges.push('🌱 Veg');
    if (item.isVegan) badges.push('🌿 Vegan');
    if (item.isGlutenFree) badges.push('🌾 Gluten-Free');
    return badges;
  };

  if (loading) {
    return (
      <div className="menu-overlay">
        <div className="menu-modal">
          <div className="loading-center">
            <div className="loading large"></div>
            <p>Loading today's menu...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="menu-overlay">
        <div className="menu-modal">
          <div className="error-center">
            <p>{error}</p>
            <button onClick={onClose} className="btn btn-primary">Close</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-overlay">
      <div className="menu-modal">
        <div className="menu-header">
          <h2>Today's Menu</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>
        
        <div className="menu-content">
          {Object.entries(menu).map(([category, items]) => (
            <div key={category} className="menu-category">
              <h3 className="category-title">
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </h3>
              <div className="menu-items">
                {items.map(item => (
                  <div key={item.id} className="menu-item">
                    <div className="item-info">
                      <h4>{item.name}</h4>
                      <p className="item-description">{item.description}</p>
                      <div className="item-details">
                        <span className="price">Rs. {item.price.toFixed(2)}</span>
                        <span className="calories">{item.nutritionInfo.calories} cal</span>
                      </div>
                      <div className="dietary-badges">
                        {getDietaryBadges(item).map((badge, index) => (
                          <span key={index} className="badge">{badge}</span>
                        ))}
                      </div>
                    </div>
                    <div className="item-actions">
                      <div className="quantity-controls">
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="btn btn-sm"
                          disabled={!cart[item.id]}
                        >
                          -
                        </button>
                        <span className="quantity">{cart[item.id] || 0}</span>
                        <button 
                          onClick={() => addToCart(item.id)}
                          className="btn btn-sm btn-primary"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {Object.keys(cart).length > 0 && (
          <div className="cart-summary" style={{
            position: 'sticky',
            bottom: 0,
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '16px',
            margin: '16px 0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            maxHeight: '300px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div className="cart-items" style={{
              maxHeight: '150px',
              overflowY: 'auto',
              marginBottom: '12px',
              flexGrow: 1
            }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>Order Summary</h4>
              {Object.entries(cart).map(([itemId, quantity]) => {
                const item = findItemById(itemId);
                return item ? (
                  <div key={itemId} className="cart-item" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #f0f0f0'
                  }}>
                    <span style={{ fontSize: '14px', color: '#555' }}>{item.name} × {quantity}</span>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>Rs. {(item.price * quantity).toFixed(2)}</span>
                  </div>
                ) : null;
              })}
            </div>
            <div className="cart-total" style={{
              padding: '12px 0',
              borderTop: '2px solid #A0C878',
              marginBottom: '12px'
            }}>
              <strong style={{ fontSize: '16px', color: '#333' }}>Total: Rs. {getCartTotal().toFixed(2)}</strong>
            </div>
            
            {!paymentOption ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h5 style={{ margin: '0 0 8px 0', color: '#333', fontSize: '14px' }}>Choose Payment Option:</h5>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setPaymentOption('now')}
                    className="btn btn-primary"
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: '#A0C878',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    💳 Pay Now
                  </button>
                  <button 
                    onClick={() => setPaymentOption('later')}
                    className="btn btn-secondary"
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    ⏰ Pay Later
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ 
                  padding: '8px 12px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: '#333'
                }}>
                  Selected: {paymentOption === 'now' ? '💳 Pay Now' : '⏰ Pay Later'}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handlePlaceOrder(paymentOption)}
                    className="btn btn-primary"
                    disabled={ordering}
                    style={{
                      flex: 1,
                      padding: '12px',
                      backgroundColor: ordering ? '#ccc' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: ordering ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {ordering ? 'Placing Order...' : 'Confirm Order'}
                  </button>
                  <button 
                    onClick={() => setPaymentOption(null)}
                    className="btn btn-secondary"
                    disabled={ordering}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: ordering ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuDisplay;